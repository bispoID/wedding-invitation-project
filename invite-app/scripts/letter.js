/* Fachada pública da feature carta/convite.
 *
 * Os módulos especializados continuam separados para preservar o isolamento
 * entre conteúdo, localização e RSVP.
 */

export {
  initRsvp
} from './letter/rsvp.js';
