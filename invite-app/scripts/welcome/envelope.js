import {
  animateFloralSealExit,
  resetFloralSealAnimations
} from './decorations.js';

import {
  showLetter,
  hideLetter
} from '../letter/letter.js';

import {
  readMilliseconds
} from '../shared/css.js';

import {
  applyDeveloperPreview,
  initDeveloperPreviewControls
} from '../devmode/preview.js';


/* Mapa central para evitar seletores espalhados pelo controlador. */
const SELECTORS = Object.freeze({
  welcome: '.welcome',
  letter: '.letter',
  seal: '.envelope__seal',
  backButton: '.back-to-cover',
  decorations: '.envelope__decorations'
});

/* Os valores reais ficam em styles/base/variables.css. */
const TIMING_VARIABLES = Object.freeze({
  cardStart: '--motion-card-start',
  letterEnter: '--motion-letter-enter'
});


/**
 * Obtém os marcos da sequência diretamente dos tokens CSS.
 *
 * @returns {{cardStart: number, letterEnter: number}} Marcos em ms.
 */
function readAnimationTiming() {
  // CSS é a fonte de verdade para que a animação visual e os timers coincidam.
  return {
    cardStart: readMilliseconds(TIMING_VARIABLES.cardStart),
    letterEnter: readMilliseconds(TIMING_VARIABLES.letterEnter)
  };
}


/**
 * Cria o controlador que liga os elementos da interface à sequência de abertura.
 *
 * @param {object} elements Elementos encontrados na capa e na carta.
 * @param {HTMLElement} elements.welcome Seção da capa.
 * @param {HTMLElement} elements.letter Seção da carta.
 * @param {HTMLElement} elements.seal Selo interativo.
 * @param {HTMLElement} elements.backButton Botão de retorno para a capa.
 * @param {HTMLElement} elements.decorations Grupo de flores e selo.
 * @returns {void}
 */
function createInvitationController({
  welcome,
  letter,
  seal,
  backButton,
  decorations
}) {

  /*
   * A sequência tem duas etapas agendadas. Guardar os IDs permite cancelar
   * callbacks antigos quando o usuário retorna para a capa.
   */
  let isOpening = false;
  const animationTiming = readAnimationTiming();
  const pendingTimers = new Set();


  /**
   * Agenda uma etapa e registra seu ID para cancelamento posterior.
   *
   * @param {Function} callback Etapa que deve ser executada.
   * @param {number} delay Atraso em milissegundos.
   * @returns {void}
   */
  function schedule(callback, delay) {
    const timerId = window.setTimeout(() => {
      pendingTimers.delete(timerId);
      callback();
    }, delay);

    pendingTimers.add(timerId);
  }


  /**
   * Interrompe todas as etapas ainda pendentes da abertura atual.
   *
   * @returns {void}
   */
  function cancelScheduledSteps() {
    pendingTimers.forEach(
      (timerId) => window.clearTimeout(timerId)
    );

    pendingTimers.clear();
  }


  /**
   * Executa a sequência completa de abertura do convite.
   *
   * 1. Abre a aba superior e move as decorações.
   * 2. Libera a saída do cartão no marco configurado.
   * 3. Oculta a capa e revela a carta.
   *
   * O lock isOpening protege as etapas contra cliques ou teclas repetidas.
   *
   * @returns {void}
   */
  function openInvitation() {

    // O selo é o único gatilho e não pode iniciar duas sequências ao mesmo tempo.
    if (isOpening) {
      return;
    }

    isOpening = true;
    seal.setAttribute('aria-disabled', 'true');

    // Etapa 1: CSS inicia a aba superior; a Web Animation move o selo e flores.
    welcome.classList.add(
      'is-opening-envelope'
    );

    animateFloralSealExit(decorations);

    // Etapa 2: o cartão começa a sair depois que a aba já avançou.
    schedule(() => {
      welcome.classList.add(
        'is-opening-card'
      );
    }, animationTiming.cardStart);

    // Etapa 3: a capa é ocultada e a carta recebe o foco.
    schedule(() => {
      welcome.hidden = true;
      showLetter(letter);
      isOpening = false;
    }, animationTiming.letterEnter);
  }


  /**
   * Restaura o estado inicial da experiência e devolve o foco ao selo.
   *
   * @returns {void}
   */
  function returnToCover() {

    if (letter.hidden) {
      return;
    }

    // A operação é idempotente: cliques repetidos após o primeiro são ignorados.
    cancelScheduledSteps();

    hideLetter(letter);

    welcome.hidden = false;

    welcome.classList.remove(
      'is-opening-envelope',
      'is-opening-card'
    );

    resetFloralSealAnimations();

    isOpening = false;
    seal.removeAttribute('aria-disabled');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    seal.focus({
      preventScroll: true
    });
  }


  /* Clique e teclado compartilham a mesma função para manter um único fluxo. */
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


/**
 * Conecta o controlador aos elementos da capa e da carta.
 *
 * @param {{devSkipWelcome?: boolean, devPreview?: string | null}} options Opções de inicialização.
 * @returns {void}
 */
export function initEnvelope({ devSkipWelcome = false, devPreview = null } = {}) {

  const elements = Object.fromEntries(
    Object.entries(SELECTORS).map(
      ([name, selector]) => [name, document.querySelector(selector)]
    )
  );

  // Permite que o módulo falhe silenciosamente se usado em uma página parcial.
  if (Object.values(elements).some((element) => !element)) {
    return;
  }

  createInvitationController({
    ...elements
  });

  if (devSkipWelcome) {
    // O modo de desenvolvimento não dispara nenhuma etapa da abertura.
    elements.welcome.hidden = true;
    elements.letter.hidden = false;
    elements.letter.classList.remove('is-entering');
  }

  if (devPreview) {
    applyDeveloperPreview({
      welcome: elements.welcome,
      letter: elements.letter,
      mode: devPreview
    });

    initDeveloperPreviewControls({
      welcome: elements.welcome,
      letter: elements.letter,
      activeMode: devPreview
    });
  }
}
