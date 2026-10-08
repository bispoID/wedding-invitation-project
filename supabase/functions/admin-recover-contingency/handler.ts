import { isAuthorizedAdmin } from "../_shared/admin-auth.ts";
import {
  recoverContingencyRecord,
  type RecoveryDependencies,
  RecoveryError,
} from "./recovery.ts";

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface RecoveryHandlerOptions {
  allowedOrigins: string[];
  adminUserIds: ReadonlySet<string>;
  authenticate(request: Request): Promise<string | null>;
  createDependencies(): Promise<RecoveryDependencies>;
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Max-Age": "600",
      "Vary": "Origin",
    },
  });
}

function errorResponse(
  code: string,
  status: number,
  origin: string,
  persisted = false,
): Response {
  const messages: Record<string, string> = {
    INVALID_ORIGIN: "Origem não autorizada.",
    METHOD_NOT_ALLOWED: "Método não permitido.",
    UNAUTHORIZED: "Autenticação necessária ou inválida.",
    ADMIN_ACCESS_DENIED: "Usuário sem autorização administrativa.",
    INVALID_REQUEST: "Solicitação inválida.",
    INVALID_REQUEST_ID: "Identificador da contingência inválido.",
    LOCK_BUSY: "Outra recuperação está em andamento. Tente novamente.",
    REQUEST_ID_NOT_FOUND: "Registro de contingência não encontrado.",
    REQUEST_ID_DUPLICATED:
      "Identificador duplicado na contingência; revisão manual necessária.",
    INVALID_STATUS: "O registro não está pendente de recuperação.",
    INVALID_DATA: "Os dados da contingência são inválidos.",
    DATA_CONFLICT:
      "Já existe um registro com dados diferentes. A linha foi preservada para revisão.",
    SUPABASE_ERROR:
      "Não foi possível confirmar a persistência no banco de dados.",
    SHEETS_READ_FAILED: "Não foi possível ler a fila de contingência.",
    CLEANUP_PENDING:
      "O registro está persistido no banco, mas a linha da contingência continua pendente de limpeza.",
    INTERNAL_ERROR: "Não foi possível concluir a recuperação.",
  };

  return jsonResponse(
    {
      success: false,
      error: code,
      message: messages[code] ?? messages.INTERNAL_ERROR,
      ...(persisted ? { persisted: true, contingency_removed: false } : {}),
    },
    status,
    origin,
  );
}

export function createRecoveryHandler(
  options: RecoveryHandlerOptions,
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
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Max-Age": "600",
          "Vary": "Origin",
        },
      });
    }

    if (request.method !== "POST") {
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

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return errorResponse("INVALID_REQUEST", 400, origin);
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      !("request_id" in payload) ||
      typeof payload.request_id !== "string"
    ) {
      return errorResponse("INVALID_REQUEST", 400, origin);
    }

    const requestId = payload.request_id.trim();

    if (!REQUEST_ID_PATTERN.test(requestId)) {
      return errorResponse("INVALID_REQUEST_ID", 400, origin);
    }

    try {
      const dependencies = await options.createDependencies();
      const result = await recoverContingencyRecord(requestId, dependencies);
      return jsonResponse(result, 200, origin);
    } catch (error) {
      if (error instanceof RecoveryError) {
        console.error("Contingency recovery failed", {
          code: error.code,
          persisted: error.persisted,
        });
        return errorResponse(
          error.code,
          error.httpStatus,
          origin,
          error.persisted,
        );
      }

      console.error("Contingency recovery failed", {
        code: "INTERNAL_ERROR",
      });
      return errorResponse("INTERNAL_ERROR", 500, origin);
    }
  };
}
