import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createGuestListController,
  getGuestPagination,
  GUEST_SEARCH_DEBOUNCE_MS,
} from '../invite-app/admin/scripts/guest-list-controller.js';

const metrics = {
  totalGuests: 47,
  confirmedGuests: 32,
  declinedGuests: 15,
  totalCompanions: 21,
  confirmedPeople: 53,
};

const record = (id) => ({
  id,
  name: `Convidado sintético ${id}`,
  email: `${id}@example.invalid`,
  attendance: true,
  companions: 1,
  created_at: '2026-10-01T12:00:00.000Z',
});

function response(total, records = [], responseMetrics = metrics) {
  return { total, records, metrics: responseMetrics };
}

function fakeScheduler() {
  let nextId = 0;
  const timers = new Map();
  return {
    schedule(callback, delay) {
      const id = ++nextId;
      timers.set(id, { callback, delay });
      return id;
    },
    cancel(id) {
      timers.delete(id);
    },
    runNext() {
      const [id, timer] = timers.entries().next().value ?? [];
      assert.ok(timer, 'Expected a scheduled callback');
      timers.delete(id);
      timer.callback();
      return timer.delay;
    },
    size() {
      return timers.size;
    },
  };
}

test('pagination calculates range and page boundaries', () => {
  assert.deepEqual(getGuestPagination(47, 2, 10), {
    page: 2,
    pageSize: 10,
    total: 47,
    totalPages: 5,
    firstRecord: 11,
    lastRecord: 20,
  });
  assert.deepEqual(getGuestPagination(0, 1, 10), {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
    firstRecord: 0,
    lastRecord: 0,
  });
});

test('initial load returns a paged query and keeps global metrics', async () => {
  const requests = [];
  const states = [];
  const controller = createGuestListController({
    fetchGuests: async (query) => {
      requests.push(query);
      return response(47, [record('first')]);
    },
    onStateChange: (state) => states.push(state),
  });

  await controller.load();

  assert.deepEqual(requests, [{ page: 1, pageSize: 10, search: '' }]);
  assert.equal(controller.getState().pagination.totalPages, 5);
  assert.equal(controller.getState().metrics.totalGuests, 47);
  assert.equal(controller.getState().metrics.confirmedPeople, 53);
  assert.equal(states.at(-1).loading, false);
});

test('search is debounced, resets to page one, and preserves accented text', async () => {
  const scheduler = fakeScheduler();
  const requests = [];
  const controller = createGuestListController({
    fetchGuests: async (query) => {
      requests.push(query);
      return response(1, [record('search')]);
    },
    onStateChange() {},
    schedule: scheduler.schedule,
    cancelSchedule: scheduler.cancel,
  });

  await controller.load();
  await controller.setPage(1);
  controller.setSearch('  Árvore %_  ');

  assert.equal(scheduler.size(), 1);
  assert.equal(scheduler.runNext(), GUEST_SEARCH_DEBOUNCE_MS);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(requests.at(-1), { page: 1, pageSize: 10, search: 'Árvore %_' });
  assert.equal(controller.getState().page, 1);
});

test('stale responses cannot replace the latest search result', async () => {
  const scheduler = fakeScheduler();
  const pending = [];
  const controller = createGuestListController({
    fetchGuests: (query) => new Promise((resolve) => pending.push({ query, resolve })),
    onStateChange() {},
    schedule: scheduler.schedule,
    cancelSchedule: scheduler.cancel,
  });

  const firstLoad = controller.load();
  controller.setSearch('novo');
  scheduler.runNext();
  pending[1].resolve(response(1, [record('new') ]));
  await new Promise((resolve) => setImmediate(resolve));
  pending[0].resolve(response(1, [record('old')]));
  await Promise.all([firstLoad, new Promise((resolve) => setImmediate(resolve))]);

  assert.equal(controller.getState().records[0].id, 'new');
  assert.equal(controller.getState().search, 'novo');
});

test('page size resets to one and an emptied last page is corrected', async () => {
  const requests = [];
  const responses = [
    response(21, [record('page-1')]),
    response(21, [record('page-3')]),
    response(15, []),
    response(15, [record('page-2')]),
    response(15, [record('page-1-size-20')]),
  ];
  const controller = createGuestListController({
    fetchGuests: async (query) => {
      requests.push(query);
      return responses.shift();
    },
    onStateChange() {},
  });

  await controller.load();
  await controller.setPage(3);
  await controller.reload();
  await controller.setPageSize(20);

  assert.deepEqual(requests, [
    { page: 1, pageSize: 10, search: '' },
    { page: 3, pageSize: 10, search: '' },
    { page: 3, pageSize: 10, search: '' },
    { page: 2, pageSize: 10, search: '' },
    { page: 1, pageSize: 20, search: '' },
  ]);

  assert.equal(controller.getState().page, 1);
  assert.equal(controller.getState().pageSize, 20);
  assert.equal(controller.getState().records[0].id, 'page-1-size-20');
});

test('empty search results keep global metrics and errors expose retry state', async () => {
  let calls = 0;
  const states = [];
  const controller = createGuestListController({
    fetchGuests: async () => {
      calls++;
      if (calls === 1) return response(0, []);
      throw new Error('synthetic failure');
    },
    onStateChange: (state) => states.push(state),
  });

  await controller.load();
  assert.equal(controller.getState().total, 0);
  assert.equal(controller.getState().metrics.totalGuests, 47);
  await controller.reload();
  assert.equal(controller.getState().error.message, 'synthetic failure');
  assert.equal(states.at(-1).loading, false);
});

test('a reload that empties the current page is retried from page one', async () => {
  const requests = [];
  const responses = [
    response(21, [record('first-page')]),
    response(21, [record('last-page')]),
    response(0, []),
    response(0, []),
  ];
  const controller = createGuestListController({
    fetchGuests: async (query) => {
      requests.push(query);
      return responses.shift();
    },
    onStateChange() {},
  });

  await controller.load();
  await controller.setPage(3);
  await controller.reload();

  assert.equal(requests.at(-1).page, 1);
  assert.equal(controller.getState().pagination.page, 1);
  assert.equal(controller.getState().total, 0);
});

test('guest list controls expose search, page size, pagination and accessible retry markup', async () => {
  const html = await readFile(new URL('../invite-app/admin/index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../invite-app/admin/styles/dashboard.css', import.meta.url), 'utf8');

  assert.match(html, /id="guest-search"[\s\S]*placeholder="Pesquisar por nome ou e-mail\.\.\."/);
  assert.match(html, /id="guest-search-clear"[\s\S]*aria-label="Limpar pesquisa"/);
  assert.match(html, /id="guest-page-size"[\s\S]*aria-controls="guests-table-body"/);
  assert.match(html, /id="guests-retry"[\s\S]*Tentar novamente/);
  assert.match(html, /id="guests-pagination"[\s\S]*aria-label="Paginação de convidados"/);
  assert.match(css, /\.guests-list-toolbar\s*\{/);
  assert.match(css, /@media \(max-width: 720px\)/);
});

test('guest API encodes paginated search parameters and preserves response metadata', async () => {
  const source = await readFile(new URL('../invite-app/admin/scripts/guests.js', import.meta.url), 'utf8');
  const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(source.replace(
    'import { getSupabaseClient } from "./supabase.js";',
    'const getSupabaseClient = async () => globalThis.__syntheticSupabaseClient;',
  )).toString('base64');
  const previousClient = globalThis.__syntheticSupabaseClient;
  let receivedName;
  let receivedOptions;
  globalThis.__syntheticSupabaseClient = {
    functions: {
      invoke(name, options) {
        receivedName = name;
        receivedOptions = options;
        return Promise.resolve({
          data: { records: [record('api')], pagination: { total: 1 }, metrics },
          error: null,
        });
      },
    },
  };

  try {
    const { getGuests } = await import(moduleUrl);
    const result = await getGuests({ page: 2, pageSize: 20, search: 'Álvaro %_' });
    const url = new URL(`https://edge.test/${receivedName}`);
    assert.equal(url.searchParams.get('page'), '2');
    assert.equal(url.searchParams.get('page_size'), '20');
    assert.equal(url.searchParams.get('search'), 'Álvaro %_');
    assert.deepEqual(receivedOptions, { method: 'GET' });
    assert.deepEqual(result, { records: [record('api')], total: 1, metrics });
  } finally {
    globalThis.__syntheticSupabaseClient = previousClient;
  }
});
