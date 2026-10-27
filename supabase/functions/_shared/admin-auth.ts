const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Erro de configuração: a allowlist administrativa precisa ser explícita. */
export class AdminConfigurationError extends Error {
  constructor() {
    super("ADMIN_AUTH_USER_IDS is missing or invalid");
    this.name = "AdminConfigurationError";
  }
}

/** Converte a variável CSV de administradores em uma allowlist de UUIDs. */
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

/** Confere a identidade autenticada e o membership na allowlist. */
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

/** Superfície mínima de Auth; não concede autorização administrativa. */
interface AdminAuthClient {
  auth: {
    getUser(token: string): Promise<{
      data: { user?: { id: string } | null };
      error: unknown;
    }>;
  };
}

/** Autentica o Bearer sem alterar erros lançados; o handler decide a resposta. */
export function createAdminAuthenticator(client: AdminAuthClient) {
  return async (request: Request): Promise<string | null> => {
    const authorization = request.headers.get("authorization");
    const match = authorization?.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return null;
    }

    const { data, error } = await client.auth.getUser(match[1]);
    return error ? null : data.user?.id ?? null;
  };
}
