import {
  createHealthDependencies,
  createHealthHandler,
} from "./handler.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

function makeReadOnlyClient(
  result: { data: boolean | null; error: unknown | null },
): {
  client: Parameters<typeof createHealthDependencies>[0];
  calls: string[];
} {
  const calls: string[] = [];
  return {
    client: {
      rpc(functionName) {
        calls.push(functionName);
        return Promise.resolve(result);
      },
    },
    calls,
  };
}

async function readBody(response: Response): Promise<string> {
  return await response.text();
}

function assertNoSensitiveContent(body: string): void {
  for (const forbidden of [
    "SUPABASE_SERVICE_ROLE_KEY",
    "https://bkkienyemqlkueygknzl.supabase.co",
    "guest@example.com",
    "Convidado",
    "postgres",
    "INTERNAL_RPC_ERROR",
  ]) {
    assert(!body.includes(forbidden), `Leaked value: ${forbidden}`);
  }
}

Deno.test("GET saudavel retorna HTTP 200 e resposta agregada", async () => {
  const { client, calls } = makeReadOnlyClient({ data: true, error: null });
  const handler = createHealthHandler(createHealthDependencies(client));
  const response = await handler(new Request("https://edge.test/health"));

  assertEquals(response.status, 200, "Healthy status");
  assertEquals(await readBody(response), '{"status":"healthy"}', "Healthy body");
  assertEquals(response.headers.get("Cache-Control"), "no-store", "Cache-Control");
  assertEquals(response.headers.get("Content-Type"), "application/json", "Content-Type");
  assertEquals(calls.length, 1, "Expected one read-only RPC");
  assertEquals(calls[0], "check_rsvp_health", "Health RPC name");
});

Deno.test("HEAD saudavel retorna HTTP 200 sem corpo e com headers", async () => {
  const { client, calls } = makeReadOnlyClient({ data: true, error: null });
  const handler = createHealthHandler(createHealthDependencies(client));
  const response = await handler(new Request("https://edge.test/health", { method: "HEAD" }));

  assertEquals(response.status, 200, "Healthy HEAD status");
  assertEquals(await readBody(response), "", "HEAD body");
  assertEquals(response.headers.get("Cache-Control"), "no-store", "HEAD Cache-Control");
  assertEquals(response.headers.get("Content-Type"), "application/json", "HEAD Content-Type");
  assertEquals(calls[0], "check_rsvp_health", "HEAD health RPC name");
});

Deno.test("GET com RPC retornando false retorna HTTP 503", async () => {
  const { client } = makeReadOnlyClient({ data: false, error: null });
  const handler = createHealthHandler(createHealthDependencies(client));
  const response = await handler(new Request("https://edge.test/health"));

  assertEquals(response.status, 503, "Unhealthy GET status");
  assertEquals(await readBody(response), '{"status":"unhealthy"}', "Unhealthy GET body");
});

Deno.test("HEAD com RPC retornando false retorna HTTP 503 sem corpo", async () => {
  const { client } = makeReadOnlyClient({ data: false, error: null });
  const handler = createHealthHandler(createHealthDependencies(client));
  const response = await handler(new Request("https://edge.test/health", { method: "HEAD" }));

  assertEquals(response.status, 503, "Unhealthy HEAD status");
  assertEquals(await readBody(response), "", "Unhealthy HEAD body");
  assertEquals(response.headers.get("Cache-Control"), "no-store", "Unhealthy HEAD Cache-Control");
});

Deno.test("GET com erro no RPC retorna HTTP 503 sem detalhes internos", async () => {
  const handler = createHealthHandler({
    checkRsvpPrerequisites: async () => {
      throw new Error("INTERNAL_RPC_ERROR");
    },
  });
  const response = await handler(new Request("https://edge.test/health"));
  const body = await readBody(response);

  assertEquals(response.status, 503, "RPC error GET status");
  assertEquals(body, '{"status":"unhealthy"}', "RPC error GET body");
  assertNoSensitiveContent(body);
});

Deno.test("HEAD com erro no RPC retorna HTTP 503 sem corpo", async () => {
  const handler = createHealthHandler({
    checkRsvpPrerequisites: async () => {
      throw new Error("INTERNAL_RPC_ERROR");
    },
  });
  const response = await handler(new Request("https://edge.test/health", { method: "HEAD" }));

  assertEquals(response.status, 503, "RPC error HEAD status");
  assertEquals(await readBody(response), "", "RPC error HEAD body");
  assertNoSensitiveContent(await readBody(response));
});

Deno.test("metodo diferente de GET e HEAD retorna HTTP 405", async () => {
  const { client } = makeReadOnlyClient({ data: true, error: null });
  const handler = createHealthHandler(createHealthDependencies(client));
  const response = await handler(new Request("https://edge.test/health", { method: "POST" }));

  assertEquals(response.status, 405, "Method status");
  assertEquals(await readBody(response), '{"error":"METHOD_NOT_ALLOWED"}', "Method body");
});

Deno.test("HEAD nao expoe secrets, URLs internas ou dados pessoais", async () => {
  const { client } = makeReadOnlyClient({ data: true, error: null });
  const handler = createHealthHandler(createHealthDependencies(client));
  const response = await handler(new Request("https://edge.test/health", { method: "HEAD" }));
  const body = await readBody(response);

  assertEquals(body, "", "HEAD body must be empty");
  assertNoSensitiveContent(body);
});

Deno.test("health check chama somente o RPC read-only", async () => {
  const { client, calls } = makeReadOnlyClient({ data: true, error: null });
  const handler = createHealthHandler(createHealthDependencies(client));

  await handler(new Request("https://edge.test/health"));
  await handler(new Request("https://edge.test/health", { method: "HEAD" }));

  assertEquals(calls.length, 2, "RPC call count");
  assertEquals(calls[0], "check_rsvp_health", "First RPC name");
  assertEquals(calls[1], "check_rsvp_health", "Second RPC name");
  assert(!calls.includes("consume_rsvp_rate_limit"), "Real rate limiter was called");
  assert(!calls.includes("INSERT") && !calls.includes("UPDATE") && !calls.includes("DELETE"), "Write operation was called");
});

Deno.test("respostas nao expoem secrets, URLs internas ou dados pessoais", async () => {
  const { client } = makeReadOnlyClient({ data: true, error: null });
  const handler = createHealthHandler(createHealthDependencies(client));
  const response = await handler(new Request("https://edge.test/health"));

  assertNoSensitiveContent(await readBody(response));
});
