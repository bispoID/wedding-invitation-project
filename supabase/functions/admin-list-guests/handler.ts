import { isAuthorizedAdmin } from "../_shared/admin-auth.ts";

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const ALLOWED_PAGE_SIZES = [10, 20, 50] as const;
export const MAX_PAGE = 100_000;
export const MAX_SEARCH_LENGTH = 320;
export const ADMIN_GUEST_CACHE_CONTROL = "private, no-store";

export interface AdminGuestRecord {
  id: string;
  name: string;
  email: string;
  attendance: boolean;
  companions: number;
  created_at: string;
}

export interface GuestMetrics {
  totalGuests: number;
  confirmedGuests: number;
  declinedGuests: number;
  totalCompanions: number;
  confirmedPeople: number;
}

export interface GuestListQuery {
  page: number;
  pageSize: number;
  search: string;
  includeAll: boolean;
}

export interface GuestListResult {
  records: AdminGuestRecord[];
  total: number;
  metrics: GuestMetrics;
}

export interface GuestListHandlerOptions {
  allowedOrigins: string[];
  adminUserIds: ReadonlySet<string>;
  authenticate(request: Request): Promise<string | null>;
  listGuests(query: GuestListQuery): Promise<GuestListResult>;
}

function response(
  body: Record<string, unknown>,
  status: number,
  origin: string,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers":
        "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "600",
      "Cache-Control": ADMIN_GUEST_CACHE_CONTROL,
      "Vary": "Origin",
    },
  });
}

function errorResponse(
  code: string,
  status: number,
  origin: string,
): Response {
  const messages: Record<string, string> = {
    METHOD_NOT_ALLOWED: "Método não permitido.",
    INVALID_QUERY: "Parâmetros de pesquisa ou paginação inválidos.",
    UNAUTHORIZED: "Autenticação necessária ou inválida.",
    ADMIN_ACCESS_DENIED: "Usuário sem autorização administrativa.",
    GUEST_LIST_FAILED: "Não foi possível carregar os convidados.",
  };

  return response(
    {
      success: false,
      error: code,
      message: messages[code] ?? messages.GUEST_LIST_FAILED,
    },
    status,
    origin,
  );
}

function parsePositiveInteger(value: string | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parseGuestListQuery(request: Request): GuestListQuery | null {
  const url = new URL(request.url);
  const hasPagingOrSearch = ["page", "page_size", "search"].some((key) =>
    url.searchParams.has(key)
  );

  if (!hasPagingOrSearch) {
    return {
      page: DEFAULT_PAGE,
      pageSize: DEFAULT_PAGE_SIZE,
      search: "",
      includeAll: true,
    };
  }

  const pageValue = url.searchParams.get("page");
  const page = pageValue === null
    ? DEFAULT_PAGE
    : parsePositiveInteger(pageValue);
  const pageSizeValue = url.searchParams.get("page_size");
  const pageSize = pageSizeValue === null
    ? DEFAULT_PAGE_SIZE
    : parsePositiveInteger(pageSizeValue);
  const search = (url.searchParams.get("search") ?? "").trim();

  if (
    page === null ||
    page > MAX_PAGE ||
    pageSize === null ||
    !ALLOWED_PAGE_SIZES.includes(pageSize as typeof ALLOWED_PAGE_SIZES[number]) ||
    Array.from(search).length > MAX_SEARCH_LENGTH
  ) {
    return null;
  }

  return { page, pageSize, search, includeAll: false };
}

export function createGuestListHandler(
  options: GuestListHandlerOptions,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin");

    if (!origin || !options.allowedOrigins.includes(origin)) {
      return Response.json({
        success: false,
        error: "INVALID_ORIGIN",
        message: "Origem não autorizada.",
      }, {
        status: 403,
        headers: { "Cache-Control": ADMIN_GUEST_CACHE_CONTROL },
      });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Headers":
            "authorization, apikey, content-type, x-client-info",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Max-Age": "600",
          "Vary": "Origin",
        },
      });
    }

    if (request.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", 405, origin);
    }

    const query = parseGuestListQuery(request);
    if (!query) return errorResponse("INVALID_QUERY", 400, origin);

    let userId: string | null;
    try {
      userId = await options.authenticate(request);
    } catch {
      userId = null;
    }

    if (!userId) {
      return errorResponse("UNAUTHORIZED", 401, origin);
    }

    if (!isAuthorizedAdmin(userId, options.adminUserIds)) {
      return errorResponse("ADMIN_ACCESS_DENIED", 403, origin);
    }

    try {
      const result = await options.listGuests(query);
      const records = result.records.map((guest) => ({
        id: guest.id,
        name: guest.name,
        email: guest.email,
        attendance: guest.attendance,
        companions: guest.companions,
        created_at: guest.created_at,
      }));
      const responsePageSize = query.includeAll
        ? Math.max(result.total, 1)
        : query.pageSize;
      const totalPages = result.total === 0
        ? 0
        : Math.ceil(result.total / responsePageSize);

      return response({
        success: true,
        records,
        pagination: {
          page: query.includeAll ? DEFAULT_PAGE : query.page,
          page_size: responsePageSize,
          total: result.total,
          total_pages: totalPages,
        },
        metrics: result.metrics,
      }, 200, origin);
    } catch {
      console.error("Guest listing failed", { code: "GUEST_LIST_FAILED" });
      return errorResponse("GUEST_LIST_FAILED", 502, origin);
    }
  };
}
