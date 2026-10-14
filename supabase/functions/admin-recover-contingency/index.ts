import { createClient } from "@supabase/supabase-js";
import { parseAdminUserIds } from "../_shared/admin-auth.ts";
import { getContingencyProvider } from "../_shared/contingency.ts";
import { createRecoveryHandler } from "./handler.ts";
import type {
  ContingencyRecord,
  GuestRecord,
  RecoveryDependencies,
} from "./recovery.ts";

const REQUEST_TIMEOUT_MS = 12_000;

// O entrypoint injeta Auth, banco e provider; o fluxo de recuperação é testável separadamente.
function requireEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

/** Valida a allowlist de origens do painel. */
function configuredOrigins(): string[] {
  const value = requireEnv("ADMIN_ALLOWED_ORIGINS");

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

/** Impõe timeout às chamadas de Auth e Supabase usadas na recuperação. */
function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  return fetch(input, { ...init, signal });
}

const supabaseUrl = requireEnv("SUPABASE_URL");
const publicKey = requireEnv("SUPABASE_ANON_KEY");
const adminUserIds = parseAdminUserIds(Deno.env.get("ADMIN_AUTH_USER_IDS"));

const authClient = createClient(supabaseUrl, publicKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    fetch: fetchWithTimeout,
  },
});

const handler = createRecoveryHandler({
  allowedOrigins: configuredOrigins(),
  adminUserIds,
  async authenticate(request) {
    const authorization = request.headers.get("authorization");
    const match = authorization?.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return null;
    }

    const { data, error } = await authClient.auth.getUser(match[1]);
    return error ? null : data.user?.id ?? null;
  },
  createDependencies(): Promise<RecoveryDependencies> {
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: fetchWithTimeout,
      },
    });

    return Promise.resolve({
      async acquireLock(ownerId) {
        const { data, error } = await serviceClient.rpc(
          "acquire_contingency_recovery_lock",
          { p_owner_id: ownerId },
        );

        if (error) {
          throw new Error("Could not acquire contingency recovery lock");
        }

        return data === true;
      },
      async releaseLock(ownerId) {
        const { data, error } = await serviceClient.rpc(
          "release_contingency_recovery_lock",
          { p_owner_id: ownerId },
        );

        if (error) {
          throw new Error("Could not release contingency recovery lock");
        }

        return data === true;
      },
      async readRows() {
        try {
          return await getContingencyProvider().read() as ContingencyRecord[];
        } catch (error) {
          console.error("Contingency read failed", { reason: "provider_error" });
          throw error;
        }
      },
      async findGuestByEmail(email): Promise<GuestRecord | null> {
        const { data, error } = await serviceClient
          .from("guests")
          .select("name, email, attendance, companions")
          .eq("email", email)
          .maybeSingle();

        if (error) {
          throw new Error("Could not query guest");
        }

        return data;
      },
      async insertGuest(guest) {
        const { error } = await serviceClient.from("guests").insert(guest);

        if (error) {
          throw { code: error.code };
        }
      },
      async deleteRow(rowNumber) {
        await getContingencyProvider().delete(rowNumber);
      },
    });
  },
});

Deno.serve(handler);
