/* =========================================================
   ESTADO
========================================================= */

let floralSealAnimations = [];


/* =========================================================
   ANIMAÇÃO DAS DECORAÇÕES
========================================================= */

export function animateFloralSealExit(decorations) {

  const animationOptions = {
    duration: 1100,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
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
          'translate(0, 0)'
      },

      {
        transform:
          'translate(0, 0) scale(1.1)',
        offset: 0.7
      },

      {
        transform:
          'translate(32.5%, 22.5%) scale(1.16)',
        offset: 0.99
      },

      {
        transform:
          'translate(32.5%, 27.5%) scale(1)'
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
