export type HealthLogger = (
  event: string,
  details: { dependency: string },
) => void;

export interface HealthDependencies {
  checkRsvpPrerequisites: () => Promise<void>;
}

export interface ReadOnlySupabaseClient {
  rpc: (functionName: string) => Promise<{
    data: boolean | null;
    error: unknown | null;
  }>;
}

export class HealthDependencyError extends Error {
  constructor(readonly dependency: string) {
    super(`Health dependency failed: ${dependency}`);
    this.name = "HealthDependencyError";
  }
}

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function jsonResponse(
  body: Record<string, string>,
  status: number,
  includeBody = true,
): Response {
  return new Response(includeBody ? JSON.stringify(body) : null, {
    status,
    headers: jsonHeaders,
  });
}

export function createHealthDependencies(
  client: ReadOnlySupabaseClient,
): HealthDependencies {
  return {
    checkRsvpPrerequisites: async () => {
      const { data, error } = await client.rpc("check_rsvp_health");

      if (error || data !== true) {
        throw new HealthDependencyError("rsvp_prerequisites");
      }
    },
  };
}

export function createHealthHandler(
  dependencies: HealthDependencies,
  logger: HealthLogger = (event, details) => console.error(event, details),
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
    }

    try {
      await dependencies.checkRsvpPrerequisites();

      return jsonResponse(
        { status: "healthy" },
        200,
        request.method === "GET",
      );
    } catch (error) {
      const dependency = error instanceof HealthDependencyError
        ? error.dependency
        : "configuration";

      // Keep public responses generic. Logs contain only a stable dependency
      // label, never secrets, SQL details, stack traces, or guest data.
      logger("Health check failed", { dependency });

      return jsonResponse(
        { status: "unhealthy" },
        503,
        request.method === "GET",
      );
    }
  };
}
