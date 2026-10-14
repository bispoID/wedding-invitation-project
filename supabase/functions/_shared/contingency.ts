import {
  appendContingencyRsvp as appendGoogleContingencyRsvp,
  deleteContingencyRow as deleteGoogleContingencyRow,
  readContingencyRows as readGoogleContingencyRows,
  type ContingencyRow,
  type ContingencyRsvp,
} from "./google-sheets.ts";

export type { ContingencyRow, ContingencyRsvp };

export interface ContingencyProvider {
  append(record: ContingencyRsvp): Promise<void>;
  read(): Promise<ContingencyRow[]>;
  delete(rowNumber: number): Promise<void>;
}

/** Falha normalizada para diferenciar configuração e operações do provider. */
export class ContingencyProviderError extends Error {
  constructor(
    readonly provider: "local" | "google-sheets",
    readonly operation: "append" | "read" | "delete" | "configuration",
  ) {
    super(`Contingency ${provider} provider failed`);
    this.name = "ContingencyProviderError";
  }
}

const REQUEST_TIMEOUT_MS = 12_000;

function requireLocalEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new ContingencyProviderError("local", "configuration");
  return value;
}

/** Executa chamada autenticada ao sidecar de contingência no DEV local. */
async function localRequest(
  path: string,
  init: RequestInit,
  operation: "append" | "read" | "delete",
): Promise<Response> {
  const baseUrl = requireLocalEnv("LOCAL_CONTINGENCY_URL").replace(/\/$/, "");
  const token = requireLocalEnv("LOCAL_CONTINGENCY_TOKEN");

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "X-Dev-Contingency-Token": token,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });

    if (!response.ok) throw new Error("provider_http_error");
    return response;
  } catch {
    throw new ContingencyProviderError("local", operation);
  }
}

/** Adapta o protocolo HTTP do sidecar à interface usada pelos handlers. */
function createLocalProvider(): ContingencyProvider {
  return {
    async append(record) {
      await localRequest("/records", {
        method: "POST",
        body: JSON.stringify(record),
      }, "append");
    },
    async read() {
      const response = await localRequest("/records", { method: "GET" }, "read");
      try {
        const body = await response.json() as { records?: unknown };
        if (!Array.isArray(body.records)) throw new Error("invalid_response");
        return body.records.map((record) => {
          if (typeof record !== "object" || record === null) {
            throw new Error("invalid_record");
          }
          const value = record as Record<string, unknown>;
          return {
            rowNumber: Number(value.rowNumber),
            requestId: String(value.request_id ?? ""),
            createdAt: String(value.created_at ?? ""),
            name: String(value.name ?? ""),
            email: String(value.email ?? ""),
            attendance: value.attendance,
            companions: value.companions,
            status: String(value.status ?? ""),
            errorType: String(value.error_type ?? ""),
            syncedAt: String(value.synced_at ?? ""),
          } satisfies ContingencyRow;
        });
      } catch {
        throw new ContingencyProviderError("local", "read");
      }
    },
    async delete(rowNumber) {
      await localRequest(`/records/row/${encodeURIComponent(String(rowNumber))}`, {
        method: "DELETE",
      }, "delete");
    },
  };
}

/**
 * Seleciona o provider por ambiente. DEV exige o sidecar local; uma seleção
 * `local` fora de DEV é rejeitada para impedir escrita acidental no provider
 * usado pelos ambientes publicados.
 */
export function getContingencyProvider(): ContingencyProvider {
  const appEnv = Deno.env.get("APP_ENV")?.trim().toLowerCase();
  const configuredProvider = Deno.env.get("CONTINGENCY_PROVIDER")?.trim().toLowerCase();

  if (appEnv === "dev") {
    if (configuredProvider !== "local") {
      throw new ContingencyProviderError("local", "configuration");
    }
    return createLocalProvider();
  }

  if (configuredProvider === "local") {
    throw new ContingencyProviderError("local", "configuration");
  }

  return {
    append: appendGoogleContingencyRsvp,
    read: readGoogleContingencyRows,
    delete: deleteGoogleContingencyRow,
  };
}
