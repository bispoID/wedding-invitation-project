/* =========================================================
   DEPENDÊNCIAS
========================================================= */

import {
  animateFloralSealExit,
  resetFloralSealAnimations
} from './decorations.js';

import {
  showLetter,
  hideLetter
} from '../letter/letter.js';


/* =========================================================
   CONFIGURAÇÃO DA ANIMAÇÃO
========================================================= */

const ANIMATION_TIMING = {
  cardStart: 4700,
  letterEnter: 8650,
};


/* =========================================================
   CONTROLE DO ENVELOPE
========================================================= */

function createInvitationController({
  welcome,
  letter,
  seal,
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
      'is-opening-card'
    );


    resetFloralSealAnimations();

    isOpening = false;


    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });


    seal.focus({
      preventScroll: true
    });
  }


  /* -------------------------------------------------------
     EVENTOS DO ENVELOPE
  ------------------------------------------------------- */

  seal.addEventListener(
    'click',
    openInvitation
  );

  seal.addEventListener(
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

export function initEnvelope({ devSkipWelcome = false } = {}) {

  const welcome =
    document.querySelector('.welcome');

  const letter =
    document.querySelector('.letter');

  const seal =
    document.querySelector('.envelope__seal');

  const backButton =
    document.querySelector('.back-to-cover');

  const decorations =
    document.querySelector('.envelope__decorations');

  if (
    !welcome ||
    !letter ||
    !seal ||
    !backButton ||
    !decorations
  ) {
    return;
  }

  createInvitationController({
    welcome,
    letter,
    seal,
    backButton,
    decorations
  });


  /* -------------------------------------------------------
     MODO DESENVOLVEDOR
  ------------------------------------------------------- */

  if (devSkipWelcome) {

    // Inicia diretamente na carta, sem executar a animação
    // de abertura do envelope.
    welcome.hidden = true;
    letter.hidden = false;
    letter.classList.remove('is-entering');
  }
}
