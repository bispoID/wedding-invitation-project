/* =========================================================
   DEPENDÊNCIAS
========================================================= */

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
   CONFIGURAÇÃO DA ANIMAÇÃO
========================================================= */

const ANIMATION_TIMING = {
  cardStart: 4800,
  coverClose: 7500,
  letterEnter: 7050,
};


/* =========================================================
   CONTROLE DO ENVELOPE
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


  /* -------------------------------------------------------
     ABRIR CONVITE
  ------------------------------------------------------- */

  function openInvitation() {

    // Evita múltiplos cliques durante a animação.
    if (isOpening) {
      return;
    }

    isOpening = true;


    /*
     * ETAPA 1
     *
     * Abre a aba superior e inicia o movimento
     * das decorações.
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
     * a capa começa a fechar.
     */
    window.setTimeout(() => {

      welcome.classList.add(
        'is-closing'
      );

    }, ANIMATION_TIMING.coverClose);


    /*
     * ETAPA 4
     *
     * A capa desaparece e a carta entra em cena.
     */
    window.setTimeout(() => {

      welcome.hidden = true;

      showLetter(letter);

      isOpening = false;

    }, ANIMATION_TIMING.letterEnter);
  }


  /* -------------------------------------------------------
     VOLTAR PARA A CAPA
  ------------------------------------------------------- */

  function returnToCover() {

    hideLetter(letter);

    welcome.hidden = false;


    /*
     * Remove todas as etapas da animação.
     *
     * O envelope volta automaticamente para o estado inicial:
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


  /* -------------------------------------------------------
     EVENTOS DO ENVELOPE
  ------------------------------------------------------- */

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
