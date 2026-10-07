const REQUEST_TIMEOUT_MS = 12_000;
const WORKSHEET_NAME = "RSVP";
const REQUIRED_HEADERS = [
  "request_id",
  "name",
  "email",
  "attendance",
  "companions",
  "status",
];
const OPTIONAL_HEADERS = ["created_at", "error_type", "synced_at"];
const HEADER_ALIASES: Record<string, string[]> = {
  attendance: ["attendance", "presence"],
};

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

export interface ContingencyRow {
  rowNumber: number;
  requestId: string;
  createdAt: string;
  name: string;
  email: string;
  attendance: unknown;
  companions: unknown;
  status: string;
  errorType: string;
  syncedAt: string;
}

export class GoogleSheetsError extends Error {
  constructor(
    readonly operation: "authentication" | "append" | "read" | "delete",
    readonly status?: number,
    readonly reason:
      | "missing_configuration"
      | "credential_processing_failed"
      | "oauth_http_error"
      | "oauth_response_invalid"
      | "provider_http_error"
      | "transport_error"
      | "response_invalid"
      | "worksheet_empty"
      | "header_mismatch"
      | "metadata_invalid" = "transport_error",
    readonly columns: string[] = [],
  ) {
    super(`Google Sheets ${operation} failed`);
    this.name = "GoogleSheetsError";
  }
}

interface GoogleConfig {
  spreadsheetId: string;
  accessToken: string;
}

interface SheetsValuesResponse {
  values?: unknown[][];
}

interface SheetsMetadataResponse {
  sheets?: Array<{
    properties?: {
      sheetId?: number;
      title?: string;
    };
  }>;
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new GoogleSheetsError(
      "authentication",
      undefined,
      "missing_configuration",
    );
  }

  return value;
}

function encodeBase64Url(value: string): string {
  return btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function timedFetch(
  input: string | URL,
  init: RequestInit,
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  return fetch(input, { ...init, signal });
}

async function getGoogleConfig(): Promise<GoogleConfig> {
  const serviceAccountBase64 = getRequiredEnv(
    "GOOGLE_SERVICE_ACCOUNT_JSON_B64",
  );
  const spreadsheetId = getRequiredEnv("GOOGLE_SPREADSHEET_ID");

  try {
    const serviceAccount = JSON.parse(atob(serviceAccountBase64)) as {
      client_email?: string;
      private_key?: string;
    };

    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error("Invalid service account");
    }

    const now = Math.floor(Date.now() / 1000);
    const header = encodeBase64Url(JSON.stringify({
      alg: "RS256",
      typ: "JWT",
    }));
    const payload = encodeBase64Url(JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }));
    const unsignedToken = `${header}.${payload}`;
    const privateKeyPem = serviceAccount.private_key
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\s/g, "");
    const privateKeyDer = Uint8Array.from(
      atob(privateKeyPem),
      (character) => character.charCodeAt(0),
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
    const signedToken = `${unsignedToken}.${
      encodeBase64Url(
        String.fromCharCode(...new Uint8Array(signature)),
      )
    }`;

    const tokenResponse = await timedFetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: signedToken,
        }),
      },
    );

    if (!tokenResponse.ok) {
      throw new GoogleSheetsError(
        "authentication",
        tokenResponse.status,
        "oauth_http_error",
      );
    }

    const tokenData = await tokenResponse.json() as {
      access_token?: string;
    };

    if (!tokenData.access_token) {
      throw new GoogleSheetsError(
        "authentication",
        undefined,
        "oauth_response_invalid",
      );
    }

    return {
      spreadsheetId,
      accessToken: tokenData.access_token,
    };
  } catch (error) {
    if (error instanceof GoogleSheetsError) {
      throw error;
    }

    throw new GoogleSheetsError(
      "authentication",
      undefined,
      "credential_processing_failed",
    );
  }
}

async function sheetsRequest(
  config: GoogleConfig,
  url: string,
  init: RequestInit,
  operation: "append" | "read" | "delete",
): Promise<Response> {
  try {
    const response = await timedFetch(url, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${config.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new GoogleSheetsError(
        operation,
        response.status,
        "provider_http_error",
      );
    }

    return response;
  } catch (error) {
    if (error instanceof GoogleSheetsError) {
      throw error;
    }

    throw new GoogleSheetsError(operation, undefined, "transport_error");
  }
}

export async function appendContingencyRsvp(
  rsvp: ContingencyRsvp,
): Promise<void> {
  const config = await getGoogleConfig();
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${WORKSHEET_NAME}:append?valueInputOption=USER_ENTERED`;

  await sheetsRequest(
    config,
    url,
    {
      method: "POST",
      headers: {
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
    "append",
  );
}

export async function readContingencyRows(): Promise<ContingencyRow[]> {
  const config = await getGoogleConfig();
  const range = encodeURIComponent(`'${WORKSHEET_NAME}'!A:Z`);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`;
  const response = await sheetsRequest(config, url, { method: "GET" }, "read");
  let result: SheetsValuesResponse;
  try {
    result = await response.json() as SheetsValuesResponse;
  } catch {
    throw new GoogleSheetsError("read", undefined, "response_invalid");
  }
  const values = result.values ?? [];

  if (values.length === 0) {
    throw new GoogleSheetsError("read", undefined, "worksheet_empty");
  }

  const headers = values[0].map((value) =>
    String(value ?? "").trim().toLowerCase()
  );
  const columnIndexes = new Map<string, number>();
  const columnIssues: string[] = [];

  for (const header of REQUIRED_HEADERS) {
    const acceptedHeaders = HEADER_ALIASES[header] ?? [header];
    const indexes = headers
      .map((value, index) => acceptedHeaders.includes(value) ? index : -1)
      .filter((index) => index !== -1);

    if (indexes.length !== 1) {
      columnIssues.push(
        indexes.length === 0
          ? `missing:${acceptedHeaders.join("|")}`
          : `duplicate:${header}`,
      );
      continue;
    }

    columnIndexes.set(header, indexes[0]);
  }

  for (const header of OPTIONAL_HEADERS) {
    const indexes = headers
      .map((value, index) => value === header ? index : -1)
      .filter((index) => index !== -1);

    if (indexes.length > 1) {
      columnIssues.push(`duplicate:${header}`);
      continue;
    }

    if (indexes.length === 1) {
      columnIndexes.set(header, indexes[0]);
    }
  }

  if (columnIssues.length > 0) {
    throw new GoogleSheetsError(
      "read",
      undefined,
      "header_mismatch",
      columnIssues,
    );
  }

  const getCell = (row: unknown[], header: string): unknown =>
    columnIndexes.has(header) ? row[columnIndexes.get(header)!] ?? "" : "";

  return values.slice(1).flatMap((row, index) => {
    const requestId = String(getCell(row, "request_id")).trim();

    if (!requestId) {
      return [];
    }

    return [{
      rowNumber: index + 2,
      requestId,
      createdAt: String(getCell(row, "created_at")),
      name: String(getCell(row, "name")),
      email: String(getCell(row, "email")),
      attendance: getCell(row, "attendance"),
      companions: getCell(row, "companions"),
      status: String(getCell(row, "status")).trim().toLowerCase(),
      errorType: String(getCell(row, "error_type")),
      syncedAt: String(getCell(row, "synced_at")),
    }];
  });
}

export async function deleteContingencyRow(rowNumber: number): Promise<void> {
  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    throw new GoogleSheetsError("delete");
  }

  const config = await getGoogleConfig();
  const metadataUrl =
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}?fields=sheets.properties(sheetId,title)`;
  const metadataResponse = await sheetsRequest(
    config,
    metadataUrl,
    { method: "GET" },
    "delete",
  );
  const metadata = await metadataResponse.json() as SheetsMetadataResponse;
  const sheet = metadata.sheets?.find(
    (candidate) => candidate.properties?.title === WORKSHEET_NAME,
  );
  const sheetId = sheet?.properties?.sheetId;

  if (sheetId === undefined) {
    throw new GoogleSheetsError("delete", undefined, "metadata_invalid");
  }

  const updateUrl =
    `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}:batchUpdate`;

  await sheetsRequest(
    config,
    updateUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        }],
      }),
    },
    "delete",
  );
}
