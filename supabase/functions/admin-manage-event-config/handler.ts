import { isAuthorizedAdmin } from "../_shared/admin-auth.ts";
import { isRecord } from "../_shared/guest-validation.ts";
import {
  type EventConfig,
  eventDto,
  validateEventConfig,
} from "../_shared/event-validation.ts";

export interface EventAdminOptions {
  allowedOrigins: string[];
  adminUserIds: ReadonlySet<string>;
  authenticate(request: Request): Promise<string | null>;
  createDependencies(): {
    read(): Promise<Record<string, unknown> | null>;
    upsert(config: EventConfig): Promise<Record<string, unknown>>;
  };
}
function adminDto(row: Record<string, unknown>) {
  const config = eventDto(row);
  return {
    ...config,
    ...(typeof row.updated_at === "string" &&
        !Number.isNaN(Date.parse(row.updated_at))
      ? { updated_at: row.updated_at }
      : {}),
  };
}
export function createEventAdminHandler(options: EventAdminOptions) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin");
    const headers: Record<string, string> = {
      "Cache-Control": "no-store",
      "Vary": "Origin",
    };
    if (origin && options.allowedOrigins.includes(origin)) {
      Object.assign(headers, {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers":
          "authorization, apikey, content-type, x-client-info",
        "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      });
    }
    const reply = (body: Record<string, unknown>, status = 200) =>
      Response.json(body, { status, headers });
    const fail = (error: string, status: number) =>
      reply({ success: false, error }, status);
    if (!origin || !options.allowedOrigins.includes(origin)) {
      return fail("INVALID_ORIGIN", 403);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (!["GET", "PUT"].includes(request.method)) {
      return fail("METHOD_NOT_ALLOWED", 405);
    }
    let userId: string | null;
    try {
      userId = await options.authenticate(request);
    } catch {
      userId = null;
    }
    if (!userId) return fail("UNAUTHORIZED", 401);
    if (!isAuthorizedAdmin(userId, options.adminUserIds)) {
      return fail("ADMIN_ACCESS_DENIED", 403);
    }
    let config: EventConfig | undefined;
    if (request.method === "PUT") {
      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        return fail("INVALID_REQUEST", 400);
      }
      if (
        !isRecord(payload) || Object.keys(payload).length !== 1 ||
        !Object.hasOwn(payload, "config")
      ) {
        return fail("INVALID_REQUEST", 400);
      }
      const parsed = validateEventConfig(payload.config);
      if ("error" in parsed) {
        return reply({
          success: false,
          error: parsed.error,
          field: parsed.field,
        }, 422);
      }
      config = parsed.config;
    }
    try {
      const dependencies = options.createDependencies();
      const row = config
        ? await dependencies.upsert(config)
        : await dependencies.read();
      return reply({ success: true, config: row ? adminDto(row) : null });
    } catch {
      console.error("Event configuration administration failed", {
        code: "DATABASE_ERROR",
      });
      return fail("DATABASE_ERROR", 502);
    }
  };
}
