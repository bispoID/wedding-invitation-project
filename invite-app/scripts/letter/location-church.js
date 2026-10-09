/* Ajuste estes limites para controlar o tamanho longe e no centro da tela. */
const INITIAL_CHURCH_WIDTH_CQW = 58;
const CENTERED_CHURCH_WIDTH_CQW = 63;


/**
 * Ajusta a largura da igreja conforme sua distância do centro da viewport.
 *
 * A largura muda o fluxo do cartão; o próximo frame recalcula a distância
 * para que a medida final continue alinhada ao centro após o reflow.
 *
 * @returns {void}
 */
export function initLocationChurchAnimation() {
  const letter = document.querySelector('.letter');
  const church = letter?.querySelector('.location-card__church');

  if (!letter || !church) {
    return;
  }

  let animationFrame = null;

  const updateChurchWidth = () => {
    animationFrame = null;

    // Sem a carta visível, deixa o tamanho padrão definido no CSS.
    if (letter.hidden) {
      church.style.removeProperty('--location-church-width');
      return;
    }

    // Não altera a largura dinamicamente se o usuário reduz movimento.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      church.style.removeProperty('--location-church-width');
      return;
    }

    const churchBounds = church.getBoundingClientRect();
    const viewportCenter = window.innerHeight / 2;
    const churchCenter = churchBounds.top + churchBounds.height / 2;
    const centerDistance = Math.abs(churchCenter - viewportCenter);
    const proximity = Math.max(0, 1 - centerDistance / Math.max(viewportCenter, 1));
    // A proximidade é 1 no centro e chega a 0 a meia viewport de distância.
    const width = INITIAL_CHURCH_WIDTH_CQW
      + proximity * (CENTERED_CHURCH_WIDTH_CQW - INITIAL_CHURCH_WIDTH_CQW);

    church.style.setProperty(
      '--location-church-width',
      `${width.toFixed(3)}cqw`
    );

    const updatedWidth = church.getBoundingClientRect().width;

    // O reflow pode mover o centro da imagem; recalcula até estabilizar.
    if (Math.abs(updatedWidth - churchBounds.width) > 0.5) {
      animationFrame = window.requestAnimationFrame(updateChurchWidth);
    }
  };

  // Agrupa eventos rápidos de rolagem e redimensionamento em um único frame.
  const scheduleChurchWidthUpdate = () => {
    if (animationFrame !== null) {
      return;
    }

    animationFrame = window.requestAnimationFrame(updateChurchWidth);
  };

  // Os previews alternam `hidden` diretamente, sem chamar showLetter/hideLetter.
  const letterVisibilityObserver = new MutationObserver(scheduleChurchWidthUpdate);

  letterVisibilityObserver.observe(letter, {
    attributes: true,
    attributeFilter: ['hidden']
  });

  window.addEventListener('scroll', scheduleChurchWidthUpdate, { passive: true });
  window.addEventListener('resize', scheduleChurchWidthUpdate);
  document.addEventListener('invitation:content-updated', scheduleChurchWidthUpdate);

  scheduleChurchWidthUpdate();
}
