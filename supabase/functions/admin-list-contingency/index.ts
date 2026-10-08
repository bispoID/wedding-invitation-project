import { createClient } from "@supabase/supabase-js";
import { parseAdminUserIds } from "../_shared/admin-auth.ts";
import {
  GoogleSheetsError,
  readContingencyRows,
} from "../_shared/google-sheets.ts";
import { createListHandler } from "./handler.ts";

const REQUEST_TIMEOUT_MS = 12_000;

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

const handler = createListHandler({
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
  async listRows() {
    try {
      return await readContingencyRows();
    } catch (error) {
      if (error instanceof GoogleSheetsError) {
        console.error("Google Sheets list read failed", {
          reason: error.reason,
          status: error.status ?? null,
          columns: error.columns,
        });
      } else {
        console.error("Google Sheets list read failed", {
          reason: "unexpected_error",
        });
      }
      throw error;
    }
  },
});

Deno.serve(handler);
