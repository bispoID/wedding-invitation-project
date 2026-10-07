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

interface ContingencyRsvp {
  request_id: string;
  created_at: string;
  name: string;
  email: string;
  attendance: boolean;
  companions: number;
  status: "pending";
  error_type: string;
  synced_at: string;
}

interface AdminAlert {
  request_id: string;
  occurred_at: string;
  failure_type: string;
  contingency_status: "pending" | "failed";
  email: string;
  name: string;
  companions: number;
}

function notifyAdmin(alert: AdminAlert): void {
  try {
    console.error("RSVP contingency alert", alert);
  } catch (error) {
    console.warn(
      "Could not write RSVP contingency alert to Supabase Logs",
      error instanceof Error ? error.message : "Unknown logging error",
    );
  }
}

async function saveToGoogleSheets(
  rsvp: ContingencyRsvp,
): Promise<void> {
  const serviceAccountBase64 = Deno.env.get(
    "GOOGLE_SERVICE_ACCOUNT_JSON_B64",
  );

  const spreadsheetId = Deno.env.get(
    "GOOGLE_SPREADSHEET_ID",
  );

  if (!serviceAccountBase64 || !spreadsheetId) {
    throw new Error("Google Sheets configuration is missing");
  }

  const serviceAccount = JSON.parse(
    atob(serviceAccountBase64),
  );

  const now = Math.floor(Date.now() / 1000);

  const base64UrlEncode = (value: string): string =>
    btoa(value)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const header = base64UrlEncode(
    JSON.stringify({
      alg: "RS256",
      typ: "JWT",
    }),
  );

  const payload = base64UrlEncode(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const unsignedToken = `${header}.${payload}`;

  const privateKeyPem = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const privateKeyDer = Uint8Array.from(
    atob(privateKeyPem),
    (char) => char.charCodeAt(0),
  );

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(unsignedToken),
  );

  const signatureBase64 = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature)),
  );

  const jwt = `${unsignedToken}.${signatureBase64}`;

  const tokenResponse = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    },
  );

  if (!tokenResponse.ok) {
    throw new Error(
      `Google OAuth error: ${tokenResponse.status}`,
    );
  }

  const tokenData = await tokenResponse.json();

  const sheetsResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/RSVP:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [[
          rsvp.request_id,
          rsvp.created_at,
          rsvp.name,
          rsvp.email,
          rsvp.attendance,
          rsvp.companions,
          rsvp.status,
          rsvp.error_type,
          rsvp.synced_at,
        ]],
      }),
    },
  );

  if (!sheetsResponse.ok) {
    const errorBody = await sheetsResponse.text();

    throw new Error(
      `Google Sheets error: ${sheetsResponse.status} ${errorBody}`,
    );
  }
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

  const requestId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  let databaseError: { code?: string; message?: string } | null = null;

  try {
    const { error } = await supabase
      .from("guests")
      .insert({
        name,
        email,
        attendance: body.attendance,
        companions,
      });

    databaseError = error;
  } catch (error) {
    databaseError = {
      message: error instanceof Error
        ? error.message
        : "Database request failed",
    };
  }

  if (databaseError) {
    console.error("Database error:", databaseError);

    if (databaseError.code === "23505") {
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

    try {
      await saveToGoogleSheets({
        request_id: requestId,
        created_at: createdAt,
        name,
        email,
        attendance: body.attendance,
        companions,
        status: "pending",
        error_type: databaseError.code ?? "DATABASE_ERROR",
        synced_at: new Date().toISOString(),
      });

      notifyAdmin({
        request_id: requestId,
        occurred_at: new Date().toISOString(),
        failure_type: databaseError.code ?? "DATABASE_ERROR",
        contingency_status: "pending",
        email,
        name,
        companions,
      });

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
      console.error("Google Sheets contingency error:", error);

      notifyAdmin({
        request_id: requestId,
        occurred_at: new Date().toISOString(),
        failure_type: "DATABASE_AND_GOOGLE_SHEETS_FAILURE",
        contingency_status: "failed",
        email,
        name,
        companions,
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
});