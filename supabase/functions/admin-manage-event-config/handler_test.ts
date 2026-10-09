import { createEventAdminHandler, type EventAdminOptions } from "./handler.ts";
import { fixture } from "../_shared/event-fixture.ts";
const admin = "c2d806a4-3438-4f24-8d1d-62c50a17c531";
const origin = "https://admin.example.invalid";
function assert(value: unknown) {
  if (!value) throw new Error("Assertion failed");
}
function harness(overrides: Partial<EventAdminOptions> = {}) {
  let row: Record<string, unknown> | null = null;
  let calls = 0;
  const handler = createEventAdminHandler({
    allowedOrigins: [origin],
    adminUserIds: new Set([admin]),
    authenticate: () => Promise.resolve(admin),
    createDependencies: () => {
      calls++;
      return {
        read: () => Promise.resolve(row),
        upsert: (config) => {
          row = { ...config, updated_at: "2030-01-01T00:00:00Z", id: 1 };
          return Promise.resolve(row);
        },
      };
    },
    ...overrides,
  });
  return { handler, calls: () => calls };
}
function req(method: string, body?: unknown, requestOrigin = origin) {
  return new Request("https://example.invalid", {
    method,
    headers: { origin: requestOrigin, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
Deno.test("admin event GET empty, initial PUT, GET persisted and update", async () => {
  const { handler } = harness();
  assert((await (await handler(req("GET"))).json()).config === null);
  const first = await handler(req("PUT", { config: fixture }));
  assert(first.status === 200 && (await first.json()).config.updated_at);
  const second = await handler(
    req("PUT", { config: { ...fixture, city: "Outra cidade sintética" } }),
  );
  const body = await second.json();
  assert(
    body.config.city === "Outra cidade sintética" && !("id" in body.config),
  );
  assert(
    (await (await handler(req("GET"))).json()).config.city === body.config.city,
  );
});
for (
  const [label, auth, status] of [
    ["absent JWT", () => Promise.resolve(null), 401],
    ["invalid JWT", () => Promise.reject(new Error("secret")), 401],
    [
      "other user",
      () => Promise.resolve("94827da7-58a1-46f3-8a8d-c82d324d5d7c"),
      403,
    ],
  ] as const
) {
  Deno.test("admin event rejects " + label, async () => {
    const h = harness({ authenticate: auth });
    assert(
      (await h.handler(req("PUT", { config: fixture }))).status === status &&
        h.calls() === 0,
    );
  });
}
for (const method of ["PATCH", "DELETE", "POST"]) {
  Deno.test("admin event rejects " + method, async () => {
    const h = harness();
    assert((await h.handler(req(method))).status === 405 && h.calls() === 0);
  });
}
Deno.test("admin event restrictive origin and OPTIONS", async () => {
  const h = harness();
  assert(
    (await h.handler(req("GET", undefined, "https://other.invalid"))).status ===
      403,
  );
  const response = await h.handler(req("OPTIONS"));
  assert(
    response.status === 204 && h.calls() === 0 &&
      response.headers.get("access-control-allow-origin") === origin,
  );
});
for (
  const [body, status] of [
    [{ config: fixture, id: 1 }, 400],
    [[], 400],
    [{ config: { ...fixture, updated_at: "now" } }, 422],
    [{ config: { ...fixture, monogram_url: "http://example.invalid/a" } }, 422],
    [{ config: { ...fixture, bride_name: " " } }, 422],
    [{ config: { ...fixture, reception_address: "Address" } }, 422],
  ] as const
) {
  Deno.test(
    "admin event rejects payload " + JSON.stringify(body).slice(0, 55),
    async () => {
      const h = harness();
      assert(
        (await h.handler(req("PUT", body))).status === status &&
          h.calls() === 0,
      );
    },
  );
}
Deno.test("admin event accepts HTTPS and returns sanitized persistence failure", async () => {
  const h = harness();
  assert(
    (await h.handler(
      req("PUT", {
        config: { ...fixture, monogram_url: "https://example.invalid/a.png" },
      }),
    )).status === 200,
  );
  const failing = harness({
    createDependencies: () => {
      throw new Error("private database data");
    },
  });
  const response = await failing.handler(req("PUT", { config: fixture }));
  assert(
    response.status === 502 &&
      !JSON.stringify(await response.json()).includes("private"),
  );
});
