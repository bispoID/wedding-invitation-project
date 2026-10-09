import { validateGuest } from "./guest-validation.ts";
import { validateGuest as validateBrowserGuest } from "../../../invite-app/admin/scripts/guest-validation.js";
const valid = {
  name: "  Nome Á Sintético  ",
  email: " TEST@example.invalid ",
  attendance: true,
  companions: 2,
};
function assert(value: unknown) {
  if (!value) throw new Error("Assertion failed");
}
for (
  const [label, change, code] of [
    ["empty name", { name: " " }, "INVALID_NAME"],
    ["long name", { name: "á".repeat(201) }, "INVALID_NAME"],
    ["object name", { name: {} }, "INVALID_NAME"],
    ["invalid email", { email: "invalid" }, "INVALID_EMAIL"],
    [
      "long email",
      { email: "a".repeat(307) + "@example.invalid" },
      "INVALID_EMAIL",
    ],
    ["non boolean attendance", { attendance: "true" }, "INVALID_ATTENDANCE"],
    ["fraction", { companions: 1.5 }, "INVALID_COMPANIONS"],
    ["negative", { companions: -1 }, "INVALID_COMPANIONS"],
    ["too many", { companions: 16 }, "INVALID_COMPANIONS"],
    ["string companions", { companions: "2" }, "INVALID_COMPANIONS"],
  ] as const
) {
  Deno.test("guest rejects " + label, () => {
    const result = validateGuest({ ...valid, ...change });
    assert("error" in result && result.error === code);
  });
}
for (const value of [null, [], "guest", 1]) {
  Deno.test(
    "guest rejects non record " + JSON.stringify(value),
    () => assert("error" in validateGuest(value)),
  );
}
Deno.test("guest normalizes Unicode name/email and absence without truncation", () => {
  const parsed = validateGuest({ ...valid, attendance: false });
  assert(
    "guest" in parsed && parsed.guest.name === "Nome Á Sintético" &&
      parsed.guest.email === "test@example.invalid" &&
      parsed.guest.companions === 0,
  );
  assert(
    "guest" in
      validateGuest({ ...valid, name: "😀".repeat(200), companions: 15 }),
  );
});
Deno.test("backend and browser guest rules stay equivalent", () => {
  for (
    const value of [
      valid,
      { ...valid, attendance: false },
      null,
      [],
      { ...valid, name: "😀".repeat(200) },
      { ...valid, name: "x".repeat(201) },
      { ...valid, email: "x".repeat(307) + "@example.invalid" },
      { ...valid, companions: 1.5 },
      { ...valid, attendance: "false" },
    ]
  ) {
    assert(
      JSON.stringify(validateGuest(value)) ===
        JSON.stringify(validateBrowserGuest(value)),
    );
  }
});
