const LOCAL_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '10.0.2.2',
]);

const hostname = globalThis.location?.hostname?.toLowerCase() ?? '';

if (LOCAL_HOSTNAMES.has(hostname)) {
  const configUrl = new URL('../../dev-config.json', import.meta.url);
  const response = await fetch(configUrl, { cache: 'no-store' });

  if (response.ok) {
    globalThis.__INVITATION_DEV_CONFIG__ = await response.json();
  }
}
