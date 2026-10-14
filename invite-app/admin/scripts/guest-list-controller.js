export const DEFAULT_GUEST_PAGE_SIZE = 10;
export const GUEST_PAGE_SIZES = [10, 20, 50];
export const GUEST_SEARCH_DEBOUNCE_MS = 300;

/** Valida inteiros usados no contrato de paginação e métricas. */
function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

/** Valida a forma mínima da resposta antes de alterar o estado da lista. */
function validateResponse(result) {
  if (!result || !Array.isArray(result.records)) {
    throw new Error('A função retornou uma lista de convidados inválida.');
  }

  if (!isNonNegativeInteger(result.total)) {
    throw new Error('A função retornou uma quantidade de convidados inválida.');
  }

  const metrics = result.metrics;
  const metricKeys = [
    'totalGuests',
    'confirmedGuests',
    'declinedGuests',
    'totalCompanions',
    'confirmedPeople',
  ];

  if (!metrics || metricKeys.some((key) => !isNonNegativeInteger(metrics[key]))) {
    throw new Error('A função retornou indicadores de convidados inválidos.');
  }

  return { records: result.records, total: result.total, metrics };
}

/** Calcula limites exibidos e total de páginas para uma resposta paginada. */
export function getGuestPagination(total, page, pageSize) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const currentPage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const firstRecord = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastRecord = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

  return { page: currentPage, pageSize, total, totalPages, firstRecord, lastRecord };
}

/**
 * Cria o estado assíncrono da lista de convidados.
 * Pesquisa é debounced; cada requisição recebe uma geração para que respostas
 * antigas não sobrescrevam resultados mais novos.
 */
export function createGuestListController({
  fetchGuests,
  onStateChange,
  debounceMs = GUEST_SEARCH_DEBOUNCE_MS,
  schedule = setTimeout,
  cancelSchedule = clearTimeout,
}) {
  let state = {
    page: 1,
    pageSize: DEFAULT_GUEST_PAGE_SIZE,
    search: '',
    records: [],
    total: 0,
    metrics: null,
    loading: false,
    loaded: false,
    error: null,
  };
  let scheduledSearch = null;
  let requestGeneration = 0;

  function snapshot() {
    return {
      ...state,
      pagination: getGuestPagination(state.total, state.page, state.pageSize),
    };
  }

  function emit() {
    onStateChange(snapshot());
  }

  function cancelSearch() {
    if (scheduledSearch !== null) {
      cancelSchedule(scheduledSearch);
      scheduledSearch = null;
    }
  }

  async function request() {
    cancelSearch();
    const generation = ++requestGeneration;
    const query = {
      page: state.page,
      pageSize: state.pageSize,
      search: state.search,
    };

    state = { ...state, loading: true, error: null };
    emit();

    try {
      const result = validateResponse(await fetchGuests(query));
      if (generation !== requestGeneration) return null;

      const pagination = getGuestPagination(result.total, state.page, state.pageSize);
      if (state.page !== pagination.page) {
        state = { ...state, page: pagination.page };
        return request();
      }

      state = {
        ...state,
        records: result.records,
        total: result.total,
        metrics: result.metrics,
        loading: false,
        loaded: true,
        error: null,
      };
      emit();
      return snapshot();
    } catch (error) {
      if (generation !== requestGeneration) return null;
      state = { ...state, loading: false, loaded: state.loaded, error };
      emit();
      return null;
    }
  }

  function setSearch(value) {
    const search = String(value ?? '').trim();
    if (search === state.search) return;

    cancelSearch();
    requestGeneration += 1;
    state = { ...state, page: 1, search, error: null };
    emit();
    scheduledSearch = schedule(() => {
      scheduledSearch = null;
      void request();
    }, debounceMs);
  }

  function setPage(page) {
    const nextPage = Number(page);
    const totalPages = getGuestPagination(state.total, state.page, state.pageSize).totalPages;
    if (!Number.isInteger(nextPage) || nextPage < 1 || (totalPages > 0 && nextPage > totalPages)) {
      return Promise.resolve(null);
    }

    if (nextPage === state.page) return Promise.resolve(snapshot());
    state = { ...state, page: nextPage };
    return request();
  }

  function setPageSize(pageSize) {
    const nextPageSize = Number(pageSize);
    if (!GUEST_PAGE_SIZES.includes(nextPageSize)) return Promise.resolve(null);

    if (nextPageSize === state.pageSize) return Promise.resolve(snapshot());
    state = { ...state, page: 1, pageSize: nextPageSize };
    return request();
  }

  return {
    getState: snapshot,
    load: request,
    reload: request,
    setSearch,
    setPage,
    setPageSize,
    destroy() {
      cancelSearch();
      requestGeneration += 1;
    },
  };
}
