/* =========================================================
   ESTADO
========================================================= */

let floralSealAnimations = [];


/* =========================================================
   ANIMAÇÃO DAS DECORAÇÕES
========================================================= */

export function animateFloralSealExit(decorations) {

  const animationOptions = {
    duration: 1500,
    easing: 'cubic-bezier(0.33, 0, 0.67, 1)',
    fill: 'both'
  };

  /*
  * O movimento pertence ao contêiner pai.
  *
  * Assim, flores e selo herdam o mesmo deslocamento
  * e percorrem exatamente a mesma distância até o canto
  * do envelope, tanto no mobile quanto no desktop.
  */
floralSealAnimations = [
  decorations.animate([
    {
      transform:
        `${getDiagonalTranslate(0)} scale(1)`
    },

    {
      transform:
        `${getDiagonalTranslate(0)} scale(1.09)`,
      offset: 0.2
    },


    {
      transform:
        `${getDiagonalTranslate(72)} scale(1.045)`,
      offset: 0.75
    },

    {
      transform:
        `${getDiagonalTranslate(100)} scale(1)`,
        offset: 1
    }

  ], animationOptions)
];
}


/* =========================================================
   RESET DAS ANIMAÇÕES
========================================================= */

export function resetFloralSealAnimations() {

  floralSealAnimations.forEach(
    (animation) => animation.cancel()
  );

  floralSealAnimations = [];
}

 /**
  * Calcula um ponto proporcional da trajetória diagonal
  * das decorações com base no deslocamento total definido.
  *
  * O valor recebido representa um percentual simbólico
  * do percurso total:
  *
  *   0   → início da trajetória
  *   50  → metade da trajetória
  *   100 → destino final
  *
  * O cálculo mantém a proporção entre os eixos X e Y,
  * garantindo que todos os pontos estejam exatamente
  * sobre a mesma trajetória diagonal.
  *
  * @param {number} progress
  *   Percentual do percurso desejado, entre 0 e 100.
  *
  * @returns {string}
  *   Valor CSS pronto para ser utilizado em `translate()`.
  *
  * @example
  * getDiagonalTranslate(0)
  * // 'translate(0%, 0%)'
  *
  * @example
  * getDiagonalTranslate(50)
  * // 'translate(16.25%, 12.75%)'
  *
  * @example
  * getDiagonalTranslate(100)
  * // 'translate(32.5%, 25.5%)'
  */
function getDiagonalTranslate(progress) {

  const totalX = 32.5;
  const totalY = 25.5;

  const percentage = Math.max(
    0,
    Math.min(100, progress)
  );

  const x = totalX * (percentage / 100);
  const y = totalY * (percentage / 100);

  return `translate(${x}%, ${y}%)`;
}