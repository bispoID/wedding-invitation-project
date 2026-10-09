import { type GuestData, validateGuest } from "../_shared/guest-validation.ts";
import type { ContingencyRsvp } from "./google-sheets.ts";
import type { AdminAlert } from "./notify-admin.ts";
export interface RsvpOptions {
  corsHeaders: Record<string, string>;
  consumeRateLimit(
    request: Request,
  ): Promise<{ data: { allowed: boolean } | null; error: unknown }>;
  insertGuest(guest: GuestData): Promise<{ error: { code?: string } | null }>;
  saveToGoogleSheets(record: ContingencyRsvp): Promise<void>;
  notifyAdmin(alert: AdminAlert): void;
}
function safeFailureCode(code: unknown): string {
  return typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)
    ? code
    : "DATABASE_ERROR";
}
export function createRsvpHandler(options: RsvpOptions) {
  const corsHeaders = options.corsHeaders;
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return Response.json(
        {
          success: false,
          error: "METHOD_NOT_ALLOWED",
        },
        {
          status: 405,
          headers: corsHeaders,
        },
      );
    }

    // Count every POST attempt, including malformed payloads, before parsing it.
    try {
      const { data: rateLimit, error: rateLimitError } = await options
        .consumeRateLimit(req);

      if (rateLimitError || !rateLimit) {
        console.error("RSVP rate limit failure", {
          code: "RATE_LIMIT_UNAVAILABLE",
        });

        return Response.json(
          {
            success: false,
            error: "INTERNAL_ERROR",
          },
          {
            status: 500,
            headers: corsHeaders,
          },
        );
      }

      if (!rateLimit.allowed) {
        return Response.json(
          {
            success: false,
            error: "RATE_LIMIT_EXCEEDED",
          },
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Retry-After": "600",
            },
          },
        );
      }
    } catch (error) {
      console.error("RSVP rate limit failure", {
        code: "RATE_LIMIT_UNAVAILABLE",
      });

      return Response.json(
        {
          success: false,
          error: "INTERNAL_ERROR",
        },
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    let body;

    try {
      body = await req.json();
    } catch {
      return Response.json(
        {
          success: false,
          error: "INVALID_JSON",
        },
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    const parsed = validateGuest(body);
    if ("error" in parsed) {
      return Response.json({ success: false, error: parsed.error }, {
        status: 400,
        headers: corsHeaders,
      });
    }
    const { name, email, attendance, companions } = parsed.guest;

    const requestId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    let databaseError: { code?: string; message?: string } | null = null;

    try {
      const { error } = await options.insertGuest(parsed.guest);

      databaseError = error;
    } catch (error) {
      databaseError = { code: "DATABASE_ERROR" };
    }

    if (databaseError) {
      // Do not log driver details: they may include submitted personal data.

      if (databaseError.code === "23505") {
        // Duplicate RSVPs are a business conflict, not an infrastructure failure.
        return Response.json(
          {
            success: false,
            error: "EMAIL_ALREADY_REGISTERED",
          },
          {
            status: 409,
            headers: corsHeaders,
          },
        );
      }

      // Only persistence failures reach the temporary contingency queue.
      try {
        await options.saveToGoogleSheets({
          request_id: requestId,
          created_at: createdAt,
          name,
          email,
          attendance,
          companions,
          status: "pending",
          error_type: safeFailureCode(databaseError.code),
          synced_at: new Date().toISOString(),
        });

        options.notifyAdmin({
          request_id: requestId,
          occurred_at: new Date().toISOString(),
          failure_type: safeFailureCode(databaseError.code),
          contingency_status: "pending",
        });

        // 202 means the RSVP is preserved, but still needs manual synchronization.
        return Response.json(
          {
            success: false,
            contingency: true,
            error: "RSVP_SAVED_TO_CONTINGENCY",
          },
          {
            status: 202,
            headers: corsHeaders,
          },
        );
      } catch (error) {
        console.error("RSVP contingency failure", {
          request_id: requestId,
          code: "SHEETS_UNAVAILABLE",
        });

        // Neither store accepted the RSVP, so do not report it as received.
        options.notifyAdmin({
          request_id: requestId,
          occurred_at: new Date().toISOString(),
          failure_type: "DATABASE_AND_GOOGLE_SHEETS_FAILURE",
          contingency_status: "failed",
        });

        return Response.json(
          {
            success: false,
            error: "INTERNAL_ERROR",
          },
          {
            status: 500,
            headers: corsHeaders,
          },
        );
      }
    }

    return Response.json(
      {
        success: true,
      },
      {
        status: 201,
        headers: corsHeaders,
      },
    );
  };
}
