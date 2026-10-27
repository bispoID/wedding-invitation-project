import { createClient } from "@supabase/supabase-js";
import {
  createAdminAuthenticator,
  parseAdminUserIds,
} from "../_shared/admin-auth.ts";
import { getContingencyProvider } from "../_shared/contingency.ts";
import { createRecoveryHandler } from "./handler.ts";
import type {
  ContingencyRecord,
  GuestRecord,
  RecoveryDependencies,
} from "./recovery.ts";

import {
  adminClientOptions,
  configuredOrigins,
  requireEnv,
} from "../_shared/admin-runtime.ts";

const supabaseUrl = requireEnv("SUPABASE_URL");
const publicKey = requireEnv("SUPABASE_ANON_KEY");
const adminUserIds = parseAdminUserIds(Deno.env.get("ADMIN_AUTH_USER_IDS"));

const authClient = createClient(supabaseUrl, publicKey, adminClientOptions());

const handler = createRecoveryHandler({
  allowedOrigins: configuredOrigins(),
  adminUserIds,
  authenticate: createAdminAuthenticator(authClient),
  createDependencies(): Promise<RecoveryDependencies> {
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const serviceClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      adminClientOptions(),
    );

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
          console.error("Contingency read failed", {
            reason: "provider_error",
          });
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
