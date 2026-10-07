import { GoogleSheetsError, readContingencyRows } from "./google-sheets.ts";

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

Deno.test({
  name: "contingency reader accepts presence as attendance header",
  permissions: "inherit",
  fn: async () => {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    );
    const privateKey = new Uint8Array(
      await crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
    );
    const privateKeyBase64 = btoa(String.fromCharCode(...privateKey));
    const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${
      privateKeyBase64.match(/.{1,64}/g)?.join("\n")
    }\n-----END PRIVATE KEY-----`;
    const serviceAccount = btoa(JSON.stringify({
      client_email: "synthetic@example.invalid",
      private_key: privateKeyPem,
    }));
    const previousFetch = globalThis.fetch;
    const previousServiceAccount = Deno.env.get(
      "GOOGLE_SERVICE_ACCOUNT_JSON_B64",
    );
    const previousSpreadsheetId = Deno.env.get("GOOGLE_SPREADSHEET_ID");
    let sheetValues: unknown[][] = [
      [
        "request_id",
        "created_at",
        "name",
        "email",
        "presence",
        "companions",
        "status",
        "error_type",
        "synced_at",
      ],
      [
        "synthetic-request-id",
        "2026-01-01T00:00:00.000Z",
        "Synthetic Guest",
        "synthetic@example.invalid",
        true,
        2,
        "pending",
        "test",
        "",
      ],
    ];

    Deno.env.set("GOOGLE_SERVICE_ACCOUNT_JSON_B64", serviceAccount);
    Deno.env.set("GOOGLE_SPREADSHEET_ID", "synthetic-spreadsheet-id");
    globalThis.fetch = (input) => {
      if (String(input).startsWith("https://oauth2.googleapis.com/token")) {
        return Promise.resolve(
          Response.json({ access_token: "synthetic-access-token" }),
        );
      }

      return Promise.resolve(Response.json({ values: sheetValues }));
    };

    try {
      const rows = await readContingencyRows();
      assertEquals(rows.length, 1, "Should return one synthetic row");
      assertEquals(
        rows[0].attendance,
        true,
        "Presence should map to attendance",
      );
      assertEquals(
        rows[0].createdAt,
        "2026-01-01T00:00:00.000Z",
        "Creation date should be mapped",
      );
      assertEquals(rows[0].errorType, "test", "Error type should be mapped");
      assertEquals(rows[0].syncedAt, "", "Sync timestamp should be mapped");

      sheetValues = [
        [
          "request_id",
          "name",
          "email",
          "attendance",
          "presence",
          "companions",
          "status",
        ],
      ];

      try {
        await readContingencyRows();
        throw new Error("Expected duplicate attendance aliases to be rejected");
      } catch (error) {
        if (!(error instanceof GoogleSheetsError)) {
          throw error;
        }

        assertEquals(error.reason, "header_mismatch", "Reason should be safe");
        assertEquals(
          error.columns[0],
          "duplicate:attendance",
          "Duplicate attendance aliases should be identified",
        );
      }
    } finally {
      globalThis.fetch = previousFetch;
      if (previousServiceAccount === undefined) {
        Deno.env.delete("GOOGLE_SERVICE_ACCOUNT_JSON_B64");
      } else {
        Deno.env.set("GOOGLE_SERVICE_ACCOUNT_JSON_B64", previousServiceAccount);
      }
      if (previousSpreadsheetId === undefined) {
        Deno.env.delete("GOOGLE_SPREADSHEET_ID");
      } else {
        Deno.env.set("GOOGLE_SPREADSHEET_ID", previousSpreadsheetId);
      }
    }
  },
});
