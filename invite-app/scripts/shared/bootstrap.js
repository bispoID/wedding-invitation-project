import { bootstrap } from './dev-runtime-config.js';
const baseUrl = new URL('../../', import.meta.url).href;
const page = document.body.dataset.page;
const admin = page === 'login' || page === 'dashboard';
const entry = page === 'reset-password' ? 'admin/scripts/reset-password.js' : admin ? 'admin/scripts/main.js' : 'scripts/main.js';
const ready = await bootstrap({ baseUrl, entryUrl: new URL(entry, baseUrl).href });
if (!ready && page === 'reset-password') window.history.replaceState(null, '', window.location.pathname);
