import {
  readCssVariable,
  readMilliseconds
} from '../shared/css.js';


/* Percentuais do destino final relativo ao contêiner do envelope. */
const DIAGONAL_PATH = Object.freeze({
  x: 32.5,
  y: 25.5
});

let floralSealAnimation = null;


/* =========================================================
   ANIMAÇÃO DAS DECORAÇÕES
========================================================= */

/**
 * Move flores e selo como uma única unidade visual durante a abertura.
 *
 * @param {HTMLElement} decorations Contêiner que agrupa as duas imagens.
 * @returns {Animation} Animação criada pela Web Animations API.
 */
export function animateFloralSealExit(decorations) {

  /*
   * A animação fica no contêiner, e não em cada imagem, para que flores
   * e selo mantenham a mesma trajetória e o mesmo centro visual.
   */
  const animationOptions = {
    duration: readMilliseconds('--motion-decorations-duration'),
    easing: readCssVariable('--ease-decorations'),
    fill: 'both'
  };

  // A animação pertence ao contêiner para manter flores e selo sincronizados.
  floralSealAnimation = decorations.animate([
    {
      transform:
        `${getDiagonalTranslate(0)} scale(1)`
    },

    {
      transform:
        `${getDiagonalTranslate(0)} scale(1.11)`,
      offset: 0.3
    },

    {
      transform:
        `${getDiagonalTranslate(100)} scale(1)`,
      offset: 1
    }

  ], animationOptions);
}


/* =========================================================
   RESET DAS ANIMAÇÕES
========================================================= */

/**
 * Cancela a animação ativa e remove sua referência para permitir nova abertura.
 *
 * @returns {void}
 */
export function resetFloralSealAnimations() {

  floralSealAnimation?.cancel();

  floralSealAnimation = null;
}

/**
 * Converte um progresso percentual no deslocamento diagonal do grupo visual.
 *
 * @param {number} progress Progresso esperado entre 0 e 100.
 * @returns {string} Transform CSS com os deslocamentos X e Y.
 */
function getDiagonalTranslate(progress) {
  const percentage = Math.max(
    0,
    Math.min(100, progress)
  );

  const x = DIAGONAL_PATH.x * (percentage / 100);
  const y = DIAGONAL_PATH.y * (percentage / 100);

  return `translate(${x}%, ${y}%)`;
}
