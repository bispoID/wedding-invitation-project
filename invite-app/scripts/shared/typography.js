/* Utilitários tipográficos responsivos da aplicação. */

/**
 * Redimensiona um texto para que ele caiba integralmente na largura
 * disponível do container, preservando uma única linha.
 *
 * O tamanho inline anterior é removido antes de cada medição para que
 * mudanças de viewport, breakpoint ou CSS sejam recalculadas corretamente.
 *
 * @param {HTMLElement} element
 * @param {HTMLElement} container
 * @returns {void}
 */
export function fitTextToContainer(element, container) {
  if (!element || !container) {
    return;
  }

  element.style.fontSize = '';

  const baseFontSize = parseFloat(
    window.getComputedStyle(element).fontSize
  );

  const availableWidth = container.clientWidth;

  if (!Number.isFinite(baseFontSize) || availableWidth <= 0) {
    return;
  }

  element.style.fontSize = `${baseFontSize}px`;

  const contentWidth = element.scrollWidth;

  if (contentWidth <= availableWidth) {
    return;
  }

  const scale = availableWidth / contentWidth;

  element.style.fontSize = `${baseFontSize * scale}px`;
}
