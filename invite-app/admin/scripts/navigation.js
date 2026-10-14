import { APP_BASE_URL } from '../../scripts/shared/app-config.js';

/** Gera links da aplicação e dos três modos de preview DEV. */
export function buildInvitationLinks(base = APP_BASE_URL) {
  return Object.fromEntries(['main', 'cover', 'envelope-card', 'letter'].map((mode) => {
    const url = new URL(base);
    if (mode !== 'main') url.searchParams.set('devmode', mode);
    return [mode, url.href];
  }));
}

/** Preenche links declarativos sem misturar a navegação do painel com o convite. */
export function initializeInvitationLinks(root = document) {
  const links = buildInvitationLinks();
  for (const link of root.querySelectorAll('[data-invitation-mode]')) {
    link.href = links[link.dataset.invitationMode];
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
}
