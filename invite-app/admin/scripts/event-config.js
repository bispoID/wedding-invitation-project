import { callAdminFunction } from './functions.js';
import { formatTimestamp } from './date-time.js';

export const EVENT_FIELDS = [
  'bride_name', 'groom_name', 'event_date', 'event_time', 'city', 'state',
  'ceremony_name', 'ceremony_address', 'ceremony_maps_url', 'reception_name',
  'reception_address', 'reception_city', 'reception_state', 'reception_maps_url',
];
const optional = new Set(['ceremony_address', 'ceremony_maps_url', 'reception_name', 'reception_address', 'reception_city', 'reception_state', 'reception_maps_url']);
export function readEventForm(form) {
  return Object.fromEntries(EVENT_FIELDS.map((field) => {
    const value = form.elements.namedItem(field).value.trim();
    return [field, optional.has(field) && !value ? null : value];
  }));
}
export async function requestEventConfig(method, config, invoke = callAdminFunction) {
  const result = await invoke('admin-manage-event-config', {
    method, ...(method === 'PUT' ? { body: { config } } : {}),
  });
  if (result?.success !== true || !Object.hasOwn(result, 'config') ||
    (method === 'PUT' && !result.config) ||
    (result.config !== null && (!result.config || EVENT_FIELDS.some((field) => !Object.hasOwn(result.config, field))))) {
    throw new Error('Resposta de configuração inválida.');
  }
  return result.config;
}
export async function initializeEventConfig(root = document, request = requestEventConfig) {
  const toggle = root.querySelector('#event-toggle');
  const content = root.querySelector('#event-content');
  const setExpanded = (expanded) => {
    toggle.setAttribute('aria-expanded', String(expanded));
    content.hidden = !expanded;
  };
  setExpanded(false);
  toggle.addEventListener('click', () => setExpanded(content.hidden));
  const form = root.querySelector('#event-form');
  const feedback = root.querySelector('#event-feedback');
  const loading = root.querySelector('#event-loading');
  const retry = root.querySelector('#event-retry');
  const controls = [...form.elements];
  const busy = (value) => {
    controls.forEach((control) => { control.disabled = value; });
    retry.disabled = value;
    form.setAttribute('aria-busy', String(value));
  };
  const message = (text, type) => {
    feedback.textContent = text;
    feedback.className = 'feedback feedback--' + type;
    feedback.hidden = false;
    setExpanded(true);
  };
  const fill = (config) => {
    for (const field of EVENT_FIELDS) form.elements.namedItem(field).value = config?.[field] ?? '';
    root.querySelector('#event-updated').textContent = config?.updated_at
      ? 'Atualizado em: ' + formatTimestamp(config.updated_at) : '';
  };
  let ready = false;
  const load = async () => {
    busy(true);
    loading.hidden = false;
    feedback.hidden = true;
    try {
      const config = await request('GET');
      fill(config);
      ready = true;
      form.hidden = false;
      retry.hidden = true;
      if (!config) message('Nenhuma configuração cadastrada. Preencha os campos para o primeiro cadastro.', 'warning');
    } catch {
      ready = false;
      form.hidden = true;
      retry.hidden = false;
      message('Não foi possível consultar o evento. Os outros módulos continuam disponíveis.', 'error');
    } finally {
      loading.hidden = true;
      busy(false);
    }
  };
  retry.addEventListener('click', load);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!ready || form.getAttribute('aria-busy') === 'true' || !form.reportValidity()) return;
    setExpanded(true);
    const config = readEventForm(form);
    for (const field of ['ceremony_maps_url', 'reception_maps_url']) {
      if (!config[field]) continue;
      try {
        const url = new URL(config[field]);
        if (!/^https:\/\/[^/]/i.test(config[field]) || url.protocol !== 'https:' || !url.hostname || url.username || url.password ||
          /[\s\\]/.test(config[field]) || /%(?![a-f\d]{2})/i.test(config[field])) throw new Error();
      } catch { message('Informe URLs HTTPS válidas, sem credenciais.', 'error'); return; }
    }
    if (config.reception_address && !config.reception_name) {
      message('O endereço da recepção exige o nome da recepção.', 'error'); return;
    }
    busy(true);
    feedback.hidden = true;
    try {
      const persisted = await request('PUT', config);
      fill(persisted);
      message('Configuração salva e confirmada pelo backend.', 'success');
    } catch {
      message('Não foi possível salvar. Revise os dados e tente novamente; suas edições foram preservadas.', 'error');
    } finally { busy(false); }
  });
  await load();
}
