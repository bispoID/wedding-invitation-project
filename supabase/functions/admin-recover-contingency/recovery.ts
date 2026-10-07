export interface ContingencyRecord {
  rowNumber: number;
  requestId: string;
  name: string;
  email: string;
  attendance: unknown;
  companions: unknown;
  status: string;
}

export interface GuestRecord {
  name: string;
  email: string;
  attendance: boolean;
  companions: number;
}

export interface RecoveryDependencies {
  acquireLock(ownerId: string): Promise<boolean>;
  releaseLock(ownerId: string): Promise<boolean>;
  readRows(): Promise<ContingencyRecord[]>;
  findGuestByEmail(email: string): Promise<GuestRecord | null>;
  insertGuest(guest: GuestRecord): Promise<void>;
  deleteRow(rowNumber: number): Promise<void>;
}

export type RecoveryErrorCode =
  | "LOCK_BUSY"
  | "REQUEST_ID_NOT_FOUND"
  | "REQUEST_ID_DUPLICATED"
  | "INVALID_STATUS"
  | "INVALID_DATA"
  | "DATA_CONFLICT"
  | "SUPABASE_ERROR"
  | "SHEETS_READ_FAILED"
  | "CLEANUP_PENDING";

const ERROR_HTTP_STATUS: Record<RecoveryErrorCode, number> = {
  LOCK_BUSY: 409,
  REQUEST_ID_NOT_FOUND: 404,
  REQUEST_ID_DUPLICATED: 409,
  INVALID_STATUS: 409,
  INVALID_DATA: 422,
  DATA_CONFLICT: 409,
  SUPABASE_ERROR: 502,
  SHEETS_READ_FAILED: 502,
  CLEANUP_PENDING: 503,
};

export class RecoveryError extends Error {
  readonly httpStatus: number;

  constructor(
    readonly code: RecoveryErrorCode,
    readonly persisted = false,
  ) {
    super(code);
    this.name = "RecoveryError";
    this.httpStatus = ERROR_HTTP_STATUS[code];
  }
}

export type RecoveryResult = {
  success: true;
  result: "recovered" | "already_persisted";
  request_id: string;
  contingency_removed: true;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return null;
}

function readCompanions(value: unknown): number | null {
  const companions = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== ""
    ? Number(value)
    : Number.NaN;

  return Number.isInteger(companions) && companions >= 0 && companions <= 15
    ? companions
    : null;
}

function parseContingencyRecord(row: ContingencyRecord): GuestRecord {
  const name = row.name.trim();
  const email = normalizeEmail(row.email);
  const attendance = readBoolean(row.attendance);
  const companions = readCompanions(row.companions);

  if (
    !name ||
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    attendance === null ||
    companions === null ||
    (!attendance && companions !== 0)
  ) {
    throw new RecoveryError("INVALID_DATA");
  }

  return { name, email, attendance, companions };
}

function recordsMatch(left: GuestRecord, right: GuestRecord): boolean {
  return left.name === right.name &&
    left.email === right.email &&
    left.attendance === right.attendance &&
    left.companions === right.companions;
}

function findExactlyOneRow(
  rows: ContingencyRecord[],
  requestId: string,
): ContingencyRecord {
  const matches = rows.filter((row) => row.requestId === requestId);

  if (matches.length === 0) {
    throw new RecoveryError("REQUEST_ID_NOT_FOUND");
  }

  if (matches.length !== 1) {
    throw new RecoveryError("REQUEST_ID_DUPLICATED");
  }

  return matches[0];
}

function assertPendingRow(row: ContingencyRecord): void {
  if (row.status.trim().toLowerCase() !== "pending") {
    throw new RecoveryError("INVALID_STATUS");
  }
}

function assertSameContingencyData(
  original: GuestRecord,
  current: ContingencyRecord,
): void {
  const currentData = parseContingencyRecord(current);

  if (!recordsMatch(original, currentData)) {
    throw new RecoveryError("DATA_CONFLICT", true);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505";
}

export async function recoverContingencyRecord(
  requestId: string,
  dependencies: RecoveryDependencies,
): Promise<RecoveryResult> {
  const ownerId = crypto.randomUUID();
  let lockAcquired: boolean;

  try {
    lockAcquired = await dependencies.acquireLock(ownerId);
  } catch {
    throw new RecoveryError("SUPABASE_ERROR");
  }

  if (!lockAcquired) {
    throw new RecoveryError("LOCK_BUSY");
  }

  try {
    let initialRows: ContingencyRecord[];

    try {
      initialRows = await dependencies.readRows();
    } catch {
      throw new RecoveryError("SHEETS_READ_FAILED");
    }

    const initialRow = findExactlyOneRow(initialRows, requestId);
    assertPendingRow(initialRow);
    const contingencyData = parseContingencyRecord(initialRow);
    let result: RecoveryResult["result"];
    let persisted = false;

    let existingGuest: GuestRecord | null;
    try {
      existingGuest = await dependencies.findGuestByEmail(
        contingencyData.email,
      );
    } catch {
      throw new RecoveryError("SUPABASE_ERROR");
    }

    if (existingGuest) {
      if (!recordsMatch(existingGuest, contingencyData)) {
        throw new RecoveryError("DATA_CONFLICT");
      }

      result = "already_persisted";
      persisted = true;
    } else {
      try {
        await dependencies.insertGuest(contingencyData);
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw new RecoveryError("SUPABASE_ERROR");
        }
      }

      try {
        existingGuest = await dependencies.findGuestByEmail(
          contingencyData.email,
        );
      } catch {
        throw new RecoveryError("SUPABASE_ERROR");
      }

      if (!existingGuest) {
        throw new RecoveryError("SUPABASE_ERROR");
      }

      if (!recordsMatch(existingGuest, contingencyData)) {
        throw new RecoveryError("DATA_CONFLICT");
      }

      result = "recovered";
      persisted = true;
    }

    let latestRows: ContingencyRecord[];
    try {
      latestRows = await dependencies.readRows();
    } catch {
      throw new RecoveryError("CLEANUP_PENDING", persisted);
    }

    const latestMatches = latestRows.filter((row) =>
      row.requestId === requestId
    );

    if (latestMatches.length === 0) {
      return {
        success: true,
        result,
        request_id: requestId,
        contingency_removed: true,
      };
    }

    if (latestMatches.length !== 1) {
      throw new RecoveryError("CLEANUP_PENDING", persisted);
    }

    const latestRow = latestMatches[0];
    try {
      assertPendingRow(latestRow);
      assertSameContingencyData(contingencyData, latestRow);
    } catch {
      throw new RecoveryError("CLEANUP_PENDING", persisted);
    }

    try {
      await dependencies.deleteRow(latestRow.rowNumber);
    } catch {
      // The delete may have completed even if its response timed out; verify below.
    }

    let remainingRows: ContingencyRecord[];
    try {
      remainingRows = await dependencies.readRows();
    } catch {
      throw new RecoveryError("CLEANUP_PENDING", persisted);
    }

    if (remainingRows.some((row) => row.requestId === requestId)) {
      throw new RecoveryError("CLEANUP_PENDING", persisted);
    }

    return {
      success: true,
      result,
      request_id: requestId,
      contingency_removed: true,
    };
  } finally {
    try {
      const released = await dependencies.releaseLock(ownerId);

      if (!released) {
        console.warn(
          "Contingency recovery lock was not released by its owner.",
        );
      }
    } catch {
      console.warn(
        "Contingency recovery lock release failed; lease will expire.",
      );
    }
  }
}
