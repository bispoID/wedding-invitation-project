import {
  createGuestAdminHandler,
  type GuestAdminDependencies,
  type GuestUpdate,
} from "./handler.ts";
import { parseAdminUserIds } from "../_shared/admin-auth.ts";

const ADMIN_ID = "c2d806a4-3438-4f24-8d1d-62c50a17c531";
const SECOND_ADMIN_ID = "94827da7-58a1-46f3-8a8d-c82d324d5d7c";
const OTHER_USER_ID = "f8c06c53-1c6b-4c6c-9acd-cdbb1451541a";
const GUEST_ID = "f8c06c53-1c6b-4c6c-9acd-cdbb1451541a";
const ORIGIN = "http://localhost:5500";

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

function makeRequest(payload: unknown): Request {
  return new Request("https://edge.test/admin-manage-guests", {
    method: "POST",
    headers: {
      Origin: ORIGIN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

function makeHarness(
  authenticate: () => Promise<string | null> = () => Promise.resolve(ADMIN_ID),
  overrides: Partial<GuestAdminDependencies> = {},
) {
  const state: {
    updateId: string | null;
    updatedGuest: GuestUpdate | null;
    deleteId: string | null;
    dependenciesCreated: boolean;
  } = {
    updateId: null,
    updatedGuest: null,
    deleteId: null,
    dependenciesCreated: false,
  };
  const handler = createGuestAdminHandler({
    allowedOrigins: [ORIGIN],
    adminUserIds: parseAdminUserIds(`${ADMIN_ID},${SECOND_ADMIN_ID}`),
    authenticate,
    createDependencies() {
      state.dependenciesCreated = true;
      return {
        updateGuest(id, guest) {
          state.updateId = id;
          state.updatedGuest = guest;
          return overrides.updateGuest
            ? overrides.updateGuest(id, guest)
            : Promise.resolve({ id });
        },
        deleteGuest(id) {
          state.deleteId = id;
          return overrides.deleteGuest
            ? overrides.deleteGuest(id)
            : Promise.resolve({ id });
        },
      };
    },
  });

  return { handler, state };
}

const validGuest = {
  name: "  Nome Sintético  ",
  email: " TESTE@example.invalid ",
  attendance: true,
  companions: 2,
};

Deno.test("update trims name, normalizes email, and targets the guest UUID", async () => {
  const { handler, state } = makeHarness();
  const response = await handler(
    makeRequest({ action: "update", id: GUEST_ID, guest: validGuest }),
  );
  const body = await response.json();

  assertEquals(response.status, 200, "Update should succeed");
  assertEquals(state.updateId, GUEST_ID, "Update should use guest UUID");
  assertEquals(state.updatedGuest?.name, "Nome Sintético", "Name should trim");
  assertEquals(
    state.updatedGuest?.email,
    "teste@example.invalid",
    "Email should normalize",
  );
  assertEquals(body.action, "updated", "Response should identify update");
});

Deno.test("update accepts both attendance choices and valid companions", async () => {
  const { handler, state } = makeHarness();
  const response = await handler(
    makeRequest({
      action: "update",
      id: GUEST_ID,
      guest: { ...validGuest, attendance: false, companions: 15 },
    }),
  );

  assertEquals(response.status, 200, "Valid update should succeed");
  assertEquals(
    state.updatedGuest?.attendance,
    false,
    "Attendance should update",
  );
  assertEquals(
    state.updatedGuest?.companions,
    0,
    "Declined attendance must zero companions",
  );
});

Deno.test("invalid name, email, attendance, and companions are rejected", async () => {
  const invalidGuests = [
    { ...validGuest, name: "  " },
    { ...validGuest, email: "invalid" },
    { ...validGuest, attendance: "true" },
    { ...validGuest, companions: 16 },
    { ...validGuest, companions: 1.5 },
    { ...validGuest, companions: -1 },
  ];

  for (const guest of invalidGuests) {
    const { handler, state } = makeHarness();
    const response = await handler(
      makeRequest({ action: "update", id: GUEST_ID, guest }),
    );

    assertEquals(response.status, 422, "Invalid guest should be rejected");
    assertEquals(
      state.dependenciesCreated,
      false,
      "Invalid data must not initialize privileged dependencies",
    );
  }
});

Deno.test("duplicate email conflict does not report a successful update", async () => {
  const { handler } = makeHarness(
    () => Promise.resolve(ADMIN_ID),
    {
      updateGuest: () => Promise.reject({ code: "23505" }),
    },
  );
  const response = await handler(
    makeRequest({ action: "update", id: GUEST_ID, guest: validGuest }),
  );
  const body = await response.json();

  assertEquals(response.status, 409, "Duplicate email should conflict");
  assertEquals(
    body.error,
    "EMAIL_ALREADY_REGISTERED",
    "Conflict should be explicit",
  );
});

Deno.test("delete targets the requested UUID only", async () => {
  const { handler, state } = makeHarness();
  const response = await handler(
    makeRequest({ action: "delete", id: GUEST_ID }),
  );
  const body = await response.json();

  assertEquals(response.status, 200, "Delete should succeed");
  assertEquals(state.deleteId, GUEST_ID, "Delete should use the UUID");
  assertEquals(body.action, "deleted", "Response should identify deletion");
});

Deno.test("second administrator can perform guest administration", async () => {
  const { handler } = makeHarness(() => Promise.resolve(SECOND_ADMIN_ID));
  const response = await handler(
    makeRequest({ action: "delete", id: GUEST_ID }),
  );

  assertEquals(response.status, 200, "Second administrator should be allowed");
});

Deno.test("missing guest returns not found", async () => {
  const { handler } = makeHarness(
    () => Promise.resolve(ADMIN_ID),
    {
      deleteGuest: () => Promise.resolve(null),
    },
  );
  const response = await handler(
    makeRequest({ action: "delete", id: GUEST_ID }),
  );

  assertEquals(response.status, 404, "Missing guest should return 404");
});

Deno.test("invalid guest UUID is rejected before creating dependencies", async () => {
  const { handler, state } = makeHarness();
  const response = await handler(
    makeRequest({ action: "delete", id: "not-a-uuid" }),
  );
  const body = await response.json();

  assertEquals(response.status, 400, "Invalid UUID should be rejected");
  assertEquals(body.error, "INVALID_ID", "Error should identify invalid ID");
  assertEquals(
    state.dependenciesCreated,
    false,
    "Invalid IDs must not initialize privileged dependencies",
  );
});

Deno.test("unauthenticated and non-admin callers cannot create dependencies", async () => {
  for (const caller of [null, OTHER_USER_ID]) {
    const { handler, state } = makeHarness(() => Promise.resolve(caller));
    const response = await handler(
      makeRequest({ action: "delete", id: GUEST_ID }),
    );

    assertEquals(
      response.status,
      caller ? 403 : 401,
      "Caller should be rejected",
    );
    assertEquals(
      state.dependenciesCreated,
      false,
      "Privileged dependencies must not be initialized",
    );
  }
});
