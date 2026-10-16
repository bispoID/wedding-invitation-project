import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initInvitationNames } from '../invite-app/scripts/shared/invitation-names.js';

const load = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const LONG_NAMES = [
  'NOME_FIXTURE_A_LONGO',
  'NOME_FIXTURE_B_LONGO',
];
const eventSource = (await load('invite-app/scripts/event-config.js'))
  .replaceAll("./shared/invitation-title.js", new URL("../invite-app/scripts/shared/invitation-title.js", import.meta.url).href)
  .replace("import { FUNCTIONS_BASE_URL } from './shared/app-config.js';", "const FUNCTIONS_BASE_URL = 'https://example.invalid/functions/v1/';");
const { applyEventConfig } = await import('data:text/javascript;base64,' + Buffer.from(eventSource).toString('base64'));

// Layout/font metrics are modeled deliberadamente; não são aceite visual em navegador.
async function withNames(options, run) {
  const globals = ['window', 'document', 'CustomEvent', 'fetch'];
  const previous = globals.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  const width = options.viewport ?? 390;
  const state = {
    letterWidth: (width - 32) * 0.74 - 2,
    letterSize: (width - 32) * 0.12,
    factor: 0.36, ...options,
  };
  const frames = new Map(), events = {}, documentEvents = {}, fontEvents = {};
  const probes = [], snapshots = [], resizeObservers = [], mutationObservers = [], queries = [];
  let frameId = 0, frameRuns = 0;
  const classes = (initial = []) => {
    const values = new Set(initial), changes = [];
    return {
      changes, contains: (value) => values.has(value),
      remove: (value) => values.delete(value),
      toggle(value, enabled) {
        if (values.has(value) !== enabled) changes.push([value, enabled]);
        if (enabled) values.add(value); else values.delete(value);
      },
      copy: () => [...values],
    };
  };
  const names = options.names ?? ['AAA', 'BBBB'];
  const span = (textContent, field) => ({ textContent, style: {}, dataset: field ? { eventField: field } : {} });
  const containers = {}, titles = {};
  function makeTitle(kind, children, probe = false) {
    return {
      children, style: {}, attrs: { id: 'letter-title', tabindex: '-1' },
      classList: classes(),
      querySelectorAll: (selector) => selector === '.script-name' ? children : [],
      get scrollWidth() {
        assert.equal(probe, true, 'Only the invisible original composition is measured');
        if (state.throwProbe === kind) throw new Error('Synthetic measurement failure');
        const length = children.reduce((sum, child) => sum + [...child.textContent].length, 0) + 2;
        return Math.ceil(state[kind + 'NaturalWidth'] ?? length * state[kind + 'Size'] * state.factor);
      },
      removeAttribute(name) { delete this.attrs[name]; },
      setAttribute(name, value) { this.attrs[name] = value; },
      cloneNode(deep) {
        assert.equal(deep, true);
        const copy = makeTitle(kind, children.map((child) => ({ ...child, style: {}, dataset: { ...child.dataset } })), true);
        copy.classList = classes(this.classList.copy());
        Object.assign(copy.style, this.style);
        return copy;
      },
      remove() { probes.splice(probes.indexOf(this), 1); },
    };
  }
  const kind = 'letter';
  titles[kind] = makeTitle(kind, [span(names[0], 'bride_name'), span('&'), span(names[1], 'groom_name')]);
  const section = { kind };
  containers[kind] = {
    section, classList: classes(),
    get clientWidth() { return state[kind + 'Width']; },
    querySelector: () => state[kind + 'MissingTitle'] ? null : titles[kind],
    closest(selector) { assert.equal(selector, '.welcome, .letter'); return section; },
    appendChild(probe) {
      probes.push(probe);
      snapshots.push({ kind, attrs: { ...probe.attrs }, style: { ...probe.style },
        wrapped: probe.classList.contains('has-long-names'), spans: probe.children });
    },
  }
  const metric = (container) => {
    const kind = container.section.kind;
    return `${container.clientWidth}:${titles[kind].classList.contains('has-long-names')}`;
  };
  class ResizeObserver {
    constructor(callback) { this.callback = callback; this.targets = new Map(); resizeObservers.push(this); }
    observe(target) { this.targets.set(target, metric(target)); }
    deliver() {
      let changed = false;
      for (const [target, old] of this.targets) {
        const current = metric(target);
        if (old !== current) { changed = true; this.targets.set(target, current); }
      }
      if (changed) this.callback();
    }
  }
  class MutationObserver {
    constructor(callback) { this.callback = callback; this.targets = []; mutationObservers.push(this); }
    observe(target, options) {
      assert.deepEqual(options, { attributes: true, attributeFilter: ['hidden'] });
      this.targets.push(target);
    }
  }
  globalThis.window = {
    addEventListener: (name, callback) => { events[name] = callback; },
    requestAnimationFrame(callback) { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame: (id) => frames.delete(id),
    ...(options.noObservers ? {} : { ResizeObserver, MutationObserver }),
  };
  globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
  globalThis.fetch = () => { throw new Error('No network in names tests'); };
  globalThis.document = {
    querySelector(selector) {
      queries.push(selector);
      return selector === '.letter__header' ? (state.letterMissing ? null : containers.letter) : null;
    },
    querySelectorAll: (selector) => selector === '[data-event-field]'
      ? Object.values(titles).flatMap((title) => title.children.filter((child) => child.dataset.eventField)) : [],
    addEventListener: (name, callback) => { documentEvents[name] = callback; },
    dispatchEvent: (event) => { documentEvents[event.type]?.(event); return true; },
    ...(options.noFonts ? {} : { fonts: { ready: Promise.resolve(),
      addEventListener: (name, callback) => { fontEvents[name] = callback; } } }),
  };
  const ui = {
    state, titles, containers, probes, snapshots, events, fontEvents, queries, frames,
    resizeObservers, mutationObservers,
    setNames(values) {
      for (const title of Object.values(titles)) {
        title.children[0].textContent = values[0]; title.children[2].textContent = values[1];
      }
      documentEvents['invitation:content-updated']?.();
    },
    frameRuns: () => frameRuns,
    flush(limit = 10) {
      let iterations = 0;
      while (frames.size) {
        assert.ok(++iterations <= limit, 'Names measurement must settle');
        const callbacks = [...frames.values()]; frames.clear();
        callbacks.forEach((callback) => { frameRuns++; callback(); });
        resizeObservers.forEach((observer) => observer.deliver());
      }
    },
  };
  try {
    initInvitationNames();
    await Promise.resolve();
    await run(ui);
  } finally {
    frames.clear();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

for (const viewport of [320, 390]) for (const names of [['AAA', 'BBBB'], ['A B', 'C D']]) {
  test(`Letter preserves fitting short/compound names at ${viewport}px: ${names.join(' & ')}`, async () => {
    await withNames({ viewport, names }, async (ui) => {
      ui.flush();
      for (const title of Object.values(ui.titles)) {
        assert.equal(title.classList.contains('has-long-names'), false);
        assert.deepEqual(title.style, {});
      }
      assert.deepEqual(ui.queries, ['.letter__header']);
    });
  });
}

for (const viewport of [320, 390]) for (const names of [LONG_NAMES, ['A'.repeat(60), 'B'.repeat(55)]]) {
  test(`Letter activates bounded wrapping at ${viewport}px for ${names === LONG_NAMES ? 'long names' : 'unbroken words'}`, async () => {
    await withNames({ viewport, names }, async (ui) => {
      const children = [...ui.titles.letter.children];
      ui.flush();
      const title = ui.titles.letter;
      assert.equal(title.classList.contains('has-long-names'), true);
      assert.deepEqual(title.children, children);
      assert.deepEqual(title.children.map((child) => child.textContent), [names[0], '&', names[1]]);
      assert.deepEqual(title.style, {});
      assert.equal(ui.probes.length, 0);
    });
  });
}

test('Long to short to long content updates restore the letter state', async () => {
  await withNames({ names: LONG_NAMES }, async (ui) => {
    ui.flush(); ui.setNames(['AAA', 'BBBB']); ui.flush();
    ui.setNames(LONG_NAMES); ui.flush();
    assert.equal(ui.titles.letter.classList.contains('has-long-names'), true);
  });
});

test('The hidden letter defers measurement and recalculates when its section is shown', async () => {
  await withNames({ names: LONG_NAMES, letterWidth: 0 }, async (ui) => {
    ui.flush();
    assert.equal(ui.titles.letter.classList.contains('has-long-names'), false);
    assert.equal(ui.snapshots.length, 0);
    ui.state.letterWidth = 260;
    ui.mutationObservers[0].callback(); ui.flush();
    assert.equal(ui.titles.letter.classList.contains('has-long-names'), true);
    assert.equal(ui.probes.length, 0);
  });
});

test('Resize, fonts and load events recompute without accumulating inline styles or frame loops', async () => {
  await withNames({}, async (ui) => {
    ui.flush();
    ui.state.factor = 1;
    ui.fontEvents.loadingdone(); ui.events.resize(); ui.events.load();
    assert.equal(ui.frames.size, 1); ui.flush();
    for (let count = 0; count < 20; count++) {
      ui.resizeObservers[0].callback(); ui.flush();
    }
    assert.equal(ui.titles.letter.classList.changes.length, 1);
    assert.equal(ui.probes.length, 0);
  });
});

test('Measurement probes do not duplicate IDs, expose a focus target or retain wrapped styles', async () => {
  await withNames({ names: LONG_NAMES }, async (ui) => {
    ui.flush(); ui.events.resize(); ui.flush();
    for (const { attrs, style, spans, wrapped } of ui.snapshots) {
      assert.equal(attrs.id, undefined); assert.equal(attrs.tabindex, undefined);
      assert.equal(attrs['aria-hidden'], 'true'); assert.equal(wrapped, false);
      assert.equal(style.position, 'absolute'); assert.equal(style.visibility, 'hidden');
      assert.equal(style.pointerEvents, 'none'); assert.equal(style.width, 'max-content');
      assert.ok(spans.every((span) => span.style.whiteSpace === 'nowrap'));
    }
    assert.equal(ui.titles.letter.attrs.id, 'letter-title');
    assert.equal(ui.titles.letter.attrs.tabindex, '-1');
  });
});

test('Measurement errors still remove the invisible probe', async () => {
  await withNames({ throwProbe: 'letter' }, async (ui) => {
    assert.throws(() => ui.flush(), /Synthetic measurement failure/);
    assert.equal(ui.probes.length, 0);
  });
});

test('Partial documents and missing optional browser APIs remain safe', async () => {
  await withNames({ names: LONG_NAMES, noObservers: true, noFonts: true }, async (ui) => {
    ui.flush(); assert.equal(ui.titles.letter.classList.contains('has-long-names'), true);
  });
  await withNames({ letterMissing: true }, async (ui) => {
    assert.equal(ui.frames.size, 0);
  });
});

test('Existing Event Config DOM updates trigger typography without changing its contract or fetching', async () => {
  await withNames({}, async (ui) => {
    ui.flush();
    applyEventConfig(globalThis.document, { bride_name: LONG_NAMES[0], groom_name: LONG_NAMES[1],
      event_date: '2028-02-29', city: 'Cidade sintética', state: 'UF' });
    ui.flush();
    assert.equal(ui.titles.letter.classList.contains('has-long-names'), true);
  });
});

test('Letter fallback is bounded and flows vertically before the unchanged ornament', async () => {
  const css = await load('invite-app/styles/letter/letter.css');
  assert.match(css, /\.letter h2\s*\{[^}]*font-size:\s*12cqw;[^}]*white-space:\s*nowrap;/);
  assert.match(css, /#letter-title\.has-long-names\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*100%;[^}]*min-width:\s*0;[^}]*font-size:\s*clamp\(1\.5rem, 8cqw, 2\.75rem\);[^}]*line-height:\s*1\.35;[^}]*white-space:\s*normal;/);
  assert.match(css, /#letter-title\.has-long-names \.script-name\s*\{[^}]*display:\s*block;[^}]*overflow-wrap:\s*anywhere;/);
  assert.match(css, /\.ornament\s*\{[^}]*margin:\s*5cqw\s+auto\s+5cqw;/);
});

test('C2 CSS is scoped to the letter state and preserves ordered spans and decorations', async () => {
  const css = await load('invite-app/styles/letter/letter.css');
  for (const [, selector, declarations] of css.matchAll(/([^{}]+has-long-names[^{}]*)\{([^}]*)\}/g)) {
    const ruleSelector = selector.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    assert.match(ruleSelector, /^#letter-title\.has-long-names/);
    assert.doesNotMatch(declarations, /animation|transition|transform|position:\s*absolute|display:\s*none|text-overflow/);
  }
  assert.doesNotMatch(css, /(?:^|})\s*\.script-name\s*\{/);
  const html = await load('invite-app/index.html');
  const heading = html.match(/<h2\s+id="letter-title"[^>]*>([\s\S]*?)<\/h2>/)?.[1];
  assert.ok(heading);
  const spans = [...heading.matchAll(/<span\s+([^>]*)>([^]*?)<\/span>/g)];
  assert.equal(spans.length, 3);
  assert.match(spans[0][1], /data-event-field="bride_name"/);
  assert.match(spans[1][1], /script-name--amp/); assert.equal(spans[1][2], '&amp;');
  assert.match(spans[2][1], /data-event-field="groom_name"/);
  for (const decoration of ['letter__monogram', 'class="ornament"']) {
    assert.ok(html.includes(decoration));
  }
  const source = await load('invite-app/scripts/shared/invitation-names.js');
  assert.doesNotMatch(source, /welcome-title|fetch\(|textContent\s*=|innerHTML|\.focus\(|preventDefault/);
  const main = await load('invite-app/scripts/main.js');
  assert.match(main, /initWelcomeTypography\(\);\s*initInvitationNames\(\);\s*initRsvp\(\);/);
});
