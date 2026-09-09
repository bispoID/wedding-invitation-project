/* =========================================================
   CONFIGURAÇÃO DE DESENVOLVIMENTO
========================================================= */

/*
 * Quando true, a aplicação inicia diretamente na seção LETTER,
 * sem exigir a abertura do envelope.
 *
 * Altere para false para restaurar o fluxo normal do convite.
 */
const DEV_SKIP_WELCOME = false;


/* =========================================================
   MÓDULOS
========================================================= */

import { initEnvelope } from './welcome/envelope.js';
import { initWelcomeTitle } from './welcome/title.js';
import { initRsvp } from './letter/rsvp.js';


/* =========================================================
   INICIALIZAÇÃO DA APLICAÇÃO
========================================================= */

initEnvelope({
  devSkipWelcome: DEV_SKIP_WELCOME
});

initWelcomeTitle();
initRsvp();
