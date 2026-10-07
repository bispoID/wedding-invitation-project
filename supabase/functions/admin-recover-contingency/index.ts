import { createClient } from "@supabase/supabase-js";
import {
  deleteContingencyRow,
  GoogleSheetsError,
  readContingencyRows,
} from "../_shared/google-sheets.ts";
import { createRecoveryHandler } from "./handler.ts";
import type {
  ContingencyRecord,
  GuestRecord,
  RecoveryDependencies,
} from "./recovery.ts";

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
  global: {
    fetch: fetchWithTimeout,
  },
});

const handler = createRecoveryHandler({
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
          return await readContingencyRows() as ContingencyRecord[];
        } catch (error) {
          if (error instanceof GoogleSheetsError) {
            console.error("Google Sheets read failed", {
              reason: error.reason,
              status: error.status ?? null,
              columns: error.columns,
            });
          } else {
            console.error("Google Sheets read failed", {
              reason: "unexpected_error",
            });
          }
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
        await deleteContingencyRow(rowNumber);
      },
    });
  },
});

Deno.serve(handler);
