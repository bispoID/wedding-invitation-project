// Asserções locais sem SDK, rede ou dependências de tipos Node.
function check(condition: boolean): asserts condition {
  if (!condition) throw new Error("Assertion failed");
}
function matches(error: unknown, expected: unknown): void {
  if (typeof expected === "function") {
    if (expected === TypeError) check(error instanceof TypeError);
    else check(expected(error));
  } else {
    for (
      const [key, value] of Object.entries(expected as Record<string, unknown>)
    ) {
      check((error as Record<string, unknown>)[key] === value);
    }
  }
}
const assert = {
  equal: (actual: unknown, expected: unknown) => check(actual === expected),
  notEqual: (actual: unknown, expected: unknown) => check(actual !== expected),
  deepEqual: (actual: unknown, expected: unknown) =>
    check(JSON.stringify(actual) === JSON.stringify(expected)),
  throws(action: () => unknown, expected: unknown) {
    try {
      action();
    } catch (error) {
      matches(error, expected);
      return;
    }
    throw new Error("Expected rejection");
  },
  async rejects(action: Promise<unknown>, expected: unknown) {
    try {
      await action;
    } catch (error) {
      matches(error, expected);
      return;
    }
    throw new Error("Expected rejection");
  },
};

import {
  adminClientOptions,
  configuredOrigins,
  fetchWithTimeout,
  requireEnv,
} from "./admin-runtime.ts";

Deno.test("required env preserves missing errors and nonempty values", () => {
  for (const value of [undefined, ""]) {
    assert.throws(() => requireEnv("SYNTHETIC_KEY", () => value), {
      message: "SYNTHETIC_KEY is not configured",
    });
  }
  assert.equal(requireEnv("SYNTHETIC_KEY", () => "  value  "), "  value  ");
  assert.equal(requireEnv("SYNTHETIC_KEY", () => " "), " ");
});

Deno.test("admin origins retain CSV order, whitespace handling and duplicates", () => {
  assert.deepEqual(
    configuredOrigins(() =>
      " https://panel.invalid , http://localhost:8000,https://panel.invalid "
    ),
    ["https://panel.invalid", "http://localhost:8000", "https://panel.invalid"],
  );
});

Deno.test("admin origins fail closed without changing error categories", () => {
  for (const value of [undefined, ""]) {
    assert.throws(() => configuredOrigins(() => value), {
      message: "ADMIN_ALLOWED_ORIGINS is not configured",
    });
  }
  for (
    const value of ["*", " ", "https://panel.invalid,", "null", "not-a-url"]
  ) {
    assert.throws(() => configuredOrigins(() => value), TypeError);
  }
  for (
    const value of [
      "https://panel.invalid/",
      "https://panel.invalid/path",
      "https://panel.invalid?q=1",
      "https://panel.invalid#hash",
      "https://user:pass@panel.invalid",
      "ftp://panel.invalid",
      "https://PANEL.invalid",
      "https://panel.invalid:443",
    ]
  ) {
    assert.throws(() => configuredOrigins(() => value), {
      message: "ADMIN_ALLOWED_ORIGINS contains an invalid origin",
    });
  }
});

Deno.test("client options are fresh, stateless and use the supplied transport", () => {
  const fake: typeof fetch = () => Promise.resolve(new Response());
  const first = adminClientOptions(fake);
  const second = adminClientOptions(fake);
  assert.deepEqual(first, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fake },
  });
  assert.equal(first.global.fetch, fake);
  assert.notEqual(first.auth, second.auth);
  assert.notEqual(first.global, second.global);
  assert.equal(adminClientOptions().global.fetch, fetchWithTimeout);
});

Deno.test("timeout transport preserves input, options and response with a 12s default", async () => {
  const original = AbortSignal.timeout;
  const delays: number[] = [];
  const deadline = new AbortController();
  AbortSignal.timeout = (ms) => {
    delays.push(ms);
    return deadline.signal;
  };
  try {
    const request = new Request("https://synthetic.invalid");
    const init = {
      method: "POST",
      headers: { "x-test": "synthetic" },
      body: "payload",
    };
    const response = new Response("synthetic");
    const result = await fetchWithTimeout(request, init, (input, received) => {
      assert.equal(input, request);
      assert.deepEqual(received, { ...init, signal: deadline.signal });
      return Promise.resolve(response);
    });
    assert.equal(result, response);
    assert.deepEqual(delays, [12_000]);
    assert.equal("signal" in init, false);
    await fetchWithTimeout(request, undefined, (_input, received) => {
      assert.equal(received?.signal, deadline.signal);
      return Promise.resolve(response);
    });
  } finally {
    AbortSignal.timeout = original;
  }
});

const pendingFetch: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    const signal = init!.signal!;
    if (signal.aborted) reject(signal.reason);
    else {signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      });}
  });

Deno.test("caller cancellation before and during fetch preserves the reason", async () => {
  for (const abortBefore of [true, false]) {
    const controller = new AbortController();
    const reason = new Error("synthetic cancellation");
    if (abortBefore) controller.abort(reason);
    const request = fetchWithTimeout("https://synthetic.invalid", {
      signal: controller.signal,
    }, pendingFetch);
    const rejection = assert.rejects(
      request,
      (error: unknown) => error === reason,
    );
    if (!abortBefore) controller.abort(reason);
    await rejection;
  }
});

Deno.test("timeout aborts fetch with or without an original signal", async () => {
  for (const signal of [undefined, new AbortController().signal]) {
    await assert.rejects(
      fetchWithTimeout(
        "https://synthetic.invalid",
        { signal },
        pendingFetch,
        5,
      ),
      { name: "TimeoutError" },
    );
    if (signal) assert.equal(signal.aborted, false);
  }
});

Deno.test("transport propagates fetch failures unchanged", async () => {
  const error = new Error("synthetic fetch failure");
  await assert.rejects(
    fetchWithTimeout(
      "https://synthetic.invalid",
      {},
      () => Promise.reject(error),
    ),
    (received: unknown) => received === error,
  );
});
