const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class AdminConfigurationError extends Error {
  constructor() {
    super("ADMIN_AUTH_USER_IDS is missing or invalid");
    this.name = "AdminConfigurationError";
  }
}

export function parseAdminUserIds(
  configuredUserIds: string | undefined,
): ReadonlySet<string> {
  if (!configuredUserIds) {
    throw new AdminConfigurationError();
  }

  const userIds = configuredUserIds.split(",").map((value) =>
    value.trim().toLowerCase()
  );

  if (
    userIds.length === 0 ||
    userIds.some((userId) => !UUID_PATTERN.test(userId))
  ) {
    throw new AdminConfigurationError();
  }

  return new Set(userIds);
}

export function isAuthorizedAdmin(
  authenticatedUserId: string | null,
  adminUserIds: ReadonlySet<string>,
): boolean {
  if (!authenticatedUserId) {
    return false;
  }

  const normalizedUserId = authenticatedUserId.trim().toLowerCase();
  return UUID_PATTERN.test(normalizedUserId) &&
    adminUserIds.has(normalizedUserId);
}
