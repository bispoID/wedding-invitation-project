import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { EVENT_FIELDS } from "../_shared/event-validation.ts";
import { createEventConfigHandler } from "./handler.ts";

Deno.serve(createEventConfigHandler(async () => {
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(12_000) }),
      },
    },
  );
  const { data, error } = await client.from("event_config").select(
    EVENT_FIELDS.join(","),
  ).eq("id", 1).maybeSingle();
  if (error) throw new Error("EVENT_CONFIG_UNAVAILABLE");
  return data as Record<string, unknown> | null;
}));
