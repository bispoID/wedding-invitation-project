import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

async function hashIp(ip: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const data = new TextEncoder().encode(`${secret}:${ip}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

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

  // Rate limiting
  try {
    const clientIp = getClientIp(req);
    const ipHash = await hashIp(clientIp);

    const { data: rateLimit, error: rateLimitError } = await supabase
      .rpc("consume_rsvp_rate_limit", {
        p_ip_hash: ipHash,
      })
      .single();

    if (rateLimitError || !rateLimit) {
      console.error("Rate limit error:", rateLimitError);

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
    console.error("Rate limit error:", error);

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

  // Name
  if (
    typeof body.name !== "string" ||
    body.name.trim() === ""
  ) {
    return Response.json(
      {
        success: false,
        error: "INVALID_NAME",
      },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }

  // Email
  if (
    typeof body.email !== "string" ||
    body.email.trim() === ""
  ) {
    return Response.json(
      {
        success: false,
        error: "INVALID_EMAIL",
      },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }

  const email = body.email.trim().toLowerCase();

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return Response.json(
      {
        success: false,
        error: "INVALID_EMAIL",
      },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }

  // Attendance
  if (typeof body.attendance !== "boolean") {
    return Response.json(
      {
        success: false,
        error: "INVALID_ATTENDANCE",
      },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }

  // Companions
  if (
    !Number.isInteger(body.companions) ||
    body.companions < 0 ||
    body.companions > 15
  ) {
    return Response.json(
      {
        success: false,
        error: "INVALID_COMPANIONS",
      },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }

  // Business rule:
  // If the guest will not attend, companions must be 0.
  const companions = body.attendance
    ? body.companions
    : 0;

  const name = body.name.trim();

  const { error } = await supabase
    .from("guests")
    .insert({
      name,
      email,
      attendance: body.attendance,
      companions,
    });

  if (error) {
    console.error("Database error:", error);

    if (error.code === "23505") {
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

  return Response.json(
    {
      success: true,
    },
    {
      status: 201,
      headers: corsHeaders,
    },
  );
});