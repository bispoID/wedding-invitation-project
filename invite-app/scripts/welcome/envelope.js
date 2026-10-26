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
  decorations: '.envelope__decorations',
  cardControl: '.card-pause-control',
  card: '.envelope__card'
});

/* Os valores reais ficam em styles/base/variables.css. */
const TIMING_VARIABLES = Object.freeze({
  openingPause: '--motion-opening-pause',
  cardStart: '--motion-card-start',
  cardDuration: '--motion-card-duration',
  letterEnter: '--motion-letter-enter'
});


/**
 * Obtém os marcos da sequência diretamente dos tokens CSS.
 *
 * @returns {{openingPause: number, cardStart: number, cardDuration: number, letterEnter: number}} Marcos em ms.
 */
function readAnimationTiming() {
  // CSS é a fonte de verdade para que a animação visual e os timers coincidam.
  return {
    openingPause: readMilliseconds(TIMING_VARIABLES.openingPause),
    cardStart: readMilliseconds(TIMING_VARIABLES.cardStart),
    cardDuration: readMilliseconds(TIMING_VARIABLES.cardDuration),
    letterEnter: readMilliseconds(TIMING_VARIABLES.letterEnter)
  };
}

/** Mantém os tokens normais; reduce apresenta o cartão sem avanço automático. */
function effectiveAnimationTiming(normalTiming, reducedMotion) {
  return reducedMotion
    ? { openingPause: 0, cardStart: 0, cardDuration: 0, letterEnter: null }
    : normalTiming;
}


/* Estados explícitos evitam que um callback antigo revele a carta após a espera. */
const FLOW_STATES = Object.freeze({
  IDLE: 'idle',
  OPENING: 'opening',
  CARD_PRESENTING: 'card-presenting',
  CARD_PRESENTED: 'card-presented',
  WAITING_FOR_CARD_COMPLETION: 'waiting-for-card-completion',
  WAITING_FOR_CONTINUE: 'waiting-for-continue',
  TRANSITION_AUTHORIZED: 'transition-authorized',
  COMPLETED: 'completed'
});


/**
 * Cria o controlador que liga os elementos da interface à sequência de abertura.
 *
 * @param {object} elements Elementos encontrados na capa e na carta.
 * @param {HTMLElement} elements.welcome Seção da capa.
 * @param {HTMLElement} elements.letter Seção da carta.
 * @param {HTMLElement} elements.seal Selo interativo.
 * @param {HTMLElement} elements.backButton Botão de retorno para a capa.
 * @param {HTMLElement} elements.decorations Grupo de flores e selo.
 * @param {HTMLButtonElement} elements.cardControl Controle de espera do cartão.
 * @param {HTMLElement} elements.card Conteúdo do cartão oculto pelo envelope.
 * @returns {void}
 */
function createInvitationController({
  welcome,
  letter,
  seal,
  backButton,
  decorations,
  cardControl,
  card
}) {

  /*
   * Os IDs ficam separados porque a espera cancela somente a revelação da
   * carta, preservando o timer que acompanha o movimento natural do cartão.
   */
  const animationTiming = readAnimationTiming();
  const pendingTimers = new Set();
  let flowState = FLOW_STATES.IDLE;
  let openingTimerId = null;
  let cardStartTimerId = null;
  let cardCompletionTimerId = null;
  let letterTimerId = null;
  let cardAnimationComplete = false;
  let flowRunId = 0;


  /**
   * Agenda uma etapa e registra seu ID para cancelamento posterior.
   *
   * @param {Function} callback Etapa que deve ser executada.
   * @param {number} delay Atraso em milissegundos.
   * @returns {number} ID do timer criado.
   */
  function schedule(callback, delay) {
    const timerId = window.setTimeout(() => {
      pendingTimers.delete(timerId);
      callback();
    }, delay);

    pendingTimers.add(timerId);
    return timerId;
  }


  /**
   * Cancela um timer específico sem tocar nas outras etapas da abertura.
   *
   * @param {number|null} timerId ID do timer ou null.
   * @returns {void}
   */
  function cancelTimer(timerId) {
    if (timerId === null) {
      return;
    }

    window.clearTimeout(timerId);
    pendingTimers.delete(timerId);
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

    openingTimerId = null;
    cardStartTimerId = null;
    cardCompletionTimerId = null;
    letterTimerId = null;
  }


  /**
   * Coloca o controle em seu estado inicial e o retira da navegação.
   *
   * @returns {void}
   */
  function resetCardControl() {
    cardControl.hidden = true;
    cardControl.disabled = false;
    cardControl.removeAttribute('data-dev-preview');
    cardControl.textContent = 'Pausar';
    cardControl.setAttribute('data-card-symbol', '⏸');
    cardControl.setAttribute('data-card-control-state', 'pause');
    cardControl.setAttribute(
      'aria-label',
      'Pausar antes de abrir a carta'
    );
    cardControl.removeAttribute('aria-disabled');
  }


  /**
   * Exibe o botão quando o cartão começa a sair do envelope.
   *
   * @returns {void}
   */
  function showWaitControl() {
    cardControl.hidden = false;
    cardControl.disabled = false;
    cardControl.textContent = 'Pausar';
    cardControl.setAttribute('data-card-symbol', '⏸');
    cardControl.setAttribute('data-card-control-state', 'pause');
    cardControl.setAttribute(
      'aria-label',
      'Pausar antes de abrir a carta'
    );
    cardControl.removeAttribute('aria-disabled');
  }


  /**
   * Atualiza o mesmo botão para a ação de retomada, preservando seu foco.
   *
   * @returns {void}
   */
  function showContinueControl() {
    cardControl.hidden = false;
    cardControl.textContent = 'Continuar';
    cardControl.setAttribute('data-card-symbol', '▶');
    cardControl.setAttribute('data-card-control-state', 'continue');
    cardControl.setAttribute(
      'aria-label',
      'Continuar para a carta'
    );
  }


  /**
   * Finaliza visualmente o controle antes de revelar a carta.
   *
   * @returns {void}
   */
  function hideCardControl() {
    cardControl.hidden = true;
    cardControl.disabled = false;
    cardControl.removeAttribute('aria-disabled');
  }


  /**
   * Revela a carta somente depois que o cartão concluiu seu movimento.
   *
   * @returns {void}
   */
  function revealLetter() {
    if (
      flowState === FLOW_STATES.COMPLETED ||
      !cardAnimationComplete
    ) {
      return;
    }

    flowState = FLOW_STATES.TRANSITION_AUTHORIZED;
    hideCardControl();
    welcome.hidden = true;
    showLetter(letter);
    flowState = FLOW_STATES.COMPLETED;
  }


  /**
   * Autoriza a carta uma única vez e aguarda o término natural do cartão.
   *
   * @returns {void}
   */
  function authorizeLetterTransition() {
    if (
      flowState !== FLOW_STATES.WAITING_FOR_CARD_COMPLETION &&
      flowState !== FLOW_STATES.WAITING_FOR_CONTINUE
    ) {
      return;
    }

    flowState = FLOW_STATES.TRANSITION_AUTHORIZED;
    cardControl.disabled = true;
    cardControl.setAttribute('aria-disabled', 'true');

    if (cardAnimationComplete) {
      revealLetter();
    }
  }


  /**
   * Suspende apenas a passagem automática para a carta.
   *
   * @returns {void}
   */
  function requestCardPause() {
    if (
      flowState !== FLOW_STATES.CARD_PRESENTING &&
      flowState !== FLOW_STATES.CARD_PRESENTED
    ) {
      return;
    }

    cancelTimer(letterTimerId);
    letterTimerId = null;
    showContinueControl();

    flowState = cardAnimationComplete
      ? FLOW_STATES.WAITING_FOR_CONTINUE
      : FLOW_STATES.WAITING_FOR_CARD_COMPLETION;
  }


  /**
   * Roteia as duas ações do botão sem criar controles concorrentes.
   *
   * @returns {void}
   */
  function handleCardControl() {
    if (cardControl.getAttribute?.('data-dev-preview') === 'true') {
      const isPauseState = cardControl.getAttribute('data-card-control-state') !== 'continue';

      cardControl.textContent = isPauseState ? 'Continuar' : 'Pausar';
      cardControl.setAttribute(
        'data-card-symbol',
        isPauseState ? '▶' : '⏸'
      );
      cardControl.setAttribute(
        'data-card-control-state',
        isPauseState ? 'continue' : 'pause'
      );
      cardControl.setAttribute(
        'aria-label',
        isPauseState
          ? 'Continuar para a carta'
          : 'Pausar antes de abrir a carta'
      );
      return;
    }

    if (
      flowState === FLOW_STATES.CARD_PRESENTING ||
      flowState === FLOW_STATES.CARD_PRESENTED
    ) {
      requestCardPause();
      return;
    }

    if (
      flowState === FLOW_STATES.WAITING_FOR_CARD_COMPLETION ||
      flowState === FLOW_STATES.WAITING_FOR_CONTINUE
    ) {
      authorizeLetterTransition();
    }
  }


  /**
   * Registra o fim natural da animação CSS do cartão.
   *
   * @returns {void}
   */
  function completeCardPresentation(runId) {
    if (runId !== flowRunId) {
      return;
    }

    cardCompletionTimerId = null;
    cardAnimationComplete = true;

    if (flowState === FLOW_STATES.WAITING_FOR_CARD_COMPLETION) {
      flowState = FLOW_STATES.WAITING_FOR_CONTINUE;
      return;
    }

    if (flowState === FLOW_STATES.TRANSITION_AUTHORIZED) {
      revealLetter();
      return;
    }

    if (flowState === FLOW_STATES.CARD_PRESENTING) {
      flowState = FLOW_STATES.CARD_PRESENTED;
    }
  }


  /**
   * Interrompe a abertura e restaura apenas o estado visual do convite.
   * Os valores preenchidos no formulário não são alterados.
   *
   * @returns {void}
   */
  function resetInvitationState() {
    flowRunId += 1;
    cancelScheduledSteps();
    resetCardControl();
    card.setAttribute('aria-hidden', 'true');

    welcome.hidden = false;
    letter.hidden = true;

    welcome.classList.remove(
      'is-opening-envelope',
      'is-opening-card',
      'is-opening-invitation',
      'is-dev-preview-card'
    );

    letter.classList.remove('is-entering');
    resetFloralSealAnimations();

    flowState = FLOW_STATES.IDLE;
    cardAnimationComplete = false;
    seal.removeAttribute('aria-disabled');
  }


  /**
   * Executa a sequência completa de abertura do convite.
   *
   * 1. Abre a aba superior e move as decorações.
   * 2. Libera a saída do cartão no marco configurado.
   * 3. Inicia a saída do cartão e agenda sua conclusão natural.
   * 4. Oculta a capa e revela a carta.
   *
   * O estado explícito protege as etapas contra cliques ou teclas repetidas.
   *
   * @returns {void}
   */
  function openInvitation() {

    // O selo é o único gatilho e não pode iniciar duas sequências ao mesmo tempo.
    if (flowState !== FLOW_STATES.IDLE) {
      return;
    }

    flowState = FLOW_STATES.OPENING;
    cardAnimationComplete = false;
    const runId = flowRunId + 1;
    // A preferência é capturada por abertura, como já ocorria com a conclusão
    // do cartão. Não se introduz ressincronização de timers no meio do fluxo.
    const timing = effectiveAnimationTiming(animationTiming, window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches);
    flowRunId = runId;
    seal.setAttribute('aria-disabled', 'true');
    welcome.classList.add('is-opening-invitation');

    openingTimerId = schedule(() => {
      if (runId !== flowRunId) {
        return;
      }

      openingTimerId = null;

      // Etapa 1: CSS inicia a aba superior; a Web Animation move o selo e flores.
      welcome.classList.add(
        'is-opening-envelope'
      );

      animateFloralSealExit(decorations);

      // Etapa 2: o cartão começa a sair depois que a aba já avançou.
      cardStartTimerId = schedule(() => {
        if (runId !== flowRunId) {
          return;
        }

        cardStartTimerId = null;
        card.setAttribute('aria-hidden', 'false');
        flowState = FLOW_STATES.CARD_PRESENTING;
        showWaitControl();

        welcome.classList.add(
          'is-opening-card'
        );

        cardCompletionTimerId = schedule(
          () => completeCardPresentation(runId),
          timing.cardDuration
        );

        if (timing.letterEnter === null) {
          // O cartão já está em espera: Continuar permanece acionável sem
          // disputar uma janela automática curta com o usuário de teclado.
          requestCardPause();
          cardControl.focus({ preventScroll: true });
        }
      }, timing.cardStart);

      if (timing.letterEnter === null) return;

      // Etapa 3: a capa é ocultada e a carta recebe o foco.
      letterTimerId = schedule(() => {
        if (runId !== flowRunId) {
          return;
        }

        letterTimerId = null;

        // Um callback antigo nunca pode furar uma espera já solicitada.
        if (
          flowState !== FLOW_STATES.CARD_PRESENTING &&
          flowState !== FLOW_STATES.CARD_PRESENTED
        ) {
          return;
        }

        flowState = FLOW_STATES.TRANSITION_AUTHORIZED;
        revealLetter();
      }, timing.letterEnter);
    }, timing.openingPause);
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
    resetInvitationState();

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

  cardControl.addEventListener(
    'click',
    handleCardControl
  );

  resetInvitationState();

  return {
    resetInvitationState
  };
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

  const invitationController = createInvitationController({
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
      card: elements.card,
      cardControl: elements.cardControl,
      mode: devPreview
    });

    initDeveloperPreviewControls({
      welcome: elements.welcome,
      letter: elements.letter,
      card: elements.card,
      cardControl: elements.cardControl,
      activeMode: devPreview,
      resetInvitationState: invitationController.resetInvitationState
    });
  }
}
