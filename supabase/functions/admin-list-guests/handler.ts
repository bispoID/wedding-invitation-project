import { isAuthorizedAdmin } from "../_shared/admin-auth.ts";

export interface AdminGuestRecord {
  id: string;
  name: string;
  email: string;
  attendance: boolean;
  companions: number;
  created_at: string;
}

export interface GuestListHandlerOptions {
  allowedOrigins: string[];
  adminUserIds: ReadonlySet<string>;
  authenticate(request: Request): Promise<string | null>;
  listGuests(): Promise<AdminGuestRecord[]>;
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
    METHOD_NOT_ALLOWED: "Método não permitido.",
    UNAUTHORIZED: "Autenticação necessária ou inválida.",
    ADMIN_ACCESS_DENIED: "Usuário sem autorização administrativa.",
    GUEST_LIST_FAILED: "Não foi possível carregar os convidados.",
  };

  return response(
    {
      success: false,
      error: code,
      message: messages[code] ?? messages.GUEST_LIST_FAILED,
    },
    status,
    origin,
  );
}

export function createGuestListHandler(
  options: GuestListHandlerOptions,
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
      const records = (await options.listGuests()).map((guest) => ({
        id: guest.id,
        name: guest.name,
        email: guest.email,
        attendance: guest.attendance,
        companions: guest.companions,
        created_at: guest.created_at,
      }));
      return response({ success: true, records }, 200, origin);
    } catch {
      console.error("Guest listing failed", { code: "GUEST_LIST_FAILED" });
      return errorResponse("GUEST_LIST_FAILED", 502, origin);
    }
  };
}
