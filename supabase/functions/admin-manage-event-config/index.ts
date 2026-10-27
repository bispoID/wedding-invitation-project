import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import {
  createAdminAuthenticator,
  parseAdminUserIds,
} from "../_shared/admin-auth.ts";
import { createEventAdminHandler } from "./handler.ts";
import { EVENT_FIELDS } from "../_shared/event-validation.ts";

import {
  adminClientOptions,
  configuredOrigins,
  requireEnv,
} from "../_shared/admin-runtime.ts";

const supabaseUrl = requireEnv("SUPABASE_URL");
const publicKey = requireEnv("SUPABASE_ANON_KEY");
const adminUserIds = parseAdminUserIds(Deno.env.get("ADMIN_AUTH_USER_IDS"));

const authClient = createClient(supabaseUrl, publicKey, adminClientOptions());

const handler = createEventAdminHandler({
  allowedOrigins: configuredOrigins(),
  adminUserIds,
  authenticate: createAdminAuthenticator(authClient),
  createDependencies() {
    const serviceClient = createClient(
      supabaseUrl,
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      adminClientOptions(),
    );

    return {
      async read() {
        const { data, error } = await serviceClient.from("event_config")
          .select([...EVENT_FIELDS, "updated_at"].join(",")).eq("id", 1)
          .maybeSingle();
        if (error) throw new Error("DATABASE_ERROR");
        return data as Record<string, unknown> | null;
      },
      async upsert(config) {
        const { data, error } = await serviceClient.from("event_config")
          .upsert({ id: 1, ...config }, { onConflict: "id" })
          .select([...EVENT_FIELDS, "updated_at"].join(",")).single();
        if (error || !data) throw new Error("DATABASE_ERROR");
        return data as unknown as Record<string, unknown>;
      },
    };
  },
});

Deno.serve(handler);
