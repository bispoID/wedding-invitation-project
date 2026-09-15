/* Deve acompanhar o breakpoint mobile definido em styles/responsive.css. */
const MOBILE_MEDIA_QUERY = '(max-width: 699px)';
/* Margem horizontal total reservada para o título no mobile, em pixels. */
const TITLE_HORIZONTAL_MARGIN = 34;

let resizeFrame = null;


/**
 * Mantém o título em uma linha sem reduzir sua escala no desktop.
 *
 * A medição é refeita no mobile porque o título usa white-space: nowrap;
 * no desktop, o tamanho definido pelo CSS é sempre restaurado.
 *
 * @returns {void}
 */
function fitWelcomeTitle() {
  const title = document.getElementById('welcome-title');

  if (!title) {
    return;
  }

  // O título não pode quebrar; no mobile, reduzimos a fonte apenas se necessário.
  const isMobile = window.matchMedia(MOBILE_MEDIA_QUERY).matches;

  if (!title.dataset.originalFontSize) {
    // Guarda o valor do CSS para que cada resize parta do tamanho original.
    title.dataset.originalFontSize = parseFloat(
      window.getComputedStyle(title).fontSize
    );
  }

  const originalFontSize = Number.parseFloat(
    title.dataset.originalFontSize
  );

  if (!isMobile) {
    title.style.fontSize = `${originalFontSize}px`;
    return;
  }

  // Mede sempre a partir do tamanho original para evitar reduções acumuladas.
  title.style.fontSize = `${originalFontSize}px`;

  const availableWidth =
    window.innerWidth - TITLE_HORIZONTAL_MARGIN;

  const titleWidth = title.scrollWidth;

  if (titleWidth <= availableWidth) {
    return;
  }

  const scale = availableWidth / titleWidth;
  title.style.fontSize = `${originalFontSize * scale}px`;
}


/**
 * Ajusta o título na inicialização e agenda uma nova medição durante resize.
 *
 * @returns {void}
 */
export function initWelcomeTitle() {
  fitWelcomeTitle();

  // requestAnimationFrame evita medir o título várias vezes no mesmo resize.
  window.addEventListener('resize', () => {
    window.cancelAnimationFrame(resizeFrame);

    resizeFrame = window.requestAnimationFrame(
      fitWelcomeTitle
    );
  });
}
