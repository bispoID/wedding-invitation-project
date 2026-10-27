import { createClient } from "@supabase/supabase-js";
import {
  createAdminAuthenticator,
  parseAdminUserIds,
} from "../_shared/admin-auth.ts";
import { createGuestAdminHandler } from "./handler.ts";

import {
  adminClientOptions,
  configuredOrigins,
  requireEnv,
} from "../_shared/admin-runtime.ts";

const supabaseUrl = requireEnv("SUPABASE_URL");
const publicKey = requireEnv("SUPABASE_ANON_KEY");
const adminUserIds = parseAdminUserIds(Deno.env.get("ADMIN_AUTH_USER_IDS"));

const authClient = createClient(supabaseUrl, publicKey, adminClientOptions());

const handler = createGuestAdminHandler({
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
