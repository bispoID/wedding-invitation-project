/* Ajuste tipográfico responsivo da capa. */

const EYEBROW_TITLE_RATIO = 0.1665987;

let resizeFrame = null;
let copyResizeObserver = null;
/**
 * Reduz a fonte até que o texto caiba integralmente na largura do container.
 * O tamanho inline anterior é sempre removido antes da medição, permitindo
 * recalcular corretamente após troca de viewport ou breakpoint.
 *
 * @param {HTMLElement} element
 * @param {HTMLElement} container
 * @returns {void}
 */
function fitTextToCopy(element, container) {
  if (!element || !container) {
    return;
  }

  /* Volta ao tamanho definido pelo CSS para esta viewport. */
  element.style.fontSize = '';

  const cssFontSize = parseFloat(
    window.getComputedStyle(element).fontSize
  );

  const availableWidth = container.clientWidth;

  if (!Number.isFinite(cssFontSize) || availableWidth <= 0) {
    return;
  }

  element.style.fontSize = `${cssFontSize}px`;

  /*
   * Com white-space: nowrap, scrollWidth representa a largura intrínseca
   * necessária para manter todo o título em uma única linha.
   */
  const contentWidth = element.scrollWidth;

  if (contentWidth <= availableWidth) {
    return;
  }

  const scale = availableWidth / contentWidth;

  element.style.fontSize =
    `${cssFontSize * scale}px`;
}


/**
 * Ajusta o título e mantém o eyebrow proporcional ao tamanho efetivo dele.
 *
 * @returns {void}
 */
function fitWelcomeTexts() {
  const copy = document.querySelector('.welcome__copy');
  const title = document.getElementById('welcome-title');
  const eyebrow = document.querySelector('.welcome__copy .eyebrow');

  if (!copy || !title || !eyebrow) {
    return;
  }

  fitTextToCopy(title, copy);

  const titleFontSize = parseFloat(
    window.getComputedStyle(title).fontSize
  );

  if (Number.isFinite(titleFontSize)) {
    eyebrow.style.fontSize =
      `${titleFontSize * EYEBROW_TITLE_RATIO}px`;
  }
}


/**
 * Agenda uma única medição no próximo frame.
 *
 * @returns {void}
 */
function scheduleWelcomeTextFit() {
  window.cancelAnimationFrame(resizeFrame);

  resizeFrame = window.requestAnimationFrame(
    fitWelcomeTexts
  );
}


/**
 * Inicializa o ajuste tipográfico e acompanha tanto o container quanto
 * o carregamento das fontes. Isso evita que uma fonte carregada depois
 * do primeiro cálculo deixe o título maior que o .welcome__copy.
 *
 * @returns {void}
 */
export function initWelcomeTitle() {
  const copy = document.querySelector('.welcome__copy');
  const title = document.getElementById('welcome-title');

  if (!copy || !title) {
    return;
  }

  /* Primeiro cálculo. */
  scheduleWelcomeTextFit();

  /* Mudança de viewport/orientação. */
  window.addEventListener(
    'resize',
    scheduleWelcomeTextFit
  );

  /* Mudança efetiva da largura do .welcome__copy. */
  if ('ResizeObserver' in window) {
    copyResizeObserver = new ResizeObserver(
      scheduleWelcomeTextFit
    );

    copyResizeObserver.observe(copy);

    /* Também observa o título para mudanças de layout tipográfico. */
    titleResizeObserver = new ResizeObserver(
      scheduleWelcomeTextFit
    );
}

  /*
   * As fontes locais usam font-display: swap. O primeiro cálculo pode ocorrer
   * com a fonte fallback; quando Edwardian termina de carregar, refazemos tudo.
   */
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      scheduleWelcomeTextFit();
    });
  }

  if (document.fonts) {
    document.fonts.addEventListener?.(
      'loadingdone',
      scheduleWelcomeTextFit
    );
  }

  /* Garante uma nova medição depois que os recursos da página estabilizarem. */
  window.addEventListener(
    'load',
    scheduleWelcomeTextFit,
    { once: true }
  );
}
