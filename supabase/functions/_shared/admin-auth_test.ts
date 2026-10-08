import {
  AdminConfigurationError,
  isAuthorizedAdmin,
  parseAdminUserIds,
} from "./admin-auth.ts";

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
