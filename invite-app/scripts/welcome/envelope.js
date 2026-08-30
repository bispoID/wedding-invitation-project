import {
  animateFloralSealExit,
  resetFloralSealAnimations
} from './decorations.js';

import {
  startFlapWatch,
  stopFlapWatch
} from './flap.js';

import {
  showLetter,
  hideLetter
} from '../letter/letter.js';


/* =========================================================
   TEMPOS DA ANIMAÇÃO
========================================================= */

const ANIMATION_TIMING = {
  cardStart: 4800,
  coverClose: 7500,
  letterEnter: 7050,
};


/* =========================================================
   ABRIR CONVITE
========================================================= */

function createInvitationController({
  welcome,
  letter,
  envelope,
  flap,
  backButton,
  decorations
}) {

  let isOpening = false;


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

    animateFloralSealExit(decorations);

    startFlapWatch(
      welcome,
      flap
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

      envelope.querySelector(
        '.envelope__card'
      ).style.zIndex = '11';

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

      showLetter(letter);

      isOpening = false;

    }, ANIMATION_TIMING.letterEnter);
  }


  /* =======================================================
     VOLTAR PARA A CAPA
  ======================================================= */

  function returnToCover() {

    hideLetter(letter);

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


    resetFloralSealAnimations();

    stopFlapWatch();

    isOpening = false;


    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });


    envelope.focus({
      preventScroll: true
    });
  }


  /* =======================================================
     EVENTOS
  ======================================================= */

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
}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

export function initEnvelope() {

  const welcome =
    document.querySelector('.welcome');

  const letter =
    document.querySelector('.letter');

  const envelope =
    document.querySelector('.envelope');

  const flap =
    document.querySelector('.envelope__flap');

  const backButton =
    document.querySelector('.back-to-cover');

  const decorations =
    document.querySelector('.envelope__decorations');

  if (
    !welcome ||
    !letter ||
    !envelope ||
    !flap ||
    !backButton ||
    !decorations
  ) {
    return;
  }

  createInvitationController({
    welcome,
    letter,
    envelope,
    flap,
    backButton,
    decorations
  });
}
