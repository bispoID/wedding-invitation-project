import { bootstrap } from './dev-runtime-config.js';
const baseUrl = new URL('../../', import.meta.url).href;
const admin = document.body.dataset.page === 'login' || document.body.dataset.page === 'dashboard';
await bootstrap({ baseUrl, entryUrl: new URL(admin ? 'admin/scripts/main.js' : 'scripts/main.js', baseUrl).href });
