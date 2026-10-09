import { createRsvpHandler, type RsvpOptions } from "./handler.ts";
import { notifyAdmin } from "./notify-admin.ts";
const guest = {
  name: "Nome Á Sintético",
  email: "test@example.invalid",
  attendance: true,
  companions: 2,
};
function assert(value: unknown) {
  if (!value) throw new Error("Assertion failed");
}
function harness(overrides: Partial<RsvpOptions> = {}) {
  const state = { attempts: 0, inserts: 0, sheets: 0, alerts: 0 };
  const handler = createRsvpHandler({
    corsHeaders: { "Access-Control-Allow-Origin": "*" },
    consumeRateLimit: () => {
      state.attempts++;
      return Promise.resolve({ data: { allowed: true }, error: null });
    },
    insertGuest: () => {
      state.inserts++;
      return Promise.resolve({ error: null });
    },
    saveToGoogleSheets: () => {
      state.sheets++;
      return Promise.resolve();
    },
    notifyAdmin: () => {
      state.alerts++;
    },
    ...overrides,
  });
  return { handler, state };
}
function req(body: unknown = guest, method = "POST") {
  return new Request("https://example.invalid", {
    method,
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
  });
}
Deno.test("RSVP 201 and absent guest normalization", async () => {
  let companions = -1;
  const h = harness({
    insertGuest: (value) => {
      companions = value.companions;
      return Promise.resolve({ error: null });
    },
  });
  assert(
    (await h.handler(req({ ...guest, attendance: false }))).status === 201 &&
      companions === 0 && h.state.attempts === 1,
  );
});
Deno.test("RSVP invalid JSON and validation consume quota without alert", async () => {
  const h = harness();
  const response = await h.handler(
    new Request("https://example.invalid", { method: "POST", body: "{" }),
  );
  assert(
    response.status === 400 && (await response.json()).error === "INVALID_JSON",
  );
  assert((await h.handler(req(null))).status === 400);
  assert(
    h.state.attempts === 2 && h.state.inserts === 0 && h.state.alerts === 0,
  );
});
Deno.test("RSVP OPTIONS and method rejection do not consume quota", async () => {
  const h = harness();
  assert((await h.handler(req(undefined, "OPTIONS"))).status === 200);
  assert((await h.handler(req(undefined, "GET"))).status === 405);
  assert(h.state.attempts === 0);
});
Deno.test("RSVP duplicate 409 is not infrastructure/contingency", async () => {
  const h = harness({
    insertGuest: () => Promise.resolve({ error: { code: "23505" } }),
  });
  assert(
    (await h.handler(req())).status === 409 && h.state.sheets === 0 &&
      h.state.alerts === 0,
  );
});
Deno.test("RSVP fallback 202, failure 500, logs never contain submitted PII", async () => {
  const logs: unknown[] = [];
  const previous = console.error;
  console.error = (...args: unknown[]) => {
    logs.push(args);
  };
  try {
    const h = harness({
      insertGuest: () =>
        Promise.reject(new Error("Nome Á Sintético test@example.invalid")),
      notifyAdmin,
    });
    assert((await h.handler(req())).status === 202 && h.state.sheets === 1);
    const failure = harness({
      insertGuest: () =>
        Promise.resolve({ error: { code: "test@example.invalid" } }),
      saveToGoogleSheets: () => Promise.reject(new Error("Nome Á Sintético")),
      notifyAdmin,
    });
    assert((await failure.handler(req())).status === 500);
    notifyAdmin({
      request_id: "synthetic-id",
      occurred_at: "2030-01-01T00:00:00Z",
      failure_type: "DATABASE_ERROR",
      contingency_status: "pending",
      ...{ name: guest.name, email: guest.email },
    });
    assert(
      !JSON.stringify(logs).includes(guest.name) &&
        !JSON.stringify(logs).includes(guest.email),
    );
  } finally {
    console.error = previous;
  }
});
Deno.test("RSVP throttled 429 preserves Retry-After 600", async () => {
  const h = harness({
    consumeRateLimit: () =>
      Promise.resolve({ data: { allowed: false }, error: null }),
  });
  const response = await h.handler(req());
  assert(
    response.status === 429 && response.headers.get("retry-after") === "600" &&
      h.state.inserts === 0,
  );
});
Deno.test("RSVP rate service error is sanitized 500 without parse/write", async () => {
  const h = harness({
    consumeRateLimit: () => Promise.reject(new Error("test@example.invalid")),
  });
  assert(
    (await h.handler(req())).status === 500 && h.state.inserts === 0 &&
      h.state.sheets === 0,
  );
});
