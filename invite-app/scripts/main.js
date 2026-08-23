const welcome = document.querySelector('.welcome');
const letter = document.querySelector('.letter');

const envelope = document.querySelector('.envelope');
const flap = document.querySelector('.envelope__flap');

const backButton = document.querySelector('.back-to-cover');

const rsvpForm = document.querySelector('.rsvp-form');
const feedback = document.querySelector('.form-feedback');
const flowers = document.querySelector('.envelope__flowers');
const seal = document.querySelector('.envelope__seal');

let isOpening = false;
let flapTurnFrame = null;
let floralSealAnimations = [];


/* =========================================================
   TEMPOS DA ANIMAÇÃO
========================================================= */

const ANIMATION_TIMING = {
  cardStart: 5800,
  coverClose: 8500,
  letterEnter: 8050,
};


/* =========================================================
   ANIMAÇÃO DOS ELEMENTOS DECORATIVOS
========================================================= */

function animateFloralSealExit() {

  const animationOptions = {
    duration: 900,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    fill: 'both'
  };

  floralSealAnimations = [
    [flowers, '40deg'],
    [seal, '0deg']
  ].map(([element, rotation]) => element.animate([
    {
      transform:
        `translate(-50%, -50%) rotate(${rotation}) scale(1)`
    },

    {
      transform:
        `translate(-50%, -50%) rotate(${rotation}) scale(1.1)`,
      offset: 0.7
    },

    {
      transform:
        `translate(calc(-50% + 8rem), calc(-50% + 8rem)) rotate(${rotation}) scale(1.16)`
    }

  ], animationOptions));

}


/* =========================================================
   MONITORAMENTO DA ABA SUPERIOR
========================================================= */

function watchFlapTurn() {

  const flapStyle =
    window.getComputedStyle(flap);

  const transformValues =
    flapStyle.transform
      .replace('matrix3d(', '')
      .replace(')', '')
      .split(',')
      .map(Number);

  if (transformValues.length === 16) {

    const angle =
      Math.atan2(
        transformValues[6],
        transformValues[5]
      ) * 180 / Math.PI;

    const normalizedAngle =
      angle < 0
        ? angle + 360
        : angle;

    /*
     * A aba é considerada virada quando a rotação
     * entra na faixa monitorada abaixo.
     */
    if (
      normalizedAngle >= 90 &&
      normalizedAngle <= 295
    ) {

      welcome.classList.add(
        'is-flap-turned'
      );

      return;
    }
  }

  flapTurnFrame =
    window.requestAnimationFrame(
      watchFlapTurn
    );
}


/* =========================================================
   ABRIR CONVITE
========================================================= */

function openInvitation() {

  // Evita múltiplos cliques durante a animação.
  if (isOpening) {
    return;
  }

  isOpening = true;


  /*
   * ETAPA 1
   *
   * Abre somente a aba superior.
   */
  welcome.classList.add(
    'is-opening-envelope'
  );

  animateFloralSealExit();

  flapTurnFrame =
    window.requestAnimationFrame(
      watchFlapTurn
    );


  /*
   * ETAPA 2
   *
   * Depois que a aba termina de abrir,
   * o cartão começa a sair do envelope.
   */
  window.setTimeout(() => {

    welcome.classList.add(
      'is-opening-card'
    );

  }, ANIMATION_TIMING.cardStart);


  /*
   * ETAPA 3
   *
   * Depois que o cartão se movimenta,
   * fazemos a transição para a carta.
   */
  window.setTimeout(() => {

    welcome.classList.add(
      'is-closing'
    );

  }, ANIMATION_TIMING.coverClose);


  /*
   * ETAPA 4
   *
   * A capa desaparece e a carta entra.
   */
  window.setTimeout(() => {

    welcome.hidden = true;

    letter.hidden = false;

    letter.classList.add(
      'is-entering'
    );

    const letterTitle =
      letter.querySelector(
        '#letter-title'
      );

    if (letterTitle) {

      letterTitle.focus({
        preventScroll: true
      });

    }

    isOpening = false;

  }, ANIMATION_TIMING.letterEnter);

}


/* =========================================================
   VOLTAR PARA A CAPA
========================================================= */

function returnToCover() {

  letter.hidden = true;

  letter.classList.remove(
    'is-entering'
  );

  welcome.hidden = false;


  /*
   * Remove todas as etapas da animação.
   *
   * O envelope volta automaticamente
   * para o estado inicial:
   *
   * - aba fechada
   * - cartão dentro
   * - selo visível
   */
  welcome.classList.remove(
    'is-opening-envelope',
    'is-opening-card',
    'is-closing',
    'is-flap-turned'
  );


  floralSealAnimations.forEach(
    (animation) => animation.cancel()
  );

  floralSealAnimations = [];


  window.cancelAnimationFrame(
    flapTurnFrame
  );

  flapTurnFrame = null;

  isOpening = false;


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });


  envelope.focus({
    preventScroll: true
  });

}


/* =========================================================
   EVENTOS
========================================================= */

envelope.addEventListener(
  'click',
  openInvitation
);


envelope.addEventListener(
  'keydown',
  (event) => {

    if (
      event.key === 'Enter' ||
      event.key === ' '
    ) {

      event.preventDefault();

      openInvitation();

    }

  }
);


backButton.addEventListener(
  'click',
  returnToCover
);


/* =========================================================
   RSVP
========================================================= */

rsvpForm.addEventListener(
  'submit',
  (event) => {

    event.preventDefault();

    feedback.textContent =
      'A confirmação será conectada ao RSVP quando a API e o Supabase forem configurados.';

  }
);