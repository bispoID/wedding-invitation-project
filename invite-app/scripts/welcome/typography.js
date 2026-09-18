/* Tipografia responsiva específica da capa. */

import { fitTextToContainer } from '../shared/typography.js';

const EYEBROW_TITLE_RATIO = 0.1665987;

let resizeFrame = null;
let copyResizeObserver = null;

/**
 * Atualiza a tipografia da capa.
 *
 * O título é ajustado à largura do .welcome__copy e o eyebrow acompanha
 * proporcionalmente o tamanho efetivo do título.
 *
 * @returns {void}
 */
function updateWelcomeTypography() {
  const copy = document.querySelector('.welcome__copy');
  const title = document.getElementById('welcome-title');
  const eyebrow = copy?.querySelector('.eyebrow');

  if (!copy || !title || !eyebrow) {
    return;
  }

  fitTextToContainer(title, copy);

  const titleFontSize = parseFloat(
    window.getComputedStyle(title).fontSize
  );

  if (!Number.isFinite(titleFontSize)) {
    return;
  }

  eyebrow.style.fontSize =
    `${titleFontSize * EYEBROW_TITLE_RATIO}px`;
}

/**
 * Agenda uma única atualização no próximo frame.
 *
 * @returns {void}
 */
function scheduleWelcomeTypography() {
  window.cancelAnimationFrame(resizeFrame);

  resizeFrame = window.requestAnimationFrame(
    updateWelcomeTypography
  );
}

/**
 * Inicializa a tipografia responsiva da capa.
 *
 * @returns {void}
 */
export function initWelcomeTypography() {
  const copy = document.querySelector('.welcome__copy');
  const title = document.getElementById('welcome-title');

  if (!copy || !title) {
    return;
  }

  scheduleWelcomeTypography();

  window.addEventListener(
    'resize',
    scheduleWelcomeTypography
  );

  if ('ResizeObserver' in window) {
    copyResizeObserver = new ResizeObserver(
      scheduleWelcomeTypography
    );

    copyResizeObserver.observe(copy);
  }

  /*
   * Mantido conforme solicitado anteriormente:
   * os três gatilhos de estabilização de recursos permanecem.
   */
  if (document.fonts?.ready) {
    document.fonts.ready.then(
      scheduleWelcomeTypography
    );
  }

  if (document.fonts) {
    document.fonts.addEventListener?.(
      'loadingdone',
      scheduleWelcomeTypography
    );
  }

  window.addEventListener(
    'load',
    scheduleWelcomeTypography,
    { once: true }
  );
}
