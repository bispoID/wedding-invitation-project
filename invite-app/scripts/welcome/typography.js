/* Tipografia responsiva específica da capa. */

import { fitTextToContainer } from '../shared/typography.js';

const EYEBROW_TITLE_RATIO = 0.1665987;
const LONG_NAMES_CLASS = 'has-long-names';

// Política conservadora para o título caligráfico: acima da escala do texto-base,
// relativa à fonte raiz do usuário. A legibilidade final exige aceite visual.
const MIN_TITLE_REM = 1.5;
const MAX_WRAPPED_TITLE_REM = 3;
const WRAPPED_TITLE_WIDTH_RATIO = 0.08;

let resizeFrame = null;
let copyResizeObserver = null;

/** Lê a fonte-base do CSS sem acumular a redução inline anterior. */
function readBaseTitleSize(title) {
  const previousSize = title.style.fontSize;
  title.style.fontSize = '';
  const baseSize = parseFloat(window.getComputedStyle(title).fontSize);
  title.style.fontSize = previousSize;
  return baseSize;
}

/** Mede a linha original sem alternar o estado visível de um título já quebrado. */
function measureSingleLineSize(title, copy, baseSize) {
  const probe = title.cloneNode(true);
  probe.removeAttribute('id');
  probe.setAttribute('aria-hidden', 'true');
  Object.assign(probe.style, {
    position: 'absolute', visibility: 'hidden', pointerEvents: 'none',
    whiteSpace: 'nowrap', width: `${copy.clientWidth}px`, maxWidth: 'none',
    fontSize: `${baseSize}px`, transform: 'none',
  });
  copy.appendChild(probe);
  try {
    const contentWidth = probe.scrollWidth;
    return baseSize * Math.min(1, copy.clientWidth / contentWidth);
  } finally {
    probe.remove();
  }
}

/**
 * Atualiza a tipografia da capa.
 *
 * Mantém o ajuste original em uma linha quando legível. Nomes excepcionalmente
 * longos usam quebras naturais e uma chamada superior independente do título.
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

  const rootSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
  if (!Number.isFinite(rootSize) || rootSize <= 0 || copy.clientWidth <= 0) {
    return;
  }

  const wasWrapped = copy.classList.contains(LONG_NAMES_CLASS);
  let baseSize;
  let titleFontSize;
  if (wasWrapped) {
    baseSize = readBaseTitleSize(title);
    if (!Number.isFinite(baseSize) || baseSize <= 0) return;
    titleFontSize = measureSingleLineSize(title, copy, baseSize);
  } else {
    // O caminho normal conserva exatamente o cálculo e os estilos anteriores.
    fitTextToContainer(title, copy);
    titleFontSize = parseFloat(window.getComputedStyle(title).fontSize);
  }

  if (!Number.isFinite(titleFontSize) || titleFontSize <= 0) {
    return;
  }

  const minimumSize = rootSize * MIN_TITLE_REM;
  if (titleFontSize < minimumSize) {
    baseSize ??= readBaseTitleSize(title);
    if (!Number.isFinite(baseSize) || baseSize <= 0) return;
    if (!wasWrapped) copy.classList.add(LONG_NAMES_CLASS);
    // Entre 1,5 e 3rem, acompanhando a largura útil sem voltar à compressão.
    title.style.fontSize = `${Math.max(minimumSize, Math.min(
      baseSize, rootSize * MAX_WRAPPED_TITLE_REM, copy.clientWidth * WRAPPED_TITLE_WIDTH_RATIO
    ))}px`;
    eyebrow.style.fontSize = '';
    return;
  }

  if (wasWrapped) {
    copy.classList.remove(LONG_NAMES_CLASS);
    fitTextToContainer(title, copy);
    titleFontSize = parseFloat(window.getComputedStyle(title).fontSize);
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

  document.addEventListener('invitation:content-updated', scheduleWelcomeTypography);

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
