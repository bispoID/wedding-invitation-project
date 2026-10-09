import { createEventConfigHandler } from "./handler.ts";
import { fixture } from "../_shared/event-fixture.ts";
function assert(value: unknown) {
  if (!value) throw new Error("Assertion failed");
}
for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
  Deno.test("public event rejects " + method, async () => {
    let reads = 0;
    const response = await createEventConfigHandler(() => {
      reads++;
      return Promise.resolve(null);
    })(new Request("https://example.invalid", { method }));
    assert(response.status === 405 && reads === 0);
  });
}
Deno.test("public event GET uses allowlist, SQL time and no-store CORS", async () => {
  const response = await createEventConfigHandler(() =>
    Promise.resolve({
      ...fixture,
      event_time: "12:30:00",
      id: 1,
      updated_at: "2030-01-01",
      secret: "private",
    })
  )(new Request("https://example.invalid"));
  const body = await response.json();
  assert(
    response.status === 200 && Object.keys(body.config).length === 14 &&
      body.config.event_time === "12:30" && body.config.reception_city === null &&
      body.config.reception_state === null && !("monogram_url" in body.config),
  );
  assert(
    response.headers.get("cache-control") === "no-store" &&
      response.headers.get("access-control-allow-origin") === "*",
  );
});
for (
  const [label, read, status, error] of [
    ["empty", () => Promise.resolve(null), 404, "EVENT_CONFIG_NOT_FOUND"],
    [
      "failure",
      () => Promise.reject(new Error("private")),
      503,
      "EVENT_CONFIG_UNAVAILABLE",
    ],
  ] as const
) {
  Deno.test("public event " + label, async () => {
    const response = await createEventConfigHandler(read)(
      new Request("https://example.invalid"),
    );
    const body = await response.json();
    assert(
      response.status === status && body.error === error &&
        !JSON.stringify(body).includes("private"),
    );
  });
}
Deno.test("public event OPTIONS does not query DB", async () => {
  const response = await createEventConfigHandler(() => {
    throw new Error();
  })(new Request("https://example.invalid", { method: "OPTIONS" }));
  assert(
    response.status === 204 &&
      response.headers.get("cache-control") === "no-store",
  );
});
