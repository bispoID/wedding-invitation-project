import { resetFloralSealAnimations } from '../welcome/decorations.js';

// Este módulo só é ativado por `?devmode=...`; não participa do fluxo público
// quando o parâmetro não foi solicitado.

/**
 * Ajusta a apresentação do fluxo em desenvolvimento para previews estáticos.
 *
 * @param {{welcome: HTMLElement, letter: HTMLElement, cardControl?: HTMLButtonElement, mode: string}} params
 * @returns {void}
 */
export function applyDeveloperPreview({ welcome, letter, cardControl, mode }) {
  if (!mode) {
    return;
  }

  const isCardPreview = mode === 'envelope-card';

  if (cardControl) {
    cardControl.hidden = !isCardPreview;

    if (isCardPreview) {
      cardControl.setAttribute('data-dev-preview', 'true');
      cardControl.disabled = false;
      cardControl.textContent = 'Pausar';
      cardControl.setAttribute('data-card-symbol', '⏸');
      cardControl.setAttribute('data-card-control-state', 'pause');
      cardControl.setAttribute(
        'aria-label',
        'Pausar antes de abrir a carta'
      );
    } else {
      cardControl.removeAttribute('data-dev-preview');
    }
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
 * @param {{welcome: HTMLElement, letter: HTMLElement, cardControl?: HTMLButtonElement, activeMode?: string, resetInvitationState: Function}} params
 * @returns {void}
 */
export function initDeveloperPreviewControls({
  welcome,
  letter,
  cardControl,
  activeMode = 'cover',
  resetInvitationState
}) {
  const panelId = 'dev-preview-panel';
  const existingPanel = document.getElementById(panelId);

  if (existingPanel) {
    existingPanel.remove();
  }

  const panel = document.createElement('div');
  panel.id = panelId;
  panel.setAttribute('role', 'toolbar');
  panel.setAttribute('aria-label', 'Controles de preview do convite');

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
    button.setAttribute('aria-pressed', String(value === activeMode));

    if (value === activeMode) {
      button.classList.add('is-active');
    }

    button.addEventListener('click', () => {
      const nextMode = value;
      const url = new URL(window.location.href);
      url.searchParams.set('devmode', nextMode);
      window.history.replaceState({}, '', url);

      resetInvitationState();
      applyDeveloperPreview({
        welcome,
        letter,
        cardControl,
        mode: nextMode
      });

      [...panel.querySelectorAll('button[data-preview]')].forEach((item) => {
        const isSelected = item.getAttribute('data-preview') === nextMode;
        item.classList.toggle('is-active', isSelected);
        item.setAttribute('aria-pressed', String(isSelected));
      });
    });

    panel.appendChild(button);
  });

  const exitButton = document.createElement('button');
  exitButton.type = 'button';
  exitButton.textContent = 'Sair';
  exitButton.className = 'dev-preview-exit';

  exitButton.addEventListener('click', () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('devmode');
    window.history.replaceState({}, '', url);

    panel.remove();

    resetInvitationState();
    applyDeveloperPreview({
      welcome,
      letter,
      cardControl,
      mode: 'cover'
    });
  });

  panel.appendChild(exitButton);
  document.body.appendChild(panel);
}
