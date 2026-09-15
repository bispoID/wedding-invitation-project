import { initRsvp } from './letter/rsvp.js';
import { initEnvelope } from './welcome/envelope.js';
import { initWelcomeTitle } from './welcome/title.js';


/*
 * true pula a animação inicial para facilitar o trabalho na carta.
 * false mantém o fluxo público normal, começando pela capa.
 */
const DEV_SKIP_WELCOME = false;


/* Inicializa os módulos depois que o script module encontra o HTML da página. */
initEnvelope({
  devSkipWelcome: DEV_SKIP_WELCOME
});

initWelcomeTitle();
initRsvp();
