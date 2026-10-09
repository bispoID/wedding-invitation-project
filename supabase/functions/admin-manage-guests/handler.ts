import { isAuthorizedAdmin } from "../_shared/admin-auth.ts";
import {
  type GuestData,
  isRecord,
  validateGuest,
} from "../_shared/guest-validation.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GuestUpdate = GuestData;

export interface GuestAdminDependencies {
  createGuest(guest: GuestUpdate): Promise<{ id: string }>;
  updateGuest(
    id: string,
    guest: GuestUpdate,
  ): Promise<{ id: string } | null>;
  deleteGuest(id: string): Promise<{ id: string } | null>;
}

export interface GuestAdminHandlerOptions {
  allowedOrigins: string[];
  adminUserIds: ReadonlySet<string>;
  authenticate(request: Request): Promise<string | null>;
  createDependencies(): GuestAdminDependencies;
}

function response(
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
): Response {
  const messages: Record<string, string> = {
    INVALID_ORIGIN: "Origem não autorizada.",
    METHOD_NOT_ALLOWED: "Método não permitido.",
    UNAUTHORIZED: "Autenticação necessária ou inválida.",
    ADMIN_ACCESS_DENIED: "Usuário sem autorização administrativa.",
    INVALID_REQUEST: "Solicitação inválida.",
    INVALID_ID: "Identificador do convidado inválido.",
    INVALID_NAME: "O nome é obrigatório.",
    INVALID_EMAIL: "Informe um e-mail válido.",
    EMAIL_ALREADY_REGISTERED:
      "Este e-mail já está associado a outro convidado. Os dados não foram alterados.",
    INVALID_ATTENDANCE: "A presença informada é inválida.",
    INVALID_COMPANIONS: "A quantidade de acompanhantes deve ser entre 0 e 15.",
    GUEST_NOT_FOUND: "O convidado não foi encontrado.",
    DATABASE_ERROR: "Não foi possível salvar a alteração.",
  };

  return response(
    {
      success: false,
      error: code,
      message: messages[code] ?? messages.DATABASE_ERROR,
    },
    status,
    origin,
  );
}

export function createGuestAdminHandler(
  options: GuestAdminHandlerOptions,
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

    if (!isRecord(payload)) {
      return errorResponse("INVALID_REQUEST", 400, origin);
    }

    const guestId = payload.id;
    if (
      payload.action !== "create" && payload.action !== "update" &&
      payload.action !== "delete"
    ) {
      return errorResponse("INVALID_REQUEST", 400, origin);
    }

    if (
      payload.action === "create" && (
        Object.keys(payload).some((key) =>
          !["action", "guest"].includes(key)
        ) ||
        !isRecord(payload.guest) ||
        Object.keys(payload.guest).some((key) =>
          !["name", "email", "attendance", "companions"].includes(key)
        )
      )
    ) return errorResponse("INVALID_REQUEST", 400, origin);

    if (
      payload.action !== "create" &&
      (typeof guestId !== "string" || !UUID_PATTERN.test(guestId))
    ) {
      return errorResponse("INVALID_ID", 400, origin);
    }

    const parsedGuest = payload.action !== "delete"
      ? validateGuest(payload.guest)
      : null;

    if (parsedGuest && "error" in parsedGuest) {
      return errorResponse(parsedGuest.error, 422, origin);
    }

    try {
      const dependencies = options.createDependencies();
      if (
        payload.action === "create" && parsedGuest && "guest" in parsedGuest
      ) {
        const created = await dependencies.createGuest(parsedGuest.guest);
        return response(
          { success: true, action: "created", id: created.id },
          201,
          origin,
        );
      }

      if (payload.action === "delete") {
        const deleted = await dependencies.deleteGuest(guestId as string);

        if (!deleted) {
          return errorResponse("GUEST_NOT_FOUND", 404, origin);
        }

        return response(
          { success: true, action: "deleted", id: deleted.id },
          200,
          origin,
        );
      }

      if (!parsedGuest || !("guest" in parsedGuest)) {
        return errorResponse("INVALID_REQUEST", 400, origin);
      }

      const updated = await dependencies.updateGuest(
        guestId as string,
        parsedGuest.guest,
      );

      if (!updated) {
        return errorResponse("GUEST_NOT_FOUND", 404, origin);
      }

      return response(
        { success: true, action: "updated", id: updated.id },
        200,
        origin,
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        return errorResponse("EMAIL_ALREADY_REGISTERED", 409, origin);
      }

      console.error("Guest administration failed", {
        code: "DATABASE_ERROR",
      });
      return errorResponse("DATABASE_ERROR", 502, origin);
    }
  };
}
