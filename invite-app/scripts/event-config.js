import { FUNCTIONS_BASE_URL } from './shared/app-config.js';

export const EVENT_FIELDS = [
  'bride_name', 'groom_name', 'event_date', 'event_time', 'city', 'state',
  'ceremony_name', 'ceremony_address', 'ceremony_maps_url', 'reception_name',
  'reception_address', 'reception_city', 'reception_state', 'reception_maps_url',
];
const OPTIONAL = new Set(['ceremony_address', 'ceremony_maps_url', 'reception_name', 'reception_address', 'reception_city', 'reception_state', 'reception_maps_url']);
const LIMITS = { bride_name: 200, groom_name: 200, city: 150, state: 100, ceremony_name: 200,
  ceremony_address: 500, reception_name: 200, reception_address: 500, reception_city: 150, reception_state: 100, ceremony_maps_url: 2048, reception_maps_url: 2048 };
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const CONTENT_UPDATED = 'invitation:content-updated';

export function isHttpsUrl(value) {
  if (typeof value !== 'string' || !/^https:\/\/[^/]/i.test(value) || /[\s\\]/.test(value) || /%(?![a-f\d]{2})/i.test(value)) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password; }
  catch { return false; }
}

export function formatCivilDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('INVALID_CONFIG');
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) throw new Error('INVALID_CONFIG');
  return { date_month: MONTHS[month - 1], date_day: String(day), date_year: String(year) };
}

export function validateConfig(payload) {
  if (!payload || payload.success !== true || !payload.config || typeof payload.config !== 'object' || Array.isArray(payload.config)) throw new Error('INVALID_CONFIG');
  const config = {};
  for (const field of EVENT_FIELDS) {
    const value = payload.config[field];
    if ((value === null || (typeof value === 'string' && !value.trim())) && OPTIONAL.has(field)) { config[field] = null; continue; }
    if (typeof value !== 'string' || !value.trim() || (LIMITS[field] && [...value.trim()].length > LIMITS[field])) throw new Error('INVALID_CONFIG');
    config[field] = value.trim();
  }
  formatCivilDate(config.event_date);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(config.event_time)) throw new Error('INVALID_CONFIG');
  for (const field of ['ceremony_maps_url', 'reception_maps_url']) if (config[field] && !isHttpsUrl(config[field])) throw new Error('INVALID_CONFIG');
  if (config.reception_address && !config.reception_name) throw new Error('INVALID_CONFIG');
  return config;
}

// The promise is retained on both success and failure: no retry/polling per page.
let configPromise;
export function loadEventConfig() {
  if (!configPromise) {
    configPromise = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      try {
        const response = await fetch(new URL('event-config', FUNCTIONS_BASE_URL).href, {
          method: 'GET', cache: 'no-store', signal: controller.signal,
        });
        if (response.status === 404) {
          const body = await response.json();
          if (body?.success === false && body.error === 'EVENT_CONFIG_NOT_FOUND') return null;
          throw new Error('INVALID_CONFIG');
        }
        if (response.status !== 200) throw new Error('CONFIG_UNAVAILABLE');
        return validateConfig(await response.json());
      } finally { clearTimeout(timeout); }
    })();
  }
  return configPromise;
}

function contentUpdated(root) { root.dispatchEvent(new CustomEvent(CONTENT_UPDATED)); }

export function applyEventConfig(root, config) {
  const values = { ...config, ...formatCivilDate(config.event_date), location: `${config.city} · ${config.state}` };
  values.reception_location = [config.reception_city, config.reception_state].filter(Boolean).join(' · ');
  for (const element of root.querySelectorAll('[data-event-field]')) {
    element.textContent = values[element.dataset.eventField] ?? '';
  }
  for (const element of root.querySelectorAll('[data-event-optional]')) {
    element.hidden = !values[element.dataset.eventOptional];
  }
  for (const link of root.querySelectorAll('[data-event-map]')) {
    const url = config[link.dataset.eventMap];
    link.hidden = !url || !isHttpsUrl(url);
    if (url && isHttpsUrl(url)) {
      link.href = url;
      link.target = '_blank'; link.rel = 'noopener noreferrer';
    } else { link.removeAttribute('href'); }
  }
  contentUpdated(root);
}

export async function initEventConfig(root = document) {
  const state = root.querySelector('[data-event-state]');
  const statuses = root.querySelectorAll('[data-event-status]');
  const setState = (value, message) => {
    if (state) { state.dataset.eventState = value; state.setAttribute('aria-busy', String(value === 'loading')); }
    for (const status of statuses) { status.textContent = message; status.hidden = value === 'ready'; }
  };
  setState('loading', 'Carregando as informações do evento…');
  try {
    const config = await loadEventConfig();
    if (!config) { setState('not-configured', 'As informações do evento ainda não estão disponíveis.'); return; }
    applyEventConfig(root, config);
    setState('ready', '');
  } catch {
    setState('error', 'Não foi possível carregar as informações do evento.');
  }
}
