import type { ContingencyRow } from "../_shared/google-sheets.ts";
import { isAuthorizedAdmin } from "../_shared/admin-auth.ts";

export interface AdminContingencyRecord {
  request_id: string;
  created_at: string;
  name: string;
  email: string;
  attendance: boolean | null;
  companions: number | null;
  status: "pending";
  error_type: string;
  synced_at: string;
}

export interface ListHandlerOptions {
  allowedOrigins: string[];
  adminUserIds: ReadonlySet<string>;
  authenticate(request: Request): Promise<string | null>;
  listRows(): Promise<ContingencyRow[]>;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers":
        "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "600",
      "Vary": "Origin",
    },
  });
}

function errorResponse(
  code: string,
  status: number,
  origin: string,
): Response {
  const messages: Record<string, string> = {
    INVALID_ORIGIN: "Origem não autorizada.",
    METHOD_NOT_ALLOWED: "Método não permitido.",
    UNAUTHORIZED: "Autenticação necessária ou inválida.",
    ADMIN_ACCESS_DENIED: "Usuário sem autorização administrativa.",
    SHEETS_READ_FAILED: "Não foi possível carregar a fila de contingência.",
    INTERNAL_ERROR: "Não foi possível carregar a fila de contingência.",
  };

  return jsonResponse(
    {
      success: false,
      error: code,
      message: messages[code] ?? messages.INTERNAL_ERROR,
    },
    status,
    origin,
  );
}

function toAttendance(value: unknown): boolean | null {
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

function toCompanions(value: unknown): number | null {
  const companions = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== ""
    ? Number(value)
    : Number.NaN;

  return Number.isInteger(companions) && companions >= 0 ? companions : null;
}

function toIsoTimestamp(value: string): string {
  if (!/^\d{5}(?:\.\d+)?$/.test(value)) {
    return value;
  }

  const serial = Number(value);
  if (serial < 20_000) {
    return value;
  }

  const timestamp = new Date(
    Date.UTC(1899, 11, 30) + serial * 24 * 60 * 60 * 1000,
  );

  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toISOString();
}

function toAdminRecord(row: ContingencyRow): AdminContingencyRecord {
  return {
    request_id: row.requestId,
    created_at: toIsoTimestamp(row.createdAt),
    name: row.name,
    email: row.email,
    attendance: toAttendance(row.attendance),
    companions: toCompanions(row.companions),
    status: "pending",
    error_type: row.errorType,
    synced_at: row.syncedAt,
  };
}

export function createListHandler(
  options: ListHandlerOptions,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin");

    if (!origin || !options.allowedOrigins.includes(origin)) {
      return Response.json({
        success: false,
        error: "INVALID_ORIGIN",
        message: "Origem não autorizada.",
      }, { status: 403 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Headers":
            "authorization, apikey, content-type, x-client-info",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Max-Age": "600",
          "Vary": "Origin",
        },
      });
    }

    if (request.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", 405, origin);
    }

    let userId: string | null;
    try {
      userId = await options.authenticate(request);
    } catch {
      userId = null;
    }

    if (!userId) {
      return errorResponse("UNAUTHORIZED", 401, origin);
    }

    if (!isAuthorizedAdmin(userId, options.adminUserIds)) {
      return errorResponse("ADMIN_ACCESS_DENIED", 403, origin);
    }

    try {
      const rows = await options.listRows();
      const records = rows
        .filter((row) => row.status.trim().toLowerCase() === "pending")
        .map(toAdminRecord);

      return jsonResponse({ success: true, records }, 200, origin);
    } catch {
      console.error("Contingency listing failed", {
        code: "SHEETS_READ_FAILED",
      });
      return errorResponse("SHEETS_READ_FAILED", 502, origin);
    }
  };
}
