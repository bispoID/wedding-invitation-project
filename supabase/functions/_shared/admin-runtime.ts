const REQUEST_TIMEOUT_MS = 12_000;

/** Lê configuração somente na chamada, preservando valores e erros do runtime. */
export function requireEnv(
  name: string,
  readEnv: (name: string) => string | undefined = (name) => Deno.env.get(name),
): string {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

/** Valida a allowlist de origens do painel antes de aceitar requisições. */
export function configuredOrigins(
  readEnv: (name: string) => string | undefined = (name) => Deno.env.get(name),
): string[] {
  const value = requireEnv("ADMIN_ALLOWED_ORIGINS", readEnv);

  return value.split(",").map((origin) => {
    const trimmed = origin.trim();
    const parsed = new URL(trimmed);

    if (
      parsed.origin !== trimmed ||
      !["http:", "https:"].includes(parsed.protocol)
    ) {
      throw new Error("ADMIN_ALLOWED_ORIGINS contains an invalid origin");
    }

    return parsed.origin;
  });
}

/** Aplica timeout comum às chamadas Auth e PostgREST/RPC. */
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  return fetchImpl(input, { ...init, signal });
}

/** Cria opções independentes sem instanciar clientes ou ler credenciais. */
export function adminClientOptions(fetchImpl: typeof fetch = fetchWithTimeout) {
  return {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetchImpl },
  };
}
