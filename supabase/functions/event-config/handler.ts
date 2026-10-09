import { eventDto } from "../_shared/event-validation.ts";

export function createEventConfigHandler(
  read: () => Promise<Record<string, unknown> | null>,
) {
  return async (request: Request): Promise<Response> => {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control": "no-store",
    };
    const reply = (body: Record<string, unknown>, status: number) =>
      Response.json(body, { status, headers });
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "GET") {
      return reply({ success: false, error: "METHOD_NOT_ALLOWED" }, 405);
    }
    try {
      const row = await read();
      if (!row) {
        return reply({ success: false, error: "EVENT_CONFIG_NOT_FOUND" }, 404);
      }
      return reply({ success: true, config: eventDto(row) }, 200);
    } catch {
      console.error("Event config read failed", {
        code: "EVENT_CONFIG_UNAVAILABLE",
      });
      return reply({ success: false, error: "EVENT_CONFIG_UNAVAILABLE" }, 503);
    }
  };
}
