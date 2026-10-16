import { LOCAL_HOSTNAMES, normalizeDevConfig, validateEnvironmentConfig } from './environment-config.js';
/** A única consulta anterior à validação é o manifesto na própria origem. */
export async function loadRuntimeConfig(baseUrl, fetchImpl = globalThis.fetch) {
  const base = new URL(baseUrl);
  const local = LOCAL_HOSTNAMES.has(base.hostname);
  const target = new URL(local ? 'dev-config.json' : 'runtime-config.json', base);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetchImpl(target.href, { cache: 'no-store', redirect: 'error', signal: controller.signal });
    if (!response.ok || response.redirected || response.url && response.url !== target.href) {
      throw new Error('Não foi possível carregar a configuração do ambiente.');
    }
    const input = await response.json();
    const config = validateEnvironmentConfig(local ? normalizeDevConfig(input, base.href) : input,
      { runtimeBaseUrl: base.href });
    if (local !== (config.appEnv === 'dev')) throw new Error('Ambiente incompatível com o endereço.');
    return config;
  } finally { clearTimeout(timeout); }
}
export function showConfigurationError(document) {
  document.documentElement.dataset.configurationState = 'error';
  for (const control of document.querySelectorAll('form input, form button, form select, form textarea, [data-rsvp-submit]')) control.disabled = true;
  for (const form of document.querySelectorAll('form')) {
    form.inert = true;
    form.addEventListener('submit', event => event.preventDefault(), true);
  }
  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  message.setAttribute('tabindex', '-1');
  message.textContent = 'Não foi possível iniciar este ambiente. A confirmação de presença e o acesso administrativo estão indisponíveis. Entre em contato com os responsáveis.';
  // Visível mesmo quando a animação inicial mantém o convite fechado.
  Object.assign(message.style, { position: 'fixed', inset: '1rem 1rem auto', zIndex: '99999', padding: '1rem', background: '#fff', color: '#222' });
  document.body.prepend(message);
  message.focus();
}
export async function bootstrap({ baseUrl, entryUrl, fetchImpl, importModule = url => import(url), document = globalThis.document, publish = config => { globalThis.__INVITATION_CONFIG__ = config; } }) {
  try {
    const config = await loadRuntimeConfig(baseUrl, fetchImpl);
    publish(config);
    document.documentElement.dataset.appEnv = config.appEnv;
    for (const form of document.querySelectorAll('form')) form.inert = false;
    await importModule(entryUrl);
    document.documentElement.dataset.configurationState = 'ready';
    return true;
  } catch {
    showConfigurationError(document);
    return false;
  }
}
