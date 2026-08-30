/* =========================================================
   ESTADO
========================================================= */

let welcomeTitleResizeFrame = null;


/* =========================================================
   AJUSTE RESPONSIVO DO TÍTULO
========================================================= */

function fitWelcomeTitle() {

  const title =
    document.querySelector('#welcome-title');

  if (!title) {
    return;
  }

  const isMobile =
    window.matchMedia('(max-width: 699px)').matches;

  if (!isMobile) {
    return;
  }

  /*
   * Guarda o tamanho original apenas uma vez.
   */
  if (!title.dataset.originalFontSize) {

    title.dataset.originalFontSize =
      parseFloat(
        window.getComputedStyle(title).fontSize
      );
  }

  const originalFontSize =
    parseFloat(
      title.dataset.originalFontSize
    );

  /*
   * Volta ao tamanho original antes de medir.
   * Isso permite recalcular corretamente após um resize.
   */
  title.style.fontSize =
    `${originalFontSize}px`;

  /*
   * Mantém a mesma margem de segurança
   * utilizada pelo título no mobile.
   */
  const availableWidth =
    window.innerWidth - 30;

  const titleWidth =
    title.scrollWidth;

  /*
   * Se já couber, mantém o tamanho original.
   */
  if (titleWidth <= availableWidth) {
    return;
  }

  /*
   * Reduz proporcionalmente a fonte até o título caber
   * na largura disponível, sem permitir quebra de linha.
   */
  const scale =
    availableWidth / titleWidth;

  title.style.fontSize =
    `${originalFontSize * scale}px`;
}


/* =========================================================
   INICIALIZAÇÃO E RESIZE
========================================================= */

export function initWelcomeTitle() {

  fitWelcomeTitle();

  window.addEventListener(
    'resize',
    () => {

      window.cancelAnimationFrame(
        welcomeTitleResizeFrame
      );

      welcomeTitleResizeFrame =
        window.requestAnimationFrame(
          fitWelcomeTitle
        );
    }
  );
}
