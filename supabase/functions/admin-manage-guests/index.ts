import { createClient } from "@supabase/supabase-js";
import { parseAdminUserIds } from "../_shared/admin-auth.ts";
import { createGuestAdminHandler } from "./handler.ts";

const REQUEST_TIMEOUT_MS = 12_000;

// O entrypoint injeta clientes Auth/service-role; validação e autorização estão no handler.
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

/** Impõe limite de espera a Auth e operações de banco. */
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
  global: { fetch: fetchWithTimeout },
});

const handler = createGuestAdminHandler({
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
  createDependencies() {
    const serviceClient = createClient(
      supabaseUrl,
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: { fetch: fetchWithTimeout },
      },
    );

    return {
      async createGuest(guest) {
        const { data, error } = await serviceClient.from("guests").insert(guest)
          .select("id").single();
        if (error) throw { code: error.code };
        if (!data) throw { code: "DATABASE_ERROR" };
        return data;
      },
      async updateGuest(id, guest) {
        const { data, error } = await serviceClient
          .from("guests")
          .update(guest)
          .eq("id", id)
          .select("id")
          .maybeSingle();

        if (error) {
          throw { code: error.code };
        }

        return data;
      },
      async deleteGuest(id) {
        const { data, error } = await serviceClient
          .from("guests")
          .delete()
          .eq("id", id)
          .select("id")
          .maybeSingle();

        if (error) {
          throw { code: error.code };
        }

        return data;
      },
    };
  },
});

Deno.serve(handler);
