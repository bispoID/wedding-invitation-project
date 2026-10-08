import { createClient } from "@supabase/supabase-js";
import { createGuestAdminHandler } from "./handler.ts";

const REQUEST_TIMEOUT_MS = 12_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

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
const adminUserId = requireEnv("ADMIN_AUTH_USER_ID");

if (!UUID_PATTERN.test(adminUserId)) {
  throw new Error("ADMIN_AUTH_USER_ID must be a UUID");
}

const authClient = createClient(supabaseUrl, publicKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: { fetch: fetchWithTimeout },
});

const handler = createGuestAdminHandler({
  allowedOrigins: configuredOrigins(),
  adminUserId,
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
