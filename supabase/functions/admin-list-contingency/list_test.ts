import { createListHandler } from "./handler.ts";
import type { ContingencyRow } from "../_shared/google-sheets.ts";

const ADMIN_ID = "c2d806a4-3438-4f24-8d1d-62c50a17c531";
const OTHER_USER_ID = "94827da7-58a1-46f3-8a8d-c82d324d5d7c";
const ORIGIN = "http://localhost:5500";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

function pendingRow(
  overrides: Partial<ContingencyRow> = {},
): ContingencyRow {
  return {
    rowNumber: 2,
    requestId: "f8c06c53-1c6b-4c6c-9acd-cdbb1451541a",
    createdAt: "2026-10-01T12:00:00.000Z",
    name: "Convidado sintético",
    email: "synthetic@example.invalid",
    attendance: true,
    companions: 2,
    status: "pending",
    errorType: "DATABASE_ERROR",
    syncedAt: "",
    ...overrides,
  };
}

function makeHandler(
  rows: ContingencyRow[],
  authenticate: () => Promise<string | null>,
  onList = () => {},
): (request: Request) => Promise<Response> {
  return createListHandler({
    allowedOrigins: [ORIGIN],
    adminUserId: ADMIN_ID,
    authenticate,
    listRows() {
      onList();
      return Promise.resolve(rows);
    },
  });
}

function getRequest(): Request {
  return new Request("https://edge.test/admin-list-contingency", {
    method: "GET",
    headers: { Origin: ORIGIN },
  });
}

Deno.test("authenticated administrator receives only pending rows", async () => {
  const handler = makeHandler(
    [
      pendingRow(),
      pendingRow({ rowNumber: 3, status: "synced", requestId: "synced-id" }),
    ],
    () => Promise.resolve(ADMIN_ID),
  );
  const response = await handler(getRequest());
  const body = await response.json();

  assertEquals(response.status, 200, "Administrator should be authorized");
  assertEquals(body.records.length, 1, "Only pending rows should be returned");
  assertEquals(
    body.records[0].request_id,
    "f8c06c53-1c6b-4c6c-9acd-cdbb1451541a",
    "Request ID should be mapped",
  );
});

Deno.test("non-administrator is rejected before reading the sheet", async () => {
  let listCalled = false;
  const handler = makeHandler(
    [pendingRow()],
    () => Promise.resolve(OTHER_USER_ID),
    () => {
      listCalled = true;
    },
  );
  const response = await handler(getRequest());
  const body = await response.json();

  assertEquals(response.status, 403, "Other user should be denied");
  assertEquals(body.error, "ADMIN_ACCESS_DENIED", "Expected access denial");
  assertEquals(listCalled, false, "Sheet must not be read");
});

Deno.test("unauthenticated user is rejected before reading the sheet", async () => {
  let listCalled = false;
  const handler = makeHandler(
    [pendingRow()],
    () => Promise.resolve(null),
    () => {
      listCalled = true;
    },
  );
  const response = await handler(getRequest());
  const body = await response.json();

  assertEquals(response.status, 401, "Unauthenticated user should be denied");
  assertEquals(body.error, "UNAUTHORIZED", "Expected authentication error");
  assertEquals(listCalled, false, "Sheet must not be read");
});

Deno.test("empty contingency queue returns an empty record array", async () => {
  const handler = makeHandler([], () => Promise.resolve(ADMIN_ID));
  const response = await handler(getRequest());
  const body = await response.json();

  assertEquals(response.status, 200, "Empty list should be successful");
  assert(Array.isArray(body.records), "Records should be an array");
  assertEquals(body.records.length, 0, "Empty list should contain no records");
});

Deno.test("pending row maps only dashboard fields", async () => {
  const handler = makeHandler(
    [pendingRow({ attendance: "TRUE", companions: "2" })],
    () => Promise.resolve(ADMIN_ID),
  );
  const response = await handler(getRequest());
  const body = await response.json();
  const record = body.records[0];

  assertEquals(record.created_at, "2026-10-01T12:00:00.000Z", "Date");
  assertEquals(record.name, "Convidado sintético", "Name");
  assertEquals(record.email, "synthetic@example.invalid", "Email");
  assertEquals(record.attendance, true, "Attendance");
  assertEquals(record.companions, 2, "Companions");
  assertEquals(record.status, "pending", "Status");
  assertEquals(record.error_type, "DATABASE_ERROR", "Error type");
  assertEquals(record.synced_at, "", "Sync timestamp");
  assertEquals(
    Object.hasOwn(record, "rowNumber"),
    false,
    "Internal row number must not be returned",
  );
});

Deno.test("Sheets date serial is converted to an ISO timestamp", async () => {
  const date = Date.UTC(2026, 9, 7, 12);
  const serial = (date - Date.UTC(1899, 11, 30)) / (24 * 60 * 60 * 1000);
  const handler = makeHandler(
    [pendingRow({ createdAt: String(serial) })],
    () => Promise.resolve(ADMIN_ID),
  );
  const response = await handler(getRequest());
  const body = await response.json();

  assertEquals(
    body.records[0].created_at,
    "2026-10-07T12:00:00.000Z",
    "Date serial should map to the correct timestamp",
  );
});

Deno.test("only the configured origin receives CORS access", async () => {
  const handler = makeHandler([], () => Promise.resolve(ADMIN_ID));
  const response = await handler(
    new Request("https://edge.test/admin-list-contingency", {
      method: "GET",
      headers: { Origin: "https://untrusted.example" },
    }),
  );
  const body = await response.json();

  assertEquals(response.status, 403, "Untrusted origin should be rejected");
  assertEquals(body.error, "INVALID_ORIGIN", "Expected origin rejection");
});
