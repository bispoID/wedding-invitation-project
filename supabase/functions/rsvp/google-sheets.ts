export interface ContingencyRsvp {
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

export async function saveToGoogleSheets(
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

  // Google accepts a short-lived signed service-account assertion for OAuth.
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

  // This sheet is a recovery queue; pending rows are reconciled manually later.
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
