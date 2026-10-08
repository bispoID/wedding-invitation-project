import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createHealthDependencies,
  createHealthHandler,
  HealthDependencyError,
  type HealthDependencies,
  type ReadOnlySupabaseClient,
} from "./handler.ts";

function unavailableDependencies(
  dependency: string,
): HealthDependencies {
  return {
    checkRsvpPrerequisites: async () => {
      throw new HealthDependencyError(dependency);
    },
  };
}

function createDependencies(): HealthDependencies {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return unavailableDependencies("configuration");
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });

    return createHealthDependencies(
      supabase as unknown as ReadOnlySupabaseClient,
    );
  } catch {
    return unavailableDependencies("configuration");
  }
}

const handler = createHealthHandler(createDependencies());

Deno.serve(handler);
