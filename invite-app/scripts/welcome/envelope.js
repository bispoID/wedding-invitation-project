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
 * Ajusta a apresentação do fluxo em desenvolvimento para previews estáticos.
 *
 * @param {{welcome: HTMLElement, letter: HTMLElement, mode: string}} params
 * @returns {void}
 */
function applyDeveloperPreview({ welcome, letter, mode }) {
  if (!mode) {
    return;
  }

  resetFloralSealAnimations();

  welcome.classList.remove(
    'is-opening-envelope',
    'is-opening-card',
    'is-dev-preview-card'
  );

  letter.classList.remove('is-entering');

  if (mode === 'cover') {
    welcome.hidden = false;
    letter.hidden = true;
    return;
  }

  if (mode === 'envelope-card') {
    welcome.hidden = false;
    letter.hidden = true;
    welcome.classList.add('is-dev-preview-card');
    return;
  }

  if (mode === 'letter') {
    welcome.hidden = true;
    letter.hidden = false;
    letter.classList.remove('is-entering');
  }
}


/**
 * Cria um painel de preview que permite alternar rapidamente entre capa, cartão e carta.
 *
 * @param {{welcome: HTMLElement, letter: HTMLElement, activeMode?: string}} params
 * @returns {void}
 */
export function initDeveloperPreviewControls({ welcome, letter, activeMode = 'cover' }) {
  const panelId = 'dev-preview-panel';
  const existingPanel = document.getElementById(panelId);

  if (existingPanel) {
    existingPanel.remove();
  }

  const panel = document.createElement('div');
  panel.id = panelId;
  panel.setAttribute('role', 'toolbar');
  panel.setAttribute('aria-label', 'Controles de preview do convite');
  panel.style.position = 'fixed';
  panel.style.right = '1rem';
  panel.style.bottom = '1rem';
  panel.style.zIndex = '9999';
  panel.style.display = 'flex';
  panel.style.gap = '0.5rem';
  panel.style.padding = '0.5rem';
  panel.style.borderRadius = '999px';
  panel.style.background = 'rgba(22, 20, 18, 0.75)';
  panel.style.backdropFilter = 'blur(8px)';
  panel.style.boxShadow = '0 0.75rem 1.5rem rgba(0, 0, 0, 0.18)';

  const options = [
    { value: 'cover', label: 'Capa' },
    { value: 'envelope-card', label: 'Cartão' },
    { value: 'letter', label: 'Carta' }
  ];

  options.forEach(({ value, label }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('data-preview', value);
    button.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    button.style.borderRadius = '999px';
    button.style.padding = '0.45rem 0.75rem';
    button.style.background = value === activeMode
      ? 'rgba(255, 255, 255, 0.18)'
      : 'transparent';
    button.style.color = '#f5efe7';
    button.style.cursor = 'pointer';
    button.style.fontSize = '0.72rem';
    button.style.fontWeight = '600';
    button.style.letterSpacing = '0.08em';
    button.style.textTransform = 'uppercase';

    button.addEventListener('click', () => {
      const nextMode = value;
      const url = new URL(window.location.href);
      url.searchParams.set('devmode', nextMode);
      window.history.replaceState({}, '', url);

      applyDeveloperPreview({ welcome, letter, mode: nextMode });

      if (nextMode === 'cover') {
        resetFloralSealAnimations();
      }

      [...panel.querySelectorAll('button[data-preview]')].forEach((item) => {
        const isSelected = item.getAttribute('data-preview') === nextMode;
        item.style.background = isSelected
          ? 'rgba(255, 255, 255, 0.18)'
          : 'transparent';
      });
    });

    panel.appendChild(button);
  });

  const exitButton = document.createElement('button');
  exitButton.type = 'button';
  exitButton.textContent = 'Sair';
  exitButton.style.border = '1px solid rgba(255, 255, 255, 0.15)';
  exitButton.style.borderRadius = '999px';
  exitButton.style.padding = '0.45rem 0.75rem';
  exitButton.style.background = 'rgba(255, 255, 255, 0.06)';
  exitButton.style.color = '#f5efe7';
  exitButton.style.cursor = 'pointer';
  exitButton.style.fontSize = '0.72rem';
  exitButton.style.fontWeight = '600';
  exitButton.style.letterSpacing = '0.08em';
  exitButton.style.textTransform = 'uppercase';

  exitButton.addEventListener('click', () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('devmode');
    window.history.replaceState({}, '', url);

    panel.remove();

    applyDeveloperPreview({
      welcome,
      letter,
      mode: 'cover'
    });
  });

  panel.appendChild(exitButton);
  document.body.appendChild(panel);
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
