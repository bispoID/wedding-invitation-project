import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initWelcomeTypography } from '../invite-app/scripts/welcome/typography.js';
import { fitTextToContainer } from '../invite-app/scripts/shared/typography.js';

const LONG_NAMES = [
  'NOME_FIXTURE_A_LONGO',
  'NOME_FIXTURE_B_LONGO',
];
const eventSource = (await readFile(new URL('../invite-app/scripts/event-config.js', import.meta.url), 'utf8'))
  .replace("import { FUNCTIONS_BASE_URL } from './shared/app-config.js';", "const FUNCTIONS_BASE_URL = 'https://example.invalid/functions/v1/';");
const { applyEventConfig } = await import('data:text/javascript;base64,' + Buffer.from(eventSource).toString('base64'));

// Geometry is deliberately modeled: these tests are not browser/font visual acceptance.
async function withWelcomeTypography(options, run) {
  const globals = ['window', 'document', 'ResizeObserver', 'CustomEvent', 'fetch'];
  const previous = globals.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  const state = { width: 318, rootSize: 16, baseSize: 64, naturalWidthAt64: 280, ...options };
  const frames = new Map(), events = {}, documentEvents = {}, fontEvents = {}, observers = [];
  const probes = [], probeSnapshots = [], classChanges = [];
  let frameId = 0, frameRuns = 0, cloneCount = 0;
  const classes = new Set();
  const root = {};
  const eyebrow = { style: { fontSize: '' } };
  const copy = {
    get clientWidth() { return state.width; },
    classList: {
      contains: (name) => classes.has(name),
      add(name) { if (!classes.has(name)) classChanges.push(['add', name]); classes.add(name); },
      remove(name) { if (classes.has(name)) classChanges.push(['remove', name]); classes.delete(name); },
    },
    querySelector: (selector) => selector === '.eyebrow' ? eyebrow : null,
    appendChild(probe) {
      probe.parentNode = this; probes.push(probe);
      probeSnapshots.push({ attrs: { ...probe.attrs }, style: { ...probe.style } });
    },
  };
  const span = (textContent, field) => ({ textContent, dataset: field ? { eventField: field } : {},
    className: field ? 'script-name script-name--word' : 'script-name script-name--amp' });
  const names = options.names ?? ['Nome sintético', 'Outro nome sintético'];

  function makeTitle(children, isProbe = false) {
    return {
      children, style: { fontSize: '' }, attrs: { id: 'welcome-title' },
      get textContent() { return this.children.map((child) => child.textContent).join(' '); },
      get scrollWidth() {
        if (isProbe && state.failProbe) throw new Error('Synthetic measurement failure');
        if (!isProbe && classes.has('has-long-names')) return state.width;
        const size = parseFloat(this.style.fontSize) || state.baseSize;
        return Math.max(state.width, Math.ceil(state.naturalWidthAt64 * size / 64));
      },
      removeAttribute(name) { delete this.attrs[name]; },
      setAttribute(name, value) { this.attrs[name] = value; },
      cloneNode(deep) {
        assert.equal(deep, true);
        cloneCount++;
        const probe = makeTitle(this.children.map((child) => ({ ...child, dataset: { ...child.dataset } })), true);
        Object.assign(probe.style, this.style);
        return probe;
      },
      remove() { probes.splice(probes.indexOf(this), 1); this.parentNode = null; },
    };
  }
  const title = makeTitle([span(names[0], 'bride_name'), span('&'), span(names[1], 'groom_name')]);
  const fontSize = (element) => element === root ? state.rootSize :
    parseFloat(element.style.fontSize) || (element === eyebrow ? state.rootSize * 0.7 : state.baseSize);
  const metric = () => {
    const size = fontSize(title);
    const lines = classes.has('has-long-names')
      ? Math.ceil(state.naturalWidthAt64 * size / 64 / Math.max(1, state.width)) + 1 : 1;
    return `${state.width}:${size * lines * (classes.has('has-long-names') ? 1.4 : 0.9) + fontSize(eyebrow) * 1.4}`;
  };
  class FakeResizeObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { assert.equal(target, copy); this.last = metric(); }
    deliver() {
      const current = metric();
      if (current !== this.last) { this.last = current; this.callback(); }
    }
  }
  globalThis.ResizeObserver = FakeResizeObserver;
  globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
  globalThis.fetch = () => { throw new Error('No network in typography tests'); };
  globalThis.window = {
    getComputedStyle: (element) => ({ fontSize: `${fontSize(element)}px` }),
    ResizeObserver: FakeResizeObserver,
    addEventListener: (name, callback) => { events[name] = callback; },
    requestAnimationFrame: (callback) => { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame: (id) => frames.delete(id),
  };
  globalThis.document = {
    documentElement: root,
    querySelector: (selector) => selector === '.welcome__copy' ? copy : null,
    getElementById: (id) => id === 'welcome-title' ? title : null,
    addEventListener: (name, callback) => { documentEvents[name] = callback; },
    dispatchEvent: (event) => { documentEvents[event.type]?.(event); return true; },
    querySelectorAll: (selector) => selector === '[data-event-field]' ? title.children.filter((child) => child.dataset.eventField) : [],
    fonts: { ready: Promise.resolve(), addEventListener: (name, callback) => { fontEvents[name] = callback; } },
  };
  const ui = {
    state, title, eyebrow, copy, events, fontEvents, frames, probes, probeSnapshots, classChanges,
    contentUpdated: () => documentEvents['invitation:content-updated'](),
    forceObserver: () => observers[0].callback(),
    cloneCount: () => cloneCount,
    frameRuns: () => frameRuns,
    referenceFit() {
      const reference = { style: { fontSize: '' }, get scrollWidth() {
        return Math.max(state.width, Math.ceil(state.naturalWidthAt64 * (parseFloat(this.style.fontSize) || state.baseSize) / 64));
      } };
      fitTextToContainer(reference, copy);
      return reference.style.fontSize;
    },
    setNames(values, naturalWidthAt64) {
      title.children[0].textContent = values[0]; title.children[2].textContent = values[1];
      state.naturalWidthAt64 = naturalWidthAt64;
    },
    flush(limit = 10) {
      let count = 0;
      while (frames.size) {
        assert.ok(++count <= limit, 'Typography and ResizeObserver must settle');
        const callbacks = [...frames.values()]; frames.clear();
        callbacks.forEach((callback) => { frameRuns++; callback(); });
        observers.forEach((observer) => observer.deliver());
      }
    },
  };
  try {
    initWelcomeTypography();
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

for (const width of [248, 303, 318]) test(`Welcome short names preserve the original single-line fit at width=${width}`, async () => {
  await withWelcomeTypography({ width }, async (ui) => {
    ui.flush();
    assert.equal(ui.copy.classList.contains('has-long-names'), false);
    assert.equal(ui.title.style.fontSize, ui.referenceFit());
    assert.equal(parseFloat(ui.eyebrow.style.fontSize), parseFloat(ui.title.style.fontSize) * 0.1665987);
    assert.equal(ui.cloneCount(), 0);
    assert.deepEqual(ui.classChanges, []);
  });
});

test('Welcome medium names keep the original proportional reduction and eyebrow', async () => {
  await withWelcomeTypography({ naturalWidthAt64: 600 }, async (ui) => {
    ui.flush();
    assert.equal(ui.title.style.fontSize, ui.referenceFit());
    assert.ok(parseFloat(ui.title.style.fontSize) < 64);
    assert.equal(ui.copy.classList.contains('has-long-names'), false);
    assert.equal(parseFloat(ui.eyebrow.style.fontSize), parseFloat(ui.title.style.fontSize) * 0.1665987);
  });
});

for (const [naturalWidthAt64, wrapped] of [[848, false], [849, true]]) {
  test(`Welcome fallback boundary is strictly below the root-relative floor for width=${naturalWidthAt64}`, async () => {
    await withWelcomeTypography({ naturalWidthAt64 }, async (ui) => {
      ui.flush();
      assert.equal(ui.copy.classList.contains('has-long-names'), wrapped);
      assert.ok(parseFloat(ui.title.style.fontSize) >= 24);
    });
  });
}

for (const width of [248, 303, 318]) test(`Welcome long names use readable wrapped sizing at width=${width}`, async () => {
  await withWelcomeTypography({ width, names: LONG_NAMES, naturalWidthAt64: 2002 }, async (ui) => {
    const spans = [...ui.title.children];
    ui.flush();
    assert.equal(ui.copy.classList.contains('has-long-names'), true);
    assert.equal(parseFloat(ui.title.style.fontSize), Math.max(24, width * 0.08));
    assert.equal(ui.eyebrow.style.fontSize, '');
    assert.deepEqual(ui.title.children, spans);
    assert.deepEqual(ui.title.children.map((child) => child.textContent), [LONG_NAMES[0], '&', LONG_NAMES[1]]);
    assert.equal(ui.probes.length, 0);
    assert.deepEqual(ui.classChanges, [['add', 'has-long-names']]);
  });
});

test('Welcome wrapped desktop size follows geometry but is capped below the normal heading base', async () => {
  await withWelcomeTypography({ width: 720, baseSize: 163.2, naturalWidthAt64: 4000 }, async (ui) => {
    ui.flush();
    assert.equal(ui.copy.classList.contains('has-long-names'), true);
    assert.equal(ui.title.style.fontSize, '48px');
  });
});

test('Welcome fallback scales its legibility floor with the root font instead of fixed pixels', async () => {
  await withWelcomeTypography({ width: 176, rootSize: 32, baseSize: 128, naturalWidthAt64: 2002 }, async (ui) => {
    ui.flush();
    assert.equal(ui.copy.classList.contains('has-long-names'), true);
    assert.equal(ui.title.style.fontSize, '48px');
    assert.equal(ui.eyebrow.style.fontSize, '');
  });
});

for (const names of [
  LONG_NAMES,
  ['NOME_COMPOSTO_LONGO_A', 'NOME_COMPOSTO_LONGO_B'],
  ['A'.repeat(150), 'M'.repeat(150)],
]) test(`Welcome wrapping preserves complete ordered spans for ${names[0].slice(0, 24)}`, async () => {
  await withWelcomeTypography({ names, naturalWidthAt64: 3000 }, async (ui) => {
    const originalSpans = [...ui.title.children];
    ui.flush();
    assert.equal(ui.copy.classList.contains('has-long-names'), true);
    assert.deepEqual(ui.title.children.map((child) => child.textContent), [names[0], '&', names[1]]);
    assert.ok(ui.title.children.every((span, index) => span === originalSpans[index]));
    assert.equal(ui.title.attrs.id, 'welcome-title');
  });
});

test('Welcome long to short to long clears fallback state and restores the original eyebrow ratio', async () => {
  await withWelcomeTypography({ names: LONG_NAMES, naturalWidthAt64: 2002 }, async (ui) => {
    ui.flush();
    ui.setNames(['Nome sintético', 'Outro nome sintético'], 280);
    ui.contentUpdated(); ui.flush();
    assert.equal(ui.copy.classList.contains('has-long-names'), false);
    assert.equal(ui.title.style.fontSize, ui.referenceFit());
    assert.equal(parseFloat(ui.eyebrow.style.fontSize), parseFloat(ui.title.style.fontSize) * 0.1665987);
    ui.setNames(LONG_NAMES, 2002);
    ui.contentUpdated(); ui.flush();
    assert.equal(ui.copy.classList.contains('has-long-names'), true);
    assert.equal(ui.eyebrow.style.fontSize, '');
    assert.deepEqual(ui.classChanges, [['add', 'has-long-names'], ['remove', 'has-long-names'], ['add', 'has-long-names']]);
    assert.equal(ui.probes.length, 0);
  });
});

test('Welcome widening the viewport restores the normal desktop fit without stale wrapped metrics', async () => {
  await withWelcomeTypography({ names: LONG_NAMES, naturalWidthAt64: 2002 }, async (ui) => {
    ui.flush();
    ui.state.width = 1000; ui.state.baseSize = 163.2;
    ui.events.resize(); ui.flush();
    assert.equal(ui.copy.classList.contains('has-long-names'), false);
    assert.equal(ui.title.style.fontSize, ui.referenceFit());
    ui.state.width = 318; ui.state.baseSize = 64;
    ui.events.resize(); ui.flush();
    assert.equal(ui.copy.classList.contains('has-long-names'), true);
    assert.equal(ui.probes.length, 0);
  });
});

test('Welcome actual Event Config DOM updates trigger the hybrid fit without network or data changes', async () => {
  await withWelcomeTypography({}, async (ui) => {
    ui.flush();
    ui.state.naturalWidthAt64 = 2002;
    applyEventConfig(document, {
      bride_name: LONG_NAMES[0], groom_name: LONG_NAMES[1], event_date: '2030-06-20', event_time: '16:00',
      city: 'Cidade sintética', state: 'UF sintética', ceremony_name: 'Cerimônia sintética',
      ceremony_address: null, ceremony_maps_url: null, reception_name: null, reception_address: null,
      reception_city: null, reception_state: null, reception_maps_url: null,
    });
    assert.equal(ui.frames.size, 1);
    ui.flush();
    assert.equal(ui.copy.classList.contains('has-long-names'), true);
    assert.deepEqual(ui.title.children.map((child) => child.textContent), [LONG_NAMES[0], '&', LONG_NAMES[1]]);
  });
});

test('Welcome late font metrics trigger fallback after loadingdone', async () => {
  await withWelcomeTypography({ naturalWidthAt64: 600 }, async (ui) => {
    ui.flush();
    assert.equal(ui.copy.classList.contains('has-long-names'), false);
    ui.state.naturalWidthAt64 = 2002;
    ui.fontEvents.loadingdone(); ui.flush();
    assert.equal(ui.copy.classList.contains('has-long-names'), true);
  });
});

test('Welcome initialization, fonts.ready and load retain their coalesced scheduling', async () => {
  await withWelcomeTypography({}, async (ui) => {
    assert.equal(ui.frames.size, 1);
    ui.events.load();
    assert.equal(ui.frames.size, 1);
    ui.flush();
    assert.equal(ui.frames.size, 0);
  });
});

test('Welcome resize, content, font and observer triggers coalesce into a single unchanged update', async () => {
  await withWelcomeTypography({ naturalWidthAt64: 2002 }, async (ui) => {
    ui.flush();
    const before = ui.frameRuns();
    ui.events.resize(); ui.contentUpdated(); ui.fontEvents.loadingdone(); ui.forceObserver();
    assert.equal(ui.frames.size, 1);
    ui.flush();
    assert.equal(ui.frameRuns() - before, 1);
    assert.deepEqual(ui.classChanges, [['add', 'has-long-names']]);
  });
});

test('Welcome repeated observer updates do not alternate layouts or leak measurement nodes', async () => {
  await withWelcomeTypography({ naturalWidthAt64: 2002 }, async (ui) => {
    ui.flush();
    const size = ui.title.style.fontSize;
    for (let count = 0; count < 20; count++) {
      ui.forceObserver(); ui.flush();
      assert.equal(ui.title.style.fontSize, size);
      assert.equal(ui.probes.length, 0);
    }
    assert.deepEqual(ui.classChanges, [['add', 'has-long-names']]);
  });
});

test('Welcome hidden zero-width cover keeps a valid state and recalculates on return', async () => {
  await withWelcomeTypography({ naturalWidthAt64: 2002 }, async (ui) => {
    ui.flush();
    const size = ui.title.style.fontSize;
    ui.state.width = 0; ui.forceObserver(); ui.flush();
    assert.equal(ui.title.style.fontSize, size);
    assert.equal(ui.probes.length, 0);
    ui.state.width = 318; ui.forceObserver(); ui.flush();
    assert.equal(ui.copy.classList.contains('has-long-names'), true);
    assert.equal(ui.title.style.fontSize, size);
  });
});

test('Welcome invalid root metrics do not introduce NaN inline sizes', async () => {
  await withWelcomeTypography({ rootSize: NaN }, async (ui) => {
    ui.flush();
    assert.equal(ui.title.style.fontSize, '');
    assert.equal(ui.eyebrow.style.fontSize, '');
    assert.equal(ui.probes.length, 0);
  });
});

test('Welcome invisible measurement nodes are removed even if measurement fails', async () => {
  await withWelcomeTypography({ naturalWidthAt64: 2002 }, async (ui) => {
    ui.flush();
    ui.state.failProbe = true; ui.forceObserver();
    assert.throws(() => ui.flush(), /Synthetic measurement failure/);
    assert.equal(ui.probes.length, 0);
    assert.equal(ui.title.attrs.id, 'welcome-title');
  });
});

test('Welcome measuring the original line does not duplicate its ID or expose a visible accessible heading', async () => {
  await withWelcomeTypography({ naturalWidthAt64: 2002 }, async (ui) => {
    ui.flush();
    assert.ok(ui.probeSnapshots.length > 0);
    for (const { attrs, style } of ui.probeSnapshots) {
      assert.equal(attrs.id, undefined);
      assert.equal(attrs['aria-hidden'], 'true');
      assert.equal(style.position, 'absolute');
      assert.equal(style.visibility, 'hidden');
      assert.equal(style.pointerEvents, 'none');
      assert.equal(style.whiteSpace, 'nowrap');
    }
    assert.equal(ui.title.attrs.id, 'welcome-title');
    assert.equal(ui.title.attrs['aria-hidden'], undefined);
    assert.equal(ui.probes.length, 0);
  });
});

test('Welcome fallback CSS is scoped to the cover and supports readable natural wrapping without motion', async () => {
  const css = await readFile(new URL('../invite-app/styles/welcome/welcome.css', import.meta.url), 'utf8');
  const rules = [...css.matchAll(/([^{}]+has-long-names[^{}]*)\{([^}]*)\}/g)];
  assert.equal(rules.length, 4);
  for (const [_, selector, declarations] of rules) {
    assert.ok(selector.trim().endsWith('.eyebrow') || selector.includes('#welcome-title'));
    assert.ok(selector.includes('.welcome__copy.has-long-names'));
    assert.doesNotMatch(declarations, /animation|transition|display:\s*none|text-overflow|overflow:\s*hidden/);
  }
  assert.match(css, /\.welcome__copy\.has-long-names #welcome-title\s*\{\s*white-space: normal;\s*line-height: 1\.4;\s*transform: none;/);
  assert.match(css, /#welcome-title \.script-name\s*\{\s*display: block;\s*white-space: normal;\s*overflow-wrap: anywhere;\s*word-break: normal;/);
  assert.match(css, /#welcome-title \.script-name--amp\s*\{\s*font-size: 0\.75em;/);
  assert.match(css, /has-long-names \.eyebrow\s*\{[^}]*font-size: 0\.7rem;[^}]*letter-spacing: 0\.3em;[^}]*white-space: normal;/);
});
