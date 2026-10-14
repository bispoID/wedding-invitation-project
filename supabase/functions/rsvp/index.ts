import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getContingencyProvider } from "../_shared/contingency.ts";
import { notifyAdmin } from "./notify-admin.ts";
import { createRsvpHandler } from "./handler.ts";

// O IP bruto não é persistido: somente o hash estável chega à função de rate limit.
async function hashIp(ip: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Derive a stable rate-limit key without persisting the raw client IP.
  const data = new TextEncoder().encode(`${secret}:${ip}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Obtém o primeiro endereço do proxy para manter uma chave por cliente. */
function getClientIp(req: Request): string {
  // Use the first forwarded address as the client key for per-IP throttling.
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return "unknown";
}

/** Cria o cliente service role usado pelo RPC de rate limit e pelo insert. */
function client() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}
Deno.serve(createRsvpHandler({
  corsHeaders,
  async consumeRateLimit(req) {
    const ipHash = await hashIp(getClientIp(req));
    const { data, error } = await client().rpc("consume_rsvp_rate_limit", {
      p_ip_hash: ipHash,
    }).single();
    // Validate the RPC result shape without changing its counting/key contract.
    const rateLimit =
      typeof data === "object" && data !== null && "allowed" in data &&
        typeof data.allowed === "boolean"
        ? { allowed: data.allowed }
        : null;
    return { data: rateLimit, error };
  },
  async insertGuest(guest) {
    const { error } = await client().from("guests").insert(guest);
    return { error };
  },
  saveToContingency: getContingencyProvider().append,
  notifyAdmin,
}));
