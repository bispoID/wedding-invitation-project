import { initEventConfig } from './event-config.js';
import { initInvitationNames } from './shared/invitation-names.js';

import {
  initRsvp
} from './letter.js';

import {
  initEnvelope,
  initWelcomeTypography
} from './envelope.js';

/**
 * Ponto de entrada do convite público.
 *
 * A ordem de inicialização é intencional: o envelope prepara a transição
 * entre capa e carta; os módulos de tipografia e RSVP conectam os controles
 * específicos; por fim, Event Config preenche o conteúdo remoto. Cada módulo
 * tolera uma página parcial para continuar reutilizável nos previews e testes.
 */

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

// O módulo é carregado no fim do documento, portanto os elementos já existem.
// A inicialização permanece explícita para que a dependência entre features
// fique visível neste arquivo, em vez de ser escondida em efeitos globais.
initEnvelope({
  devSkipWelcome: devMode && resolvedPreviewTarget === 'letter',
  devPreview: devMode ? resolvedPreviewTarget : null
});

initWelcomeTypography();
initInvitationNames();
initRsvp();
void initEventConfig();
