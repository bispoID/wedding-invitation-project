import {
  ADMIN_GUEST_CACHE_CONTROL,
  type AdminGuestRecord,
  type GuestListQuery,
  type GuestListResult,
  createGuestListHandler,
} from "./handler.ts";
import { parseAdminUserIds } from "../_shared/admin-auth.ts";

// Exercita query parsing, paginação, include-all, métricas e respostas de segurança.
const ADMIN_ID = "c2d806a4-3438-4f24-8d1d-62c50a17c531";
const SECOND_ADMIN_ID = "94827da7-58a1-46f3-8a8d-c82d324d5d7c";
const OTHER_USER_ID = "f8c06c53-1c6b-4c6c-9acd-cdbb1451541a";
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

const metrics = {
  totalGuests: 47,
  confirmedGuests: 32,
  declinedGuests: 15,
  totalCompanions: 21,
  confirmedPeople: 53,
};

function makeHandler(
  rows: AdminGuestRecord[],
  authenticate: () => Promise<string | null>,
  onList: (query: GuestListQuery) => void = () => {},
): (request: Request) => Promise<Response> {
  return createGuestListHandler({
    allowedOrigins: [ORIGIN],
    adminUserIds: parseAdminUserIds(`${ADMIN_ID},${SECOND_ADMIN_ID}`),
    authenticate,
    listGuests(query): Promise<GuestListResult> {
      onList(query);
      return Promise.resolve({ records: rows, total: rows.length, metrics });
    },
  });
}

function getRequest(query = "", origin = ORIGIN): Request {
  return new Request(`https://edge.test/admin-list-guests${query}`, {
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
  assertEquals(body.pagination.total, 1, "Pagination should include the total");
  assertEquals(body.metrics.totalGuests, metrics.totalGuests, "Metrics should remain global");
  assertEquals(
    response.headers.get("Cache-Control"),
    ADMIN_GUEST_CACHE_CONTROL,
    "Guest data responses must not be cached",
  );
});

Deno.test("second configured administrator receives guest records", async () => {
  const handler = makeHandler([guest], () => Promise.resolve(SECOND_ADMIN_ID));
  const response = await handler(getRequest());

  assertEquals(response.status, 200, "Second administrator should be allowed");
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
  assertEquals(body.pagination.total_pages, 0, "Empty results should have no pages");
});

Deno.test("pagination and search parameters are validated and forwarded", async () => {
  let received: GuestListQuery | null = null;
  const handler = makeHandler(
    [guest],
    () => Promise.resolve(ADMIN_ID),
    (query) => {
      received = query;
    },
  );
  const response = await handler(
    getRequest("?page=2&page_size=20&search=Álvaro%20%25_sintético"),
  );
  const body = await response.json();

  assertEquals(response.status, 200, "Valid pagination should succeed");
  assert(received !== null, "The query should reach the list provider");
  const query = received as GuestListQuery;
  assertEquals(query.page, 2, "Page should be forwarded");
  assertEquals(query.pageSize, 20, "Page size should be forwarded");
  assertEquals(
    query.search,
    "Álvaro %_sintético",
    "Search should preserve Unicode and special text",
  );
  assertEquals(query.includeAll, false, "Explicit query should use paged mode");
  assertEquals(body.pagination.page, 2, "Response should expose the requested page");
  assertEquals(body.pagination.page_size, 20, "Response should expose the requested page size");
});

for (const query of [
  "?page=0&page_size=10",
  "?page=1&page_size=15",
  "?page=100001&page_size=10",
  `?page=1&page_size=10&search=${"x".repeat(321)}`,
]) {
  Deno.test(`invalid guest list query is rejected: ${query.slice(0, 32)}`, async () => {
    let listed = false;
    const handler = makeHandler(
      [guest],
      () => Promise.resolve(ADMIN_ID),
      () => {
        listed = true;
      },
    );
    const response = await handler(getRequest(query));
    const body = await response.json();

    assertEquals(response.status, 400, "Invalid query should be rejected");
    assertEquals(body.error, "INVALID_QUERY", "Invalid query should have a stable error code");
    assertEquals(listed, false, "Invalid query must not reach the database");
  });
}

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
  const response = await handler(getRequest("", "https://unapproved.example"));

  assertEquals(response.status, 403, "Unapproved origin should be denied");
  assertEquals(
    response.headers.get("Cache-Control"),
    ADMIN_GUEST_CACHE_CONTROL,
    "Origin errors must not be cached",
  );
  assertEquals(authenticated, false, "Request should stop before auth");
});

Deno.test("administrative errors use the no-store cache policy", async () => {
  const handler = makeHandler([guest], () => Promise.resolve(null));
  const response = await handler(getRequest());
  const body = await response.json();

  assertEquals(response.status, 401, "Unauthenticated request should be rejected");
  assertEquals(body.error, "UNAUTHORIZED", "Error code should remain stable");
  assertEquals(
    response.headers.get("Cache-Control"),
    ADMIN_GUEST_CACHE_CONTROL,
    "Administrative errors must not be cached",
  );
});
