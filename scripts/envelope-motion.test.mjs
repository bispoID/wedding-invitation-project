import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initEnvelope } from '../invite-app/scripts/welcome/envelope.js';
import {
  animateFloralSealExit,
  resetFloralSealAnimations,
} from '../invite-app/scripts/welcome/decorations.js';

const variables = await readFile(new URL('../invite-app/styles/base/variables.css', import.meta.url), 'utf8');
const tokens = Object.fromEntries([...variables.matchAll(/(--[\w-]+):\s*([^;]+);/g)]
  .map(([, name, value]) => [name, value.trim()]));

async function withEnvelopeMotion(reduced, run) {
  const names = ['window', 'document', 'getComputedStyle'];
  const previous = names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  const animations = [];
  const timers = new Map();
  const mediaQueries = [];
  const scrolls = [];
  let clock = 0, timerId = 0;

  function element(hidden = false) {
    const classes = new Set();
    return {
      hidden, style: {}, attrs: {}, events: {}, focusCalls: [],
      classList: {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        contains: (name) => classes.has(name),
      },
      setAttribute(name, value) { this.attrs[name] = value; },
      getAttribute(name) { return this.attrs[name]; },
      removeAttribute(name) { delete this.attrs[name]; },
      addEventListener(type, listener) { this.events[type] = listener; },
      focus(options) { this.focusCalls.push(options); },
    };
  }

  const welcome = element(), letter = element(true), seal = element();
  const backButton = element(), decorations = element(), letterTitle = element();
  const cardControl = element(true);
  const elements = { welcome, letter, seal, backButton, decorations, letterTitle, cardControl };
  const selectors = {
    '.welcome': welcome, '.letter': letter, '.envelope__seal': seal,
    '.back-to-cover': backButton, '.envelope__decorations': decorations,
    '.card-pause-control': cardControl,
  };
  letter.querySelector = (selector) => selector === '#letter-title' ? letterTitle : null;
  decorations.animate = (frames, options) => {
    const animation = { frames, options, cancelCalls: 0, cancel() { this.cancelCalls++; } };
    animations.push(animation);
    return animation;
  };
  globalThis.document = { documentElement: {}, querySelector: (selector) => selectors[selector] ?? null };
  globalThis.getComputedStyle = () => ({ getPropertyValue: (name) => tokens[name] ?? '' });
  globalThis.window = {
    matchMedia(query) {
      mediaQueries.push(query);
      assert.equal(query, '(prefers-reduced-motion: reduce)');
      return { matches: reduced };
    },
    setTimeout(callback, delay) {
      const id = ++timerId;
      timers.set(id, { callback, at: clock + delay });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    scrollTo: (options) => scrolls.push(options),
  };

  function advance(milliseconds) {
    const end = clock + milliseconds;
    for (;;) {
      const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      clock = next[1].at;
      timers.delete(next[0]);
      next[1].callback();
    }
    clock = end;
  }

  try {
    resetFloralSealAnimations();
    initEnvelope();
    await run({ ...elements, animations, timers, mediaQueries, scrolls, advance,
      setReduced(value) { reduced = value; } });
  } finally {
    resetFloralSealAnimations();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

test('Envelope no-preference preserves original floral-seal keyframes and timing', async () => {
  await withEnvelopeMotion(false, async (ui) => {
    animateFloralSealExit(ui.decorations);
    assert.equal(ui.animations.length, 1);
    assert.deepEqual(ui.animations[0].frames, [
      { transform: 'translate(0%, 0%) scale(1)' },
      { transform: 'translate(0%, 0%) scale(1.11)', offset: 0.3 },
      { transform: 'translate(32.5%, 25.5%) scale(1)', offset: 1 },
    ]);
    assert.deepEqual(ui.animations[0].options, {
      duration: 1800, easing: 'cubic-bezier(0.33, 0, 0.67, 1)', fill: 'both',
    });
    assert.deepEqual(ui.decorations.style, {});
  });
});

test('Envelope reduce does not create a decorative animation or hide the static group', async () => {
  await withEnvelopeMotion(true, async (ui) => {
    animateFloralSealExit(ui.decorations);
    assert.equal(ui.animations.length, 0);
    assert.deepEqual(ui.decorations.style, {});
    assert.equal(ui.decorations.hidden, false);
    assert.equal(ui.welcome.hidden, false);
    assert.deepEqual(ui.mediaQueries, ['(prefers-reduced-motion: reduce)']);
  });
});

test('Envelope preference is read on each opening and reduce cancels an earlier decoration animation', async () => {
  await withEnvelopeMotion(false, async (ui) => {
    animateFloralSealExit(ui.decorations);
    ui.setReduced(true);
    animateFloralSealExit(ui.decorations);
    assert.equal(ui.animations.length, 1);
    assert.equal(ui.animations[0].cancelCalls, 1);
    resetFloralSealAnimations();
    assert.equal(ui.animations[0].cancelCalls, 1);
    ui.setReduced(false);
    animateFloralSealExit(ui.decorations);
    assert.equal(ui.animations.length, 2);
    assert.deepEqual(ui.animations[1].frames, ui.animations[0].frames);
    assert.deepEqual(ui.animations[1].options, ui.animations[0].options);
  });
});

test('Envelope decoration reset remains idempotent and supports another normal opening', async () => {
  await withEnvelopeMotion(false, async (ui) => {
    animateFloralSealExit(ui.decorations);
    resetFloralSealAnimations();
    resetFloralSealAnimations();
    assert.equal(ui.animations[0].cancelCalls, 1);
    animateFloralSealExit(ui.decorations);
    assert.equal(ui.animations.length, 2);
  });
});

test('Envelope developer preview toggles the control label without starting the flow', async () => {
  await withEnvelopeMotion(false, async (ui) => {
    ui.cardControl.hidden = false;
    ui.cardControl.setAttribute('data-dev-preview', 'true');

    ui.cardControl.events.click();
    assert.equal(ui.cardControl.textContent, 'Continuar');
    assert.equal(ui.cardControl.attrs['data-card-symbol'], '▶');
    assert.equal(ui.cardControl.attrs['data-card-control-state'], 'continue');
    assert.equal(ui.cardControl.attrs['aria-label'], 'Continuar para a carta');
    assert.equal(ui.welcome.classList.contains('is-opening-card'), false);
    assert.equal(ui.letter.hidden, true);
    assert.equal(ui.timers.size, 0);

    ui.cardControl.events.click();
    assert.equal(ui.cardControl.textContent, 'Pausar');
    assert.equal(ui.cardControl.attrs['data-card-symbol'], '⏸');
    assert.equal(ui.cardControl.attrs['data-card-control-state'], 'pause');
    assert.equal(ui.cardControl.attrs['aria-label'], 'Pausar antes de abrir a carta');
    assert.equal(ui.timers.size, 0);
  });
});

for (const reduced of [false, true]) for (const trigger of ['click', 'Enter', ' ']) {
  test(`Envelope ${reduced ? 'reduce' : 'no-preference'} preserves opening, letter focus and return via ${trigger === ' ' ? 'Space' : trigger}`, async () => {
    await withEnvelopeMotion(reduced, async (ui) => {
      let prevented = 0;
      const activate = () => trigger === 'click' ? ui.seal.events.click()
        : ui.seal.events.keydown({ key: trigger, preventDefault() { prevented++; } });
      ui.seal.events.keydown({ key: 'Tab', preventDefault() { throw new Error('Tab must remain native'); } });
      assert.equal(ui.timers.size, 0);
      assert.equal(ui.welcome.hidden, false);
      assert.equal(ui.letter.hidden, true);
      activate();
      activate();
      assert.equal(ui.timers.size, 1, 'Repeated activation must not duplicate the opening');
      assert.equal(ui.seal.attrs['aria-disabled'], 'true');
      assert.equal(prevented, trigger === 'click' ? 0 : 2);
      ui.advance(599);
      assert.equal(ui.animations.length, 0);
      ui.advance(1);
      assert.equal(ui.welcome.classList.contains('is-opening-envelope'), true);
      assert.equal(ui.animations.length, reduced ? 0 : 1);
      assert.deepEqual(ui.decorations.style, {});
      assert.equal(ui.decorations.hidden, false);
      ui.advance(4699);
      assert.equal(ui.welcome.classList.contains('is-opening-card'), false);
      ui.advance(1);
      assert.equal(ui.welcome.classList.contains('is-opening-card'), true);
      assert.equal(ui.cardControl.hidden, false);
      assert.equal(ui.cardControl.textContent, 'Pausar');
      assert.equal(ui.cardControl.attrs['data-card-symbol'], '⏸');
      ui.advance(4799);
      assert.equal(ui.letter.hidden, true);
      ui.advance(1);
      assert.equal(ui.welcome.hidden, true);
      assert.equal(ui.letter.hidden, false);
      assert.equal(ui.cardControl.hidden, true);
      assert.equal(ui.letter.classList.contains('is-entering'), true);
      assert.deepEqual(ui.letterTitle.focusCalls, [{ preventScroll: true }]);
      assert.equal(ui.timers.size, 0);
      ui.backButton.events.click();
      assert.equal(ui.welcome.hidden, false);
      assert.equal(ui.letter.hidden, true);
      assert.equal(ui.welcome.classList.contains('is-opening-envelope'), false);
      assert.equal(ui.welcome.classList.contains('is-opening-card'), false);
      assert.equal(ui.letter.classList.contains('is-entering'), false);
      assert.equal(ui.cardControl.hidden, true);
      assert.equal(ui.cardControl.textContent, 'Pausar');
      assert.equal(ui.seal.attrs['aria-disabled'], undefined);
      assert.deepEqual(ui.seal.focusCalls, [{ preventScroll: true }]);
      assert.equal(ui.animations[0]?.cancelCalls ?? 0, reduced ? 0 : 1);
      activate();
      ui.advance(10100);
      assert.equal(ui.welcome.hidden, true);
      assert.equal(ui.letter.hidden, false);
      assert.equal(ui.animations.length, reduced ? 0 : 2);
      assert.equal(ui.letterTitle.focusCalls.length, 2);
      assert.equal(ui.timers.size, 0);
    });
  });
}

for (const reduced of [false, true]) {
  test(`Envelope ${reduced ? 'reduce' : 'no-preference'} wait pauses only the letter transition`, async () => {
    await withEnvelopeMotion(reduced, async (ui) => {
      ui.seal.events.click();
      ui.advance(600 + 4700);

      ui.cardControl.events.click();
      assert.equal(ui.cardControl.textContent, 'Continuar');
      assert.equal(ui.cardControl.attrs['data-card-symbol'], '▶');
      assert.equal(ui.cardControl.hidden, false);
      assert.equal(ui.welcome.classList.contains('is-opening-card'), true);

      ui.advance(3300);
      assert.equal(ui.letter.hidden, true);
      assert.equal(ui.cardControl.hidden, false);

      ui.advance(60000);
      assert.equal(ui.letter.hidden, true, 'The card must remain available without a timeout');

      ui.cardControl.events.click();
      assert.equal(ui.welcome.hidden, true);
      assert.equal(ui.letter.hidden, false);
      assert.equal(ui.cardControl.hidden, true);
      assert.equal(ui.timers.size, 0);
    });
  });
}

test('Envelope continue requested during card movement waits for its natural completion and ignores repeats', async () => {
  await withEnvelopeMotion(false, async (ui) => {
    ui.seal.events.click();
    ui.advance(600 + 4700);

    ui.cardControl.events.click();
    ui.cardControl.events.click();
    ui.cardControl.events.click();
    assert.equal(ui.letter.hidden, true);
    assert.equal(ui.cardControl.disabled, true);

    ui.advance(3299);
    assert.equal(ui.letter.hidden, true);
    ui.advance(1);
    assert.equal(ui.letter.hidden, false);
    assert.equal(ui.letterTitle.focusCalls.length, 1);

    ui.cardControl.events.click();
    assert.equal(ui.letterTitle.focusCalls.length, 1, 'Repeated continue must not reveal twice');
  });
});

test('Envelope wait near the automatic deadline prevents an old letter callback', async () => {
  await withEnvelopeMotion(false, async (ui) => {
    ui.seal.events.click();
    ui.advance(600 + 9499);
    assert.equal(ui.letter.hidden, true);

    ui.cardControl.events.click();
    ui.advance(1);
    assert.equal(ui.letter.hidden, true);
    ui.advance(60000);
    assert.equal(ui.letter.hidden, true);
  });
});

test('Envelope seal and flowers use static WebP assets and retain native keyboard and touch hooks', async () => {
  const html = await readFile(new URL('../invite-app/index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../invite-app/styles/welcome/envelope.css', import.meta.url), 'utf8');
  const welcomeCss = await readFile(new URL('../invite-app/styles/welcome/welcome.css', import.meta.url), 'utf8');
  const seal = html.match(/<img\b[^>]*class="envelope__seal"[^>]*>/)?.[0];
  assert.ok(seal);
  assert.match(seal, /role="button"/);
  assert.match(seal, /tabindex="0"/);
  assert.match(seal, /aria-label="[^"]+"/);
  assert.match(css, /\.envelope__seal:focus-visible\s*\{[^}]*outline:/);
  assert.match(css, /touch-action:\s*manipulation/);
  const pauseControl = html.match(/<button\b[^>]*class="card-pause-control"[^>]*>[\s\S]*?<\/button>/)?.[0];
  assert.ok(pauseControl);
  assert.match(pauseControl, /type="button"/);
  assert.match(pauseControl, /hidden/);
  assert.match(pauseControl, /data-card-symbol="⏸"/);
  assert.match(pauseControl, />\s*Pausar\s*</);
  assert.match(welcomeCss, /\.card-pause-control::after\s*\{[^}]*background:\s*linear-gradient/);
  assert.match(welcomeCss, /\.card-pause-control::after\s*\{[^}]*width:\s*2\.15cqw[^}]*height:\s*3cqw/);
  assert.match(welcomeCss, /\.card-pause-control::after\s*\{[^}]*transform:\s*translateY\(-0\.1cqw\)/);
  assert.match(welcomeCss, /\.card-pause-control\[data-card-symbol="▶"\]::after\s*\{[^}]*border-left:\s*2\.25cqw\s+solid\s+currentColor/);
  for (const file of ['flores_sempre_vivas.webp', 'selo_de_cera_carta_800x800.webp']) {
    assert.ok(html.includes(`src="./images/${file}"`));
    const bytes = await readFile(new URL('../invite-app/images/' + file, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const type = bytes.toString('ascii', offset, offset + 4);
      const size = bytes.readUInt32LE(offset + 4);
      assert.ok(!['ANIM', 'ANMF'].includes(type), `${file} must not contain animated WebP chunks`);
      offset += 8 + size + (size % 2);
    }
  }
});
