import test from 'node:test';
import assert from 'node:assert/strict';
import { eventInstant, initCountdown, remainingUnits } from '../invite-app/scripts/letter/countdown.js';

const config = { event_date: '2031-03-01', event_time: '00:30' };
const target = Date.UTC(2031, 2, 1, 3, 30);

test('interpreta os campos civis em São Paulo em diferentes fusos do visitante', () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ['Asia/Tokyo', 'America/Los_Angeles', 'UTC']) {
      process.env.TZ = zone;
      assert.equal(eventInstant(config), target);
      assert.equal(eventInstant({ event_date: '2018-01-05', event_time: '00:30' }), Date.UTC(2018, 0, 5, 2, 30));
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test('transições por segundo, minuto, hora e dia', () => {
  for (const [ms, units] of [
    [90061000, [1, 1, 1, 1]], [86400000, [1, 0, 0, 0]], [86399000, [0, 23, 59, 59]],
    [3600000, [0, 1, 0, 0]], [3599000, [0, 0, 59, 59]], [60000, [0, 0, 1, 0]],
    [59000, [0, 0, 0, 59]], [1, [0, 0, 0, 1]], [-1, [0, 0, 0, 0]],
  ]) assert.deepEqual(remainingUnits(ms), units);
});

function view() {
  const fields = Array.from({ length: 4 }, () => ({ textContent: '' }));
  const timer = { hidden: false, querySelectorAll: () => fields };
  const status = { textContent: '' };
  const section = { hidden: true, querySelector: selector => selector.includes('timer') ? timer : status };
  const root = Object.assign(new EventTarget(), { querySelector: () => section });
  return { fields, section, status, timer, root };
}

test('retoma pelo relógio atual, encerra uma vez e não consulta a rede', t => {
  const { fields, root, timer, status } = view();
  let now = target - 61000;
  t.mock.method(Date, 'now', () => now);
  const interval = t.mock.method(globalThis, 'setInterval', () => 42);
  const clear = t.mock.method(globalThis, 'clearInterval', () => {});
  const fetch = t.mock.method(globalThis, 'fetch', () => assert.fail('consulta adicional'));
  initCountdown(config, root);
  initCountdown(config, root);
  assert.equal(interval.mock.callCount(), 1);
  const [tick, delay] = interval.mock.calls[0].arguments;
  assert.equal(delay, 1000);
  assert.deepEqual(fields.map(f => f.textContent), ['00', '00', '01', '01']);
  now += 1000;
  tick();
  assert.equal(fields[3].textContent, '00');
  now = target - 1500;
  root.dispatchEvent(new Event('visibilitychange'));
  assert.equal(fields[3].textContent, '02');
  now = target;
  tick();
  root.dispatchEvent(new Event('visibilitychange'));
  assert.deepEqual(clear.mock.calls.map(c => c.arguments), [[42]]);
  assert.equal(status.textContent, 'O grande dia chegou!');
  assert.equal(timer.hidden, true);
  assert.equal(fetch.mock.callCount(), 0);
});

test('configuração ausente e evento já alcançado não iniciam intervalo', t => {
  t.mock.method(globalThis, 'setInterval', () => assert.fail('intervalo inesperado'));
  for (const now of [target, target + 1234]) {
    const { root, status, section } = view();
    initCountdown(undefined, root);
    assert.equal(section.hidden, true);
    const clock = t.mock.method(Date, 'now', () => now);
    initCountdown(config, root);
    assert.equal(status.textContent, 'O grande dia chegou!');
    clock.mock.restore();
  }
});
