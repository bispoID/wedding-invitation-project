import { createClient } from "@supabase/supabase-js";
import {
  createAdminAuthenticator,
  parseAdminUserIds,
} from "../_shared/admin-auth.ts";
import { getContingencyProvider } from "../_shared/contingency.ts";
import { createListHandler } from "./handler.ts";

import {
  adminClientOptions,
  configuredOrigins,
  requireEnv,
} from "../_shared/admin-runtime.ts";

const supabaseUrl = requireEnv("SUPABASE_URL");
const publicKey = requireEnv("SUPABASE_ANON_KEY");
const adminUserIds = parseAdminUserIds(Deno.env.get("ADMIN_AUTH_USER_IDS"));

const authClient = createClient(supabaseUrl, publicKey, adminClientOptions());

const handler = createListHandler({
  allowedOrigins: configuredOrigins(),
  adminUserIds,
  authenticate: createAdminAuthenticator(authClient),
  async listRows() {
    try {
      return await getContingencyProvider().read();
    } catch (error) {
      console.error("Contingency list read failed", {
        reason: "provider_error",
      });
      throw error;
    }
  },
});

Deno.serve(handler);
