/* O backend entrega data e hora civis já validadas. Usar as regras IANA de
 * São Paulo também contempla datas históricas em que houve horário de verão. */
const weddingClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo', hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});

export function eventInstant(config) {
  const civil = Date.parse(config.event_date + 'T' + config.event_time + ':00Z');
  let instant = civil;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = Object.fromEntries(weddingClock.formatToParts(instant).map(p => [p.type, p.value]));
    const local = Date.parse(parts.year.padStart(4, '0') + '-' + parts.month + '-' + parts.day
      + 'T' + parts.hour + ':' + parts.minute + ':' + parts.second + 'Z');
    if (local === civil) return instant;
    instant += civil - local;
  }
  return NaN; // Hora civil inexistente durante uma transição de fuso.
}

export function remainingUnits(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24,
    Math.floor(seconds / 60) % 60, seconds % 60];
}

export function initCountdown(config, root = document) {
  const section = root.querySelector('.countdown');
  if (!config || !section || !section.hidden) return;
  const target = eventInstant(config);
  if (!Number.isFinite(target)) return;

  const timer = section.querySelector('[role="timer"]');
  const status = section.querySelector('[role="status"]');
  const fields = timer.querySelectorAll('dd');
  let interval;
  function refresh() {
    const remaining = target - Date.now();
    if (remaining <= 0) {
      clearInterval(interval);
      root.removeEventListener('visibilitychange', refresh);
      timer.hidden = true;
      status.textContent = 'O grande dia chegou!';
      return;
    }
    remainingUnits(remaining).forEach((value, index) => {
      const text = String(value).padStart(2, '0');
      if (fields[index].textContent !== text) fields[index].textContent = text;
    });
  }

  section.hidden = false;
  refresh();
  if (!timer.hidden) {
    interval = setInterval(refresh, 1000);
    root.addEventListener('visibilitychange', refresh);
  }
}
