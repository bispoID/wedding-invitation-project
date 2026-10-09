import {
  eventDto,
  isHttpsUrl,
  validateEventConfig,
} from "./event-validation.ts";
import { fixture } from "./event-fixture.ts";
function assert(value: unknown) {
  if (!value) throw new Error("Assertion failed");
}
for (
  const [field, value] of [
    ["bride_name", " "],
    ["groom_name", "x".repeat(201)],
    ["city", "x".repeat(151)],
    ["state", "x".repeat(101)],
    ["ceremony_name", "x".repeat(201)],
    ["ceremony_address", "x".repeat(501)],
    ["event_date", "2030-02-30"],
    ["event_date", "0000-01-01"],
    ["event_time", "24:00"],
    ["event_time", "12:60"],
    ["reception_address", "Endereço sintético"],
    ["reception_maps_url", "http://example.invalid/image.png"],
    ["reception_maps_url", "https://user:pass@example.invalid/a"],
    ["ceremony_maps_url", "javascript:alert(1)"],
    ["id", 1],
    ["updated_at", "2030-01-01"],
  ] as const
) {
  Deno.test("event rejects " + field + " " + String(value).slice(0, 30), () => {
    assert("error" in validateEventConfig({ ...fixture, [field]: value }));
  });
}
Deno.test("event requires complete DTO and normalizes blanks and SQL time", () => {
  assert("error" in validateEventConfig({ bride_name: "Pessoa A" }));
  const result = validateEventConfig({
    ...fixture,
    ceremony_address: " ",
    bride_name: " Pessoa A ",
    event_time: "12:30:00",
  });
  assert(
    "config" in result && result.config.ceremony_address === null &&
      result.config.event_time === "12:30" &&
      result.config.bride_name === "Pessoa A",
  );
  const dto = eventDto({
    ...fixture,
    id: 1,
    secret: "not-public",
    updated_at: "2030-01-01",
  });
  assert(
    Object.keys(dto).length === 14 && !("secret" in dto) && !("id" in dto),
  );
});
for (
  const url of [
    "https://example.invalid/a.png",
    "https://example.invalid/maps?q=synthetic",
    "https://例え.invalid/a",
  ]
) {
  Deno.test("event accepts HTTPS " + url, () => assert(isHttpsUrl(url)));
}
for (
  const url of [
    "https:///example.invalid/a",
    "https://example.invalid/a b",
    "https://example.invalid/%bad%",
    "https://example.invalid\\evil",
  ]
) {
  Deno.test(
    "event rejects malformed URL " + url,
    () => assert(!isHttpsUrl(url)),
  );
}

Deno.test("event final contract rejects remote monogram and accepts optional reception map", () => {
  assert("error" in validateEventConfig({ ...fixture, monogram_url: null }));
  for (const value of [null, "", "   ", "https://example.invalid/map"]) {
    const parsed = validateEventConfig({ ...fixture, reception_maps_url: value });
    assert("config" in parsed && parsed.config.reception_maps_url === (value?.trim() || null));
    assert("config" in parsed && Object.keys(parsed.config).length === 14 && !("monogram_url" in parsed.config));
  }
});

for (const [field, limit] of [["reception_city", 150], ["reception_state", 100]] as const) {
  Deno.test("event optional reception location validates normalization and boundaries: " + field, () => {
    for (const value of [null, "", "   ", " Valor válido ", "😀".repeat(limit)]) {
      const parsed = validateEventConfig({ ...fixture, [field]: value });
      assert("config" in parsed && parsed.config[field] === (value?.trim() || null));
    }
    for (const value of [undefined, 1, false, {}, [], "a".repeat(limit + 1)]) {
      assert("error" in validateEventConfig({ ...fixture, [field]: value }));
    }
    const missing: Record<string, unknown> = { ...fixture };
    delete missing[field];
    assert("error" in validateEventConfig(missing));
  });
}
