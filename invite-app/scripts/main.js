import { initEventConfig } from './event-config.js';

import {
  initRsvp,
  initLocationChurchAnimation
} from './letter.js';

import {
  initEnvelope,
  initWelcomeTypography
} from './envelope.js';


/**
 * Modo de desenvolvimento para previews estáticos e testes visuais.
 *
 * Opções suportadas:
 * - cover: mantém a experiência normal da capa
 * - envelope-card: capa visível com o cartão interno exposto de forma estática
 * - letter: inicia diretamente na carta
 *
 * O valor padrão é seguro para desenvolvimento e mantém o fluxo público intacto.
 * O parâmetro de URL ?devmode=... continua permitindo testes rápidos sem editar o código.
 */
const DEV_PREVIEW = Object.freeze({
  enabled: false,
  target: 'cover'
});

const devmodeParam = new URLSearchParams(window.location.search).get('devmode');
const devmodeParamProvided = devmodeParam !== null;
const validPreviewTargets = ['cover', 'envelope-card', 'letter'];
const normalizedPreviewTarget = devmodeParam === ''
  ? 'cover'
  : devmodeParam;
const resolvedPreviewTarget = validPreviewTargets.includes(normalizedPreviewTarget)
  ? normalizedPreviewTarget
  : DEV_PREVIEW.target;

const devMode = devmodeParamProvided || DEV_PREVIEW.enabled;

/* Inicializa os módulos depois que o script module encontra o HTML da página. */
initEnvelope({
  devSkipWelcome: devMode && resolvedPreviewTarget === 'letter',
  devPreview: devMode ? resolvedPreviewTarget : null
});

/* Inicia depois do preview, que pode deixar a carta visível sem abrir o envelope. */
initLocationChurchAnimation();

initWelcomeTypography();
initRsvp();
void initEventConfig();
