import { createRecoveryHandler } from "./handler.ts";
import {
  type ContingencyRecord,
  type GuestRecord,
  recoverContingencyRecord,
  type RecoveryDependencies,
  RecoveryError,
} from "./recovery.ts";

const REQUEST_ID = "f8c06c53-1c6b-4c6c-9acd-cdbb1451541a";
const ADMIN_ID = "c2d806a4-3438-4f24-8d1d-62c50a17c531";
const OTHER_USER_ID = "94827da7-58a1-46f3-8a8d-c82d324d5d7c";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

async function assertRecoveryError(
  operation: Promise<unknown>,
  expectedCode: string,
): Promise<RecoveryError> {
  try {
    await operation;
  } catch (error) {
    assert(error instanceof RecoveryError, "Expected a RecoveryError");
    assertEquals(error.code, expectedCode, "Unexpected recovery error");
    return error;
  }

  throw new Error(`Expected recovery error ${expectedCode}`);
}

function pendingRow(
  overrides: Partial<ContingencyRecord> = {},
): ContingencyRecord {
  return {
    rowNumber: 2,
    requestId: REQUEST_ID,
    name: "Convidado de teste",
    email: " TESTE@example.com ",
    attendance: true,
    companions: 2,
    status: "pending",
    ...overrides,
  };
}

function guest(
  overrides: Partial<GuestRecord> = {},
): GuestRecord {
  return {
    name: "Convidado de teste",
    email: "teste@example.com",
    attendance: true,
    companions: 2,
    ...overrides,
  };
}

interface MockState {
  rows: ContingencyRecord[];
  guests: Map<string, GuestRecord>;
  insertCount: number;
  deleteCount: number;
  lastDeletedRow: number | null;
  lockHeld: boolean;
  insertError?: unknown;
  deleteError?: unknown;
  readError?: unknown;
  findError?: unknown;
  acquireError?: unknown;
}

function makeDependencies(
  state: MockState,
): RecoveryDependencies {
  return {
    acquireLock() {
      if (state.acquireError) return Promise.reject(state.acquireError);
      if (state.lockHeld) return Promise.resolve(false);
      state.lockHeld = true;
      return Promise.resolve(true);
    },
    releaseLock() {
      state.lockHeld = false;
      return Promise.resolve(true);
    },
    readRows() {
      if (state.readError) return Promise.reject(state.readError);
      return Promise.resolve(state.rows.map((row) => ({ ...row })));
    },
    findGuestByEmail(email) {
      if (state.findError) return Promise.reject(state.findError);
      return Promise.resolve(state.guests.get(email) ?? null);
    },
    insertGuest(value) {
      state.insertCount += 1;
      if (state.insertError) return Promise.reject(state.insertError);
      state.guests.set(value.email, { ...value });
      return Promise.resolve();
    },
    deleteRow(rowNumber) {
      state.deleteCount += 1;
      state.lastDeletedRow = rowNumber;
      if (state.deleteError) return Promise.reject(state.deleteError);
      state.rows = state.rows
        .filter((row) => row.rowNumber !== rowNumber)
        .map((row) => ({
          ...row,
          rowNumber: row.rowNumber > rowNumber
            ? row.rowNumber - 1
            : row.rowNumber,
        }));
      return Promise.resolve();
    },
  };
}

function makeState(
  rows: ContingencyRecord[] = [pendingRow()],
  guests: GuestRecord[] = [],
): MockState {
  return {
    rows: rows.map((row) => ({ ...row })),
    guests: new Map(guests.map((record) => [record.email, { ...record }])),
    insertCount: 0,
    deleteCount: 0,
    lastDeletedRow: null,
    lockHeld: false,
  };
}

Deno.test("new email is inserted, confirmed, then contingency row removed", async () => {
  const state = makeState();
  const result = await recoverContingencyRecord(
    REQUEST_ID,
    makeDependencies(state),
  );

  assertEquals(result.result, "recovered", "Result should be recovered");
  assertEquals(state.insertCount, 1, "Should insert exactly once");
  assertEquals(state.deleteCount, 1, "Should delete exactly once");
  assertEquals(state.rows.length, 0, "Contingency row should be removed");
  assert(state.guests.has("teste@example.com"), "Email should be normalized");
});

Deno.test("same existing data skips insert and removes contingency row", async () => {
  const state = makeState([pendingRow()], [guest()]);
  const result = await recoverContingencyRecord(
    REQUEST_ID,
    makeDependencies(state),
  );

  assertEquals(
    result.result,
    "already_persisted",
    "Existing guest should be reconciled",
  );
  assertEquals(state.insertCount, 0, "Should not insert existing guest");
  assertEquals(state.deleteCount, 1, "Should remove reconciled row");
});

Deno.test("different existing data returns conflict and preserves row", async () => {
  const state = makeState(
    [pendingRow()],
    [guest({ companions: 1 })],
  );

  await assertRecoveryError(
    recoverContingencyRecord(REQUEST_ID, makeDependencies(state)),
    "DATA_CONFLICT",
  );

  assertEquals(state.insertCount, 0, "Conflict must not insert");
  assertEquals(state.deleteCount, 0, "Conflict must preserve the row");
  assertEquals(state.rows.length, 1, "Contingency row should remain");
});

Deno.test("unknown request id makes no changes", async () => {
  const state = makeState([]);

  await assertRecoveryError(
    recoverContingencyRecord(REQUEST_ID, makeDependencies(state)),
    "REQUEST_ID_NOT_FOUND",
  );

  assertEquals(state.insertCount, 0, "Unknown id must not insert");
  assertEquals(state.deleteCount, 0, "Unknown id must not delete");
});

Deno.test("duplicate request id makes no changes", async () => {
  const state = makeState([
    pendingRow(),
    pendingRow({ rowNumber: 3 }),
  ]);

  await assertRecoveryError(
    recoverContingencyRecord(REQUEST_ID, makeDependencies(state)),
    "REQUEST_ID_DUPLICATED",
  );

  assertEquals(state.insertCount, 0, "Duplicate id must not insert");
  assertEquals(state.deleteCount, 0, "Duplicate id must not delete");
});

Deno.test("insert failure preserves contingency row", async () => {
  const state = makeState();
  state.insertError = new Error("simulated database failure");

  await assertRecoveryError(
    recoverContingencyRecord(REQUEST_ID, makeDependencies(state)),
    "SUPABASE_ERROR",
  );

  assertEquals(state.deleteCount, 0, "Failed insert must not delete");
  assertEquals(state.rows.length, 1, "Contingency row should remain");
});

Deno.test("unique email race is reconciled by re-querying the guest", async () => {
  const state = makeState();
  const dependencies = makeDependencies(state);

  dependencies.insertGuest = (value) => {
    state.insertCount += 1;
    state.guests.set(value.email, { ...value });
    return Promise.reject({ code: "23505" });
  };

  const result = await recoverContingencyRecord(REQUEST_ID, dependencies);

  assertEquals(
    result.result,
    "recovered",
    "Matching concurrent insert should be reconciled",
  );
  assertEquals(state.deleteCount, 1, "Matching row should be removed");
  assertEquals(state.rows.length, 0, "Contingency row should be removed");
});

Deno.test("delete failure reports persisted record and pending cleanup", async () => {
  const state = makeState();
  state.deleteError = new Error("simulated Sheets failure");

  const error = await assertRecoveryError(
    recoverContingencyRecord(REQUEST_ID, makeDependencies(state)),
    "CLEANUP_PENDING",
  );

  assertEquals(error.persisted, true, "Persistence should be reported");
  assertEquals(state.guests.size, 1, "Guest should remain in Supabase");
  assertEquals(state.rows.length, 1, "Contingency row should remain");
});

Deno.test("global lock rejects a concurrent recovery", async () => {
  const state = makeState();
  let unblockFirstRead!: () => void;
  const firstReadPaused = new Promise<void>((resolve) => {
    unblockFirstRead = resolve;
  });
  let signalFirstRead!: () => void;
  const firstReadStarted = new Promise<void>((resolve) => {
    signalFirstRead = resolve;
  });
  const dependencies = makeDependencies(state);
  const originalReadRows = dependencies.readRows;
  let pauseFirstRead = true;

  dependencies.readRows = async () => {
    if (pauseFirstRead) {
      pauseFirstRead = false;
      signalFirstRead();
      await firstReadPaused;
    }
    return await originalReadRows();
  };

  const firstRecovery = recoverContingencyRecord(REQUEST_ID, dependencies);
  await firstReadStarted;

  await assertRecoveryError(
    recoverContingencyRecord(REQUEST_ID, dependencies),
    "LOCK_BUSY",
  );

  unblockFirstRead();
  await firstRecovery;
  assertEquals(state.insertCount, 1, "Only one recovery should insert");
});

Deno.test("retry after completed recovery has no duplicate side effects", async () => {
  const state = makeState();
  const dependencies = makeDependencies(state);
  await recoverContingencyRecord(REQUEST_ID, dependencies);

  await assertRecoveryError(
    recoverContingencyRecord(REQUEST_ID, dependencies),
    "REQUEST_ID_NOT_FOUND",
  );

  assertEquals(state.insertCount, 1, "Retry must not insert again");
  assertEquals(state.deleteCount, 1, "Retry must not delete another row");
});

Deno.test("delete uses the row number found by the fresh sheet read", async () => {
  const state = makeState();
  const dependencies = makeDependencies(state);
  let readCount = 0;

  dependencies.readRows = () => {
    readCount += 1;

    if (readCount === 1) {
      return Promise.resolve([pendingRow({ rowNumber: 2 })]);
    }

    if (readCount === 2) {
      return Promise.resolve([pendingRow({ rowNumber: 7 })]);
    }

    return Promise.resolve([]);
  };
  dependencies.deleteRow = (rowNumber) => {
    state.deleteCount += 1;
    state.lastDeletedRow = rowNumber;
    return Promise.resolve();
  };

  await recoverContingencyRecord(REQUEST_ID, dependencies);

  assertEquals(state.lastDeletedRow, 7, "Fresh row number should be used");
  assertEquals(readCount, 3, "Read before and after deletion");
});

Deno.test("non-admin authenticated user is denied before dependencies are created", async () => {
  let dependenciesCreated = false;
  const handler = createRecoveryHandler({
    allowedOrigins: ["http://localhost:5500"],
    adminUserId: ADMIN_ID,
    authenticate() {
      return Promise.resolve(OTHER_USER_ID);
    },
    createDependencies() {
      dependenciesCreated = true;
      return Promise.reject(
        new Error("Must not initialize privileged clients"),
      );
    },
  });
  const response = await handler(
    new Request(
      "http://edge.test/admin-recover-contingency",
      {
        method: "POST",
        headers: {
          Origin: "http://localhost:5500",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ request_id: REQUEST_ID }),
      },
    ),
  );
  const body = await response.json();

  assertEquals(response.status, 403, "Other user should be denied");
  assertEquals(body.error, "ADMIN_ACCESS_DENIED", "Expected admin denial");
  assertEquals(
    dependenciesCreated,
    false,
    "Privileged dependencies must not be created",
  );
});

Deno.test("non-pending record is preserved", async () => {
  const state = makeState([pendingRow({ status: "synced" })]);

  await assertRecoveryError(
    recoverContingencyRecord(REQUEST_ID, makeDependencies(state)),
    "INVALID_STATUS",
  );

  assertEquals(state.deleteCount, 0, "Non-pending row must not be removed");
});
