// Asserções locais sem SDK, rede ou dependências de tipos Node.
function check(condition: boolean): asserts condition {
  if (!condition) throw new Error("Assertion failed");
}
function matches(error: unknown, expected: unknown): void {
  if (typeof expected === "function") {
    if (expected === TypeError) check(error instanceof TypeError);
    else check(expected(error));
  } else {
    for (
      const [key, value] of Object.entries(expected as Record<string, unknown>)
    ) {
      check((error as Record<string, unknown>)[key] === value);
    }
  }
}
const assert = {
  equal: (actual: unknown, expected: unknown) => check(actual === expected),
  notEqual: (actual: unknown, expected: unknown) => check(actual !== expected),
  deepEqual: (actual: unknown, expected: unknown) =>
    check(JSON.stringify(actual) === JSON.stringify(expected)),
  throws(action: () => unknown, expected: unknown) {
    try {
      action();
    } catch (error) {
      matches(error, expected);
      return;
    }
    throw new Error("Expected rejection");
  },
  async rejects(action: Promise<unknown>, expected: unknown) {
    try {
      await action;
    } catch (error) {
      matches(error, expected);
      return;
    }
    throw new Error("Expected rejection");
  },
};

import {
  AdminConfigurationError,
  createAdminAuthenticator,
  isAuthorizedAdmin,
  parseAdminUserIds,
} from "./admin-auth.ts";

// Casos de configuração inválida, normalização de UUID e allowlist negativa.
const FIRST_ADMIN_ID = "c2d806a4-3438-4f24-8d1d-62c50a17c531";
const SECOND_ADMIN_ID = "94827da7-58a1-46f3-8a8d-c82d324d5d7c";
const OTHER_USER_ID = "f8c06c53-1c6b-4c6c-9acd-cdbb1451541a";

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

Deno.test("configured administrators can be authorized", () => {
  const adminIds = parseAdminUserIds(`${FIRST_ADMIN_ID},${SECOND_ADMIN_ID}`);

  assertEquals(
    isAuthorizedAdmin(FIRST_ADMIN_ID, adminIds),
    true,
    "First administrator should be accepted",
  );
  assertEquals(
    isAuthorizedAdmin(SECOND_ADMIN_ID, adminIds),
    true,
    "Second administrator should be accepted",
  );
});

Deno.test("spaces and UUID casing do not change authorization", () => {
  const adminIds = parseAdminUserIds(` ${FIRST_ADMIN_ID.toUpperCase()} `);

  assertEquals(
    isAuthorizedAdmin(` ${FIRST_ADMIN_ID.toUpperCase()} `, adminIds),
    true,
    "UUID comparison should trim and normalize case",
  );
});

Deno.test("unauthorized and absent users are rejected", () => {
  const adminIds = parseAdminUserIds(FIRST_ADMIN_ID);

  assertEquals(
    isAuthorizedAdmin(OTHER_USER_ID, adminIds),
    false,
    "Unlisted authenticated user should be denied",
  );
  assertEquals(
    isAuthorizedAdmin(null, adminIds),
    false,
    "Missing authenticated user should be denied",
  );
});

Deno.test("missing, empty, and invalid administrator configuration fails closed", () => {
  for (const value of [undefined, "", " , ", `${FIRST_ADMIN_ID},invalid`]) {
    try {
      parseAdminUserIds(value);
      throw new Error("Expected invalid administrator configuration");
    } catch (error) {
      if (!(error instanceof AdminConfigurationError)) {
        throw error;
      }
    }
  }
});

Deno.test("Bearer parsing calls Auth only for the existing accepted syntax", async () => {
  const tokens: string[] = [];
  const authenticate = createAdminAuthenticator({
    auth: {
      getUser: async (token) => {
        tokens.push(token);
        return { data: { user: { id: OTHER_USER_ID } }, error: null };
      },
    },
  });
  for (
    const value of [
      undefined,
      "",
      "Basic synthetic",
      "Bearer",
      "Bearer ",
      "BearerToken",
    ]
  ) {
    const headers: Record<string, string> = value === undefined
      ? {}
      : { authorization: value };
    assert.equal(
      await authenticate(new Request("https://synthetic.invalid", { headers })),
      null,
    );
  }
  assert.deepEqual(tokens, []);
  for (
    const value of [
      "Bearer synthetic",
      "bEaReR   synthetic",
      "Bearer synthetic extra",
    ]
  ) {
    assert.equal(
      await authenticate(
        new Request("https://synthetic.invalid", {
          headers: { authorization: value },
        }),
      ),
      OTHER_USER_ID,
    );
  }
  assert.deepEqual(tokens, ["synthetic", "synthetic", "synthetic extra"]);
  // Autenticação não implica autorização; a allowlist continua no handler.
  assert.equal(
    isAuthorizedAdmin(OTHER_USER_ID, parseAdminUserIds(FIRST_ADMIN_ID)),
    false,
  );
});

Deno.test("Auth errors and absent users return null; thrown errors reach the handler", async () => {
  const request = new Request("https://synthetic.invalid", {
    headers: { authorization: "Bearer synthetic" },
  });
  for (
    const result of [
      { data: { user: { id: FIRST_ADMIN_ID } }, error: new Error("synthetic") },
      { data: { user: null }, error: null },
      { data: {}, error: null },
    ]
  ) {
    const authenticate = createAdminAuthenticator({
      auth: { getUser: async () => result },
    });
    assert.equal(await authenticate(request), null);
  }
  const error = new Error("synthetic rejection");
  const authenticate = createAdminAuthenticator({
    auth: { getUser: () => Promise.reject(error) },
  });
  await assert.rejects(
    authenticate(request),
    (received: unknown) => received === error,
  );
});

import { createListHandler } from "../admin-list-contingency/handler.ts";
import { createGuestListHandler } from "../admin-list-guests/handler.ts";
import { createGuestAdminHandler } from "../admin-manage-guests/handler.ts";
import { createEventAdminHandler } from "../admin-manage-event-config/handler.ts";
import { createRecoveryHandler } from "../admin-recover-contingency/handler.ts";

for (
  const [name, factory, method, methods] of [
    ["contingency-list", createListHandler, "GET", "GET, OPTIONS"],
    ["guest-list", createGuestListHandler, "GET", "GET, OPTIONS"],
    ["guest-manage", createGuestAdminHandler, "POST", "POST, OPTIONS"],
    ["event-manage", createEventAdminHandler, "PUT", "GET, PUT, OPTIONS"],
    ["contingency-recover", createRecoveryHandler, "POST", "POST, OPTIONS"],
  ] as const
) {
  Deno.test(`${name}: Origin, OPTIONS, method, Auth and allowlist precede privileged work`, async () => {
    let authCalls = 0;
    let identity: string | null = null;
    let authThrows = false;
    const forbidden = () => {
      throw new Error("Privileged dependency must not be reached");
    };
    let privilegedCalls = 0;
    const privileged = () => {
      privilegedCalls++;
      return forbidden();
    };
    const handler = factory({
      allowedOrigins: ["https://panel.invalid"],
      adminUserIds: parseAdminUserIds(FIRST_ADMIN_ID),
      authenticate: createAdminAuthenticator({
        auth: {
          getUser: async () => {
            authCalls++;
            if (authThrows) throw new Error("synthetic Auth failure");
            return {
              data: { user: identity ? { id: identity } : null },
              error: null,
            };
          },
        },
      }),
      listRows: async () => privileged(),
      listGuests: async () => privileged(),
      createDependencies: privileged,
    });
    const request = (
      verb: string,
      origin = "https://panel.invalid",
      query = "",
    ) =>
      new Request(`https://synthetic.invalid/${query}`, {
        method: verb,
        headers: { origin, authorization: "Bearer synthetic" },
        ...(verb === "POST" || verb === "PUT" ? { body: "invalid JSON" } : {}),
      });
    const rejected = await handler(
      request("OPTIONS", "https://untrusted.invalid"),
    );
    assert.equal(rejected.status, 403);
    assert.equal((await rejected.json()).error, "INVALID_ORIGIN");
    assert.equal(rejected.headers.has("Access-Control-Allow-Origin"), false);
    const preflight = await handler(request("OPTIONS"));
    assert.equal(preflight.status, 204);
    assert.equal(await preflight.text(), "");
    assert.equal(
      preflight.headers.get("Access-Control-Allow-Origin"),
      "https://panel.invalid",
    );
    assert.equal(
      preflight.headers.get("Access-Control-Allow-Methods"),
      methods,
    );
    assert.equal(
      preflight.headers.get("Access-Control-Max-Age"),
      name === "event-manage" ? null : "600",
    );
    const unsupported = await handler(request("PATCH"));
    assert.equal(unsupported.status, 405);
    assert.equal((await unsupported.json()).error, "METHOD_NOT_ALLOWED");
    if (name === "guest-list") {
      const invalidQuery = await handler(
        request("GET", "https://panel.invalid", "?page=0"),
      );
      assert.equal(invalidQuery.status, 400);
      assert.equal((await invalidQuery.json()).error, "INVALID_QUERY");
    }
    assert.equal(authCalls, 0);
    for (const throws of [false, true]) {
      authThrows = throws;
      const absent = await handler(request(method));
      assert.equal(absent.status, 401);
      assert.equal((await absent.json()).error, "UNAUTHORIZED");
    }
    authThrows = false;
    identity = OTHER_USER_ID;
    const denied = await handler(request(method));
    assert.equal(denied.status, 403);
    const body = await denied.json();
    assert.deepEqual(body, {
      success: false,
      error: "ADMIN_ACCESS_DENIED",
      ...(name === "event-manage"
        ? {}
        : { message: "Usuário sem autorização administrativa." }),
    });
    assert.equal(authCalls, 3);
    assert.equal(privilegedCalls, 0);
  });
}
