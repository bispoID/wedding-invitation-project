/* Fachada pública da feature envelope/capa.
 *
 * Os módulos especializados continuam separados; este arquivo concentra a
 * superfície que a inicialização global precisa conhecer.
 */

export {
  initEnvelope
} from './welcome/envelope.js';

export {
  initWelcomeTypography
} from './welcome/typography.js';
