import { type AdminGuestRecord, createGuestListHandler } from "./handler.ts";

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

const guest: AdminGuestRecord = {
  id: "f8c06c53-1c6b-4c6c-9acd-cdbb1451541a",
  name: "Convidado sintético",
  email: "synthetic@example.invalid",
  attendance: true,
  companions: 2,
  created_at: "2026-10-01T12:00:00.000Z",
};

function makeHandler(
  rows: AdminGuestRecord[],
  authenticate: () => Promise<string | null>,
  onList = () => {},
): (request: Request) => Promise<Response> {
  return createGuestListHandler({
    allowedOrigins: [ORIGIN],
    adminUserId: ADMIN_ID,
    authenticate,
    listGuests() {
      onList();
      return Promise.resolve(rows);
    },
  });
}

function getRequest(origin = ORIGIN): Request {
  return new Request("https://edge.test/admin-list-guests", {
    method: "GET",
    headers: { Origin: origin },
  });
}

Deno.test("administrator receives guest records", async () => {
  const handler = makeHandler([guest], () => Promise.resolve(ADMIN_ID));
  const response = await handler(getRequest());
  const body = await response.json();

  assertEquals(response.status, 200, "Admin request should succeed");
  assertEquals(body.records.length, 1, "One guest should be returned");
  assertEquals(body.records[0].id, guest.id, "Guest UUID should be mapped");
  assertEquals(body.records[0].email, guest.email, "Email should be mapped");
});

Deno.test("response contains only dashboard fields", async () => {
  const guestWithExtra = { ...guest, internal: "not-for-client" };
  const handler = makeHandler(
    [guestWithExtra],
    () => Promise.resolve(ADMIN_ID),
  );
  const response = await handler(getRequest());
  const body = await response.json();

  assertEquals(
    Object.keys(body.records[0]).sort().join(","),
    "attendance,companions,created_at,email,id,name",
    "No internal fields should be returned",
  );
});

Deno.test("empty guest list returns an empty array", async () => {
  const handler = makeHandler([], () => Promise.resolve(ADMIN_ID));
  const response = await handler(getRequest());
  const body = await response.json();

  assertEquals(response.status, 200, "Empty list should succeed");
  assert(Array.isArray(body.records), "Records should be an array");
  assertEquals(body.records.length, 0, "Records should be empty");
});

Deno.test("unauthenticated caller is rejected before listing", async () => {
  let listed = false;
  const handler = makeHandler(
    [guest],
    () => Promise.resolve(null),
    () => {
      listed = true;
    },
  );
  const response = await handler(getRequest());

  assertEquals(response.status, 401, "Unauthenticated caller should be denied");
  assertEquals(listed, false, "Guest rows must not be queried");
});

Deno.test("non-admin caller is rejected before listing", async () => {
  let listed = false;
  const handler = makeHandler(
    [guest],
    () => Promise.resolve(OTHER_USER_ID),
    () => {
      listed = true;
    },
  );
  const response = await handler(getRequest());

  assertEquals(response.status, 403, "Non-admin caller should be denied");
  assertEquals(listed, false, "Guest rows must not be queried");
});

Deno.test("unapproved origin is rejected", async () => {
  let authenticated = false;
  const handler = makeHandler(
    [guest],
    () => {
      authenticated = true;
      return Promise.resolve(ADMIN_ID);
    },
  );
  const response = await handler(getRequest("https://unapproved.example"));

  assertEquals(response.status, 403, "Unapproved origin should be denied");
  assertEquals(authenticated, false, "Request should stop before auth");
});
