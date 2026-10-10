import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../invite-app/scripts/event-config.js', import.meta.url), 'utf8');
let sequence = 0;
async function module() {
  const code = source.replace("import { FUNCTIONS_BASE_URL } from './shared/app-config.js';", "const FUNCTIONS_BASE_URL='https://example.invalid/functions/v1/';") + `\n// instance ${sequence++}`;
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}
const fixture = {
  bride_name: '<img src=x onerror=alert(1)>', groom_name: 'Pessoa sintética',
  event_date: '2030-02-28', event_time: '12:30', city: 'Cidade sintética', state: 'Estado sintético',
  ceremony_name: 'Cerimônia sintética', ceremony_address: null, ceremony_maps_url: null,
  reception_name: null, reception_address: null, reception_city: null, reception_state: null, reception_maps_url: null,
};
const valid = () => Response.json({ success: true, config: fixture });
class Element {
  constructor(dataset = {}) { this.dataset = dataset; this.hidden = false; this.attrs = {}; this.textContent = ''; }
  setAttribute(name, value) { this.attrs[name] = value; }
  removeAttribute(name) { delete this.attrs[name]; if (name === 'src') delete this.src; if (name === 'href') delete this.href; }
  set innerHTML(_) { throw new Error('Unsafe DOM insertion'); }
}
function root() {
  const state = new Element({ eventState: 'loading' });
  const status = new Element();
  const genericTitle = 'Um convite especial — Nosso Dia ♡';
  const ogTitle = new Element();
  const twitterTitle = new Element();
  ogTitle.setAttribute('content', genericTitle);
  twitterTitle.setAttribute('content', genericTitle);
  const ownerDocument = {
    title: genericTitle,
    querySelector: (selector) => ({
      'meta[property="og:title"]': ogTitle,
      'meta[name="twitter:title"]': twitterTitle,
    })[selector] ?? null,
  };
  const fields = Object.fromEntries([...Object.keys(fixture), 'location', 'reception_location', 'date_month', 'date_day', 'date_year'].map((key) => [key, new Element({ eventField: key })]));
  const optional = Object.fromEntries(['ceremony_address', 'reception_name', 'reception_address', 'reception_location'].map((key) => [key, new Element({ eventOptional: key })]));
  const map = new Element({ eventMap: 'ceremony_maps_url' });
  const receptionMap = new Element({ eventMap: 'reception_maps_url' });
  const events = [];
  return { state, status, fields, optional, map, receptionMap, events, ownerDocument, ogTitle, twitterTitle,
    querySelector: () => state,
    querySelectorAll: (selector) => ({
      '[data-event-status]': [status], '[data-event-field]': Object.values(fields),
      '[data-event-optional]': Object.values(optional), '[data-event-map]': [map, receptionMap],
    })[selector] ?? [],
    dispatchEvent: (event) => { events.push(event.type); },
  };
}
async function withFetch(fetcher, run) {
  const previous = { fetch: globalThis.fetch, CustomEvent: globalThis.CustomEvent };
  let calls = 0;
  globalThis.fetch = (...args) => { calls++; return fetcher(...args); };
  globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
  try { await run(await module(), () => calls); } finally { Object.assign(globalThis, previous); }
}
test('event config shares exact promise and performs only one GET, including repeated initialization', async () => {
  await withFetch(async (url, options) => {
    assert.equal(url, 'https://example.invalid/functions/v1/event-config');
    assert.equal(options.method, 'GET'); assert.equal(options.cache, 'no-store');
    return valid();
  }, async (api, calls) => {
    const first = api.loadEventConfig();
    assert.equal(api.loadEventConfig(), first);
    await Promise.all([first, api.initEventConfig(root()), api.initEventConfig(root())]);
    assert.equal(calls(), 1);
  });
});
test('event config loading precedes response; ready uses textContent and dispatches update', async () => {
  let resolve;
  await withFetch(() => new Promise((done) => { resolve = done; }), async (api) => {
    const dom = root(); const pending = api.initEventConfig(dom);
    assert.equal(dom.state.dataset.eventState, 'loading'); assert.equal(dom.state.attrs['aria-busy'], 'true');
    assert.equal(dom.fields.bride_name.textContent, '');
    resolve(valid()); await pending;
    assert.equal(dom.state.dataset.eventState, 'ready'); assert.equal(dom.status.hidden, true);
    assert.equal(dom.fields.bride_name.textContent, fixture.bride_name);
    assert.deepEqual(dom.events, ['invitation:content-updated']);
    assert.equal(dom.state.attrs['aria-busy'], 'false');
  });
});
test('event config success updates document and social titles from the validated names', async () => {
  await withFetch(async () => valid(), async (api) => {
    const dom = root();
    await api.initEventConfig(dom);
    const expected = api.buildInvitationTitle(fixture);
    assert.equal(dom.ownerDocument.title, expected);
    assert.equal(dom.ogTitle.attrs.content, expected);
    assert.equal(dom.twitterTitle.attrs.content, expected);
  });
});
test('invitation title falls back when either name is missing', async () => {
  const api = await module();
  assert.equal(api.buildInvitationTitle({ bride_name: 'NOME_FIXTURE_A' }), api.DEFAULT_INVITATION_TITLE);
  assert.equal(api.buildInvitationTitle({ groom_name: 'NOME_FIXTURE_B' }), api.DEFAULT_INVITATION_TITLE);
});
test('event config 404 contract produces not-configured without fallback', async () => {
  await withFetch(async () => Response.json({ success: false, error: 'EVENT_CONFIG_NOT_FOUND' }, { status: 404 }), async (api, calls) => {
    const dom = root(); await api.initEventConfig(dom); await api.loadEventConfig();
    assert.equal(dom.state.dataset.eventState, 'not-configured'); assert.equal(dom.status.hidden, false);
    assert.equal(dom.fields.bride_name.textContent, ''); assert.equal(calls(), 1);
  });
});
test('event config failure preserves the generic document and social titles', async () => {
  await withFetch(async () => new Response(null, { status: 503 }), async (api) => {
    const dom = root();
    await api.initEventConfig(dom);
    assert.equal(dom.ownerDocument.title, api.DEFAULT_INVITATION_TITLE);
    assert.equal(dom.ogTitle.attrs.content, api.DEFAULT_INVITATION_TITLE);
    assert.equal(dom.twitterTitle.attrs.content, api.DEFAULT_INVITATION_TITLE);
  });
});
for (const status of [401, 500, 503]) test(`event config HTTP ${status} error, no second fetch`, async () => {
  await withFetch(async () => new Response(null, { status }), async (api, calls) => {
    const dom = root(); await api.initEventConfig(dom); await api.initEventConfig(dom);
    assert.equal(dom.state.dataset.eventState, 'error'); assert.equal(calls(), 1);
    assert.equal(dom.fields.bride_name.textContent, '');
  });
});
test('event config network error is generic', async () => {
  await withFetch(async () => { throw new Error('private backend detail'); }, async (api) => {
    const dom = root(); await api.initEventConfig(dom);
    assert.equal(dom.state.dataset.eventState, 'error'); assert.doesNotMatch(dom.status.textContent, /private/);
  });
});
test('event config timeout aborts its only request and clears timer', async () => {
  const oldSet = globalThis.setTimeout, oldClear = globalThis.clearTimeout;
  let expire, cleared = false;
  globalThis.setTimeout = (callback, ms) => { assert.equal(ms, 12000); expire = callback; return 123; };
  globalThis.clearTimeout = (id) => { assert.equal(id, 123); cleared = true; };
  try {
    await withFetch((_, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('timeout')))), async (api) => {
      const dom = root(); const pending = api.initEventConfig(dom); expire(); await pending;
      assert.equal(dom.state.dataset.eventState, 'error'); assert.ok(cleared);
    });
  } finally { globalThis.setTimeout = oldSet; globalThis.clearTimeout = oldClear; }
});
for (const payload of [null, {}, { success: false, config: fixture }, { success: true, config: [] }, { success: true, config: { bride_name: 'A' } }]) {
  test('event config invalid payload ' + JSON.stringify(payload).slice(0, 40), async () => {
    await withFetch(async () => Response.json(payload), async (api) => {
      const dom = root(); await api.initEventConfig(dom); assert.equal(dom.state.dataset.eventState, 'error');
    });
  });
}
for (const field of Object.keys(fixture)) test(`event config requires field ${field}`, async () => {
  const api = await module(); const config = { ...fixture }; delete config[field];
  assert.throws(() => api.validateConfig({ success: true, config }));
});
test('event config optional null hides corresponding content and both maps', async () => {
  await withFetch(async () => valid(), async (api) => {
    const dom = root(); await api.initEventConfig(dom);
    assert.ok(Object.values(dom.optional).every((element) => element.hidden));
    assert.equal(dom.map.hidden, true); assert.equal(dom.map.href, undefined);
    assert.equal(dom.receptionMap.hidden, true); assert.equal(dom.receptionMap.href, undefined);
  });
});
test('event config both HTTPS maps, reception and geographic location are safe', async () => {
  await withFetch(async () => valid(), async (api) => {
    const dom = root(); api.applyEventConfig(dom, { ...fixture, ceremony_address: 'Synthetic address', ceremony_maps_url: 'https://example.invalid/maps', reception_name: 'Synthetic reception', reception_address: null, reception_maps_url: 'https://example.invalid/reception-map' });
    assert.equal(dom.map.href, 'https://example.invalid/maps'); assert.equal(dom.map.rel, 'noopener noreferrer');
    assert.equal(dom.optional.reception_name.hidden, false); assert.equal(dom.optional.reception_address.hidden, true);
    assert.equal(dom.receptionMap.href, 'https://example.invalid/reception-map');
    assert.equal(dom.receptionMap.target, '_blank'); assert.equal(dom.receptionMap.rel, 'noopener noreferrer');
    assert.equal(dom.fields.location.textContent, `${fixture.city} · ${fixture.state}`);
    assert.equal(dom.events.length, 1);
    api.applyEventConfig(dom, fixture);
    assert.equal(dom.receptionMap.hidden, true); assert.equal(dom.receptionMap.href, undefined);
    assert.equal(dom.map.href, undefined);
  });
});
for (const url of ['http://example.invalid/a', 'javascript:alert(1)', 'https://user:pass@example.invalid/a', 'https:///example.invalid', 'https://example.invalid/a b', 'https://example.invalid/%bad%']) test('event config rejects unsafe URL ' + url, async () => {
  const api = await module(); assert.equal(api.isHttpsUrl(url), false);
  assert.throws(() => api.validateConfig({ success: true, config: { ...fixture, reception_maps_url: url } }));
});
test('event config rejects reception address without name', async () => {
  const api = await module(); assert.throws(() => api.validateConfig({ success: true, config: { ...fixture, reception_address: 'Synthetic' } }));
});
test('civil date is arithmetic, no timezone shift; valid leap years and HH:mm preserved', async () => {
  const api = await module();
  assert.deepEqual(api.formatCivilDate('2030-01-01'), { date_month: 'Janeiro', date_day: '1', date_year: '2030' });
  assert.equal(api.formatCivilDate('2000-02-29').date_day, '29');
  for (const value of ['1900-02-29', '2030-02-30', '0000-01-01', '2030-13-01']) assert.throws(() => api.formatCivilDate(value));
  assert.equal(api.validateConfig({ success: true, config: fixture }).event_time, '12:30');
  assert.throws(() => api.validateConfig({ success: true, config: { ...fixture, event_time: '12:30:00' } }));
});
test('integration preserves devmode and independent RSVP; generic metadata and no personal fallback', async () => {
  const main = await readFile(new URL('../invite-app/scripts/main.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../invite-app/index.html', import.meta.url), 'utf8');
  assert.match(main, /initRsvp\(\);/); assert.match(main, /void initEventConfig\(\);/);
  assert.match(main, /\['cover', 'envelope-card', 'letter'\]/);
  assert.match(html, /Um convite especial/);
  assert.doesNotMatch(html, /NOME_FIXTURE_A|NOME_FIXTURE_B|CIDADE_FIXTURE|LOCAL_FIXTURE|ENDERECO_FIXTURE/);
  assert.match(html, /__PUBLIC_SITE_URL__/); assert.match(html, /__PUBLIC_SHARE_IMAGE_URL__/);
  assert.doesNotMatch(source, /innerHTML|localStorage|sessionStorage|service_role/);
});

test('final contract has 14 fields, no remote monogram, optional map without address', async () => {
  const api = await module();
  assert.equal(api.EVENT_FIELDS.length, 14);
  assert.deepEqual(api.EVENT_FIELDS, Object.keys(fixture));
  assert.ok(!api.EVENT_FIELDS.includes('monogram_url'));
  for (const value of [null, '', '   ', 'https://example.invalid/map']) {
    const result = api.validateConfig({ success: true, config: { ...fixture, reception_maps_url: value } });
    assert.equal(result.reception_maps_url, value?.trim() || null);
    assert.equal(Object.keys(result).length, 14);
  }
});
test('static monogram occupies its original two slots and share preview is the supplied WebP', async () => {
  const html = await readFile(new URL('../invite-app/index.html', import.meta.url), 'utf8');
  const preparer = await readFile(new URL('./prepare-static-site.mjs', import.meta.url), 'utf8');
  assert.equal((html.match(/src="\.\/images\/monograma_bd\.webp"/g) ?? []).length, 2);
  for (const slot of ['envelope__card-monogram', 'letter__monogram']) {
    assert.match(html, new RegExp('class="' + slot + '"\\s+src="\\./images/monograma_bd\\.webp"'));
  }
  assert.doesNotMatch(html + source, /data-event-monogram|event-monogram-fallback|share-preview\.jpeg/);
  assert.match(preparer, /images\/preview-link\.webp/);
  assert.match(html, /og:image:type" content="image\/webp"/);
  assert.match(html, /og:image:width" content="661"/);
  assert.match(html, /og:image:height" content="879"/);
  assert.ok((await readFile(new URL('../invite-app/images/monograma_bd.webp', import.meta.url))).length > 0);
  assert.ok((await readFile(new URL('../invite-app/images/preview-link.webp', import.meta.url))).length > 0);
});

for (const [city, state, expected] of [
  [null, null, ''], ['Cidade independente', null, 'Cidade independente'],
  [null, 'UF', 'UF'], ['Cidade independente', 'UF', 'Cidade independente · UF'],
]) test('reception location is independent, with no orphan separator: ' + expected, async () => {
  await withFetch(async () => valid(), async (api) => {
    const dom = root();
    api.applyEventConfig(dom, { ...fixture, reception_name: 'Recepção sintética', reception_city: city, reception_state: state, event_time: '17:00' });
    assert.equal(dom.fields.reception_location.textContent, expected);
    assert.equal(dom.optional.reception_location.hidden, !expected);
    assert.equal(dom.fields.location.textContent, fixture.city + ' · ' + fixture.state);
    assert.equal(dom.fields.event_time.textContent, '17:00');
    assert.equal(dom.optional.reception_name.hidden, false);
    api.applyEventConfig(dom, fixture);
    assert.equal(dom.optional.reception_name.hidden, true);
    assert.equal(dom.fields.reception_location.textContent, '');
    assert.equal(dom.optional.reception_location.hidden, true);
  });
});
for (const [field, limit] of [['reception_city', 150], ['reception_state', 100]]) {
  test('public reception field validates normalization, type and boundaries: ' + field, async () => {
    const api = await module();
    for (const value of [null, '', '   ', ' Valor válido ', '😀'.repeat(limit)]) {
      const parsed = api.validateConfig({ success: true, config: { ...fixture, [field]: value } });
      assert.equal(parsed[field], value?.trim() || null);
    }
    for (const value of [undefined, 1, false, {}, [], 'a'.repeat(limit + 1)]) {
      assert.throws(() => api.validateConfig({ success: true, config: { ...fixture, [field]: value } }));
    }
  });
}
