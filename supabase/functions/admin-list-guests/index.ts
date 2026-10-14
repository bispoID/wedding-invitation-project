import { createClient } from "@supabase/supabase-js";
import { parseAdminUserIds } from "../_shared/admin-auth.ts";
import {
  createGuestListHandler,
  type GuestListQuery,
  type GuestListResult,
} from "./handler.ts";

const REQUEST_TIMEOUT_MS = 12_000;

// O entrypoint injeta Auth e RPC; o contrato HTTP permanece testável no handler.
function requireEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

/** Valida a allowlist de origens do painel antes de aceitar requisições. */
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

/** Aplica timeout comum às chamadas Auth e PostgREST/RPC. */
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

const handler = createGuestListHandler({
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
  async listGuests(query: GuestListQuery): Promise<GuestListResult> {
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
    const { data, error } = await serviceClient.rpc("admin_list_guests", {
      p_page: query.page,
      p_page_size: query.pageSize,
      p_search: query.search,
      p_include_all: query.includeAll,
    });

    if (error) {
      console.error("Guest database query failed", { code: error.code });
      throw new Error("Guest query failed");
    }

    if (!data || typeof data !== "object") {
      throw new Error("Guest query returned an invalid result");
    }

    return data as GuestListResult;
  },
});

Deno.serve(handler);
