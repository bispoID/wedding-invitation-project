import { createClient } from "@supabase/supabase-js";
import {
  createAdminAuthenticator,
  parseAdminUserIds,
} from "../_shared/admin-auth.ts";
import {
  createGuestListHandler,
  type GuestListQuery,
  type GuestListResult,
} from "./handler.ts";

import {
  adminClientOptions,
  configuredOrigins,
  requireEnv,
} from "../_shared/admin-runtime.ts";

const supabaseUrl = requireEnv("SUPABASE_URL");
const publicKey = requireEnv("SUPABASE_ANON_KEY");
const adminUserIds = parseAdminUserIds(Deno.env.get("ADMIN_AUTH_USER_IDS"));

const authClient = createClient(supabaseUrl, publicKey, adminClientOptions());

const handler = createGuestListHandler({
  allowedOrigins: configuredOrigins(),
  adminUserIds,
  authenticate: createAdminAuthenticator(authClient),
  async listGuests(query: GuestListQuery): Promise<GuestListResult> {
    const serviceClient = createClient(
      supabaseUrl,
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      adminClientOptions(),
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
