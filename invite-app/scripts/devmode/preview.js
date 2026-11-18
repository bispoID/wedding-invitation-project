import { resetFloralSealAnimations } from '../welcome/decorations.js';

// Este módulo só é ativado por `?devmode=...`; não participa do fluxo público
// quando o parâmetro não foi solicitado.

/**
 * Ajusta a apresentação do fluxo em desenvolvimento para previews estáticos.
 *
 * @param {{welcome: HTMLElement, letter: HTMLElement, card?: HTMLElement, cardControl?: HTMLButtonElement, mode: string}} params
 * @returns {void}
 */
export function applyDeveloperPreview({ welcome, letter, card, cardControl, mode }) {
  if (!mode) {
    return;
  }

  const isCardPreview = mode === 'envelope-card';
  card?.setAttribute('aria-hidden', String(!isCardPreview));

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


const panelCleanups = new WeakMap();

function enableMovement(panel, handle) {
  const viewport = window.visualViewport;
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  let drag = null;
  let moved = false;

  function place(left, top) {
    const x = viewport?.offsetLeft ?? 0;
    const y = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? document.documentElement.clientWidth;
    const height = viewport?.height ?? document.documentElement.clientHeight;
    panel.style.maxWidth = `calc(${width}px - max(8px, var(--left-gap)) - max(8px, var(--right-gap)))`;
    panel.style.maxHeight = `calc(${height}px - max(8px, var(--top-gap)) - max(8px, var(--bottom-gap)))`;
    if (!moved) {
      // Deixa a media query escolher o canto inicial novamente após um resize.
      Object.assign(panel.style, { left: '', top: '', right: '', bottom: '' });
    }
    const rect = panel.getBoundingClientRect();
    const css = getComputedStyle(panel);
    const gap = side => Math.max(8, parseFloat(css.getPropertyValue(`--${side}-gap`)) || 0);
    const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
    const nextX = clamp(left ?? rect.left, x + gap('left'), x + width - rect.width - gap('right'));
    const nextY = clamp(top ?? rect.top, y + gap('top'), y + height - rect.height - gap('bottom'));
    if (moved || nextX !== rect.left || nextY !== rect.top) {
      Object.assign(panel.style, { left: `${nextX}px`, top: `${nextY}px`, right: 'auto', bottom: 'auto' });
    }
  }

  function stop() {
    if (!drag) return;
    const { id } = drag;
    drag = null;
    handle.removeAttribute('data-dragging');
    if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
  }

  handle.addEventListener('pointerdown', event => {
    if (drag || event.button !== 0 || !event.isPrimary) return;
    const rect = panel.getBoundingClientRect();
    handle.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    handle.setAttribute('data-dragging', '');
  }, options);
  handle.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const left = event.clientX - drag.dx;
    const top = event.clientY - drag.dy;
    const rect = panel.getBoundingClientRect();
    if (left === rect.left && top === rect.top) return;
    moved = true;
    place(left, top);
  }, options);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    handle.addEventListener(type, event => {
      if (event.pointerId === drag?.id) stop();
    }, options);
  }
  const directions = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
  handle.addEventListener('keydown', event => {
    if (drag || !Object.hasOwn(directions, event.key)) return;
    event.preventDefault();
    const [dx, dy] = directions[event.key];
    const rect = panel.getBoundingClientRect();
    moved = true;
    place(rect.left + dx, rect.top + dy);
  }, options);

  const fit = () => place();
  window.addEventListener('resize', fit, options);
  viewport?.addEventListener('resize', fit, options);
  viewport?.addEventListener('scroll', fit, options);
  const observer = window.ResizeObserver && new window.ResizeObserver(fit);
  observer?.observe(panel);
  fit();
  return () => {
    stop();
    listeners.abort();
    observer?.disconnect();
  };
}

/**
 * Cria um painel de preview que permite alternar rapidamente entre capa, cartão e carta.
 *
 * @param {{welcome: HTMLElement, letter: HTMLElement, card?: HTMLElement, cardControl?: HTMLButtonElement, activeMode?: string, resetInvitationState: Function}} params
 * @returns {void}
 */
export function initDeveloperPreviewControls({
  welcome,
  letter,
  card,
  cardControl,
  activeMode = 'cover',
  resetInvitationState
}) {
  const panelId = 'dev-preview-panel';
  const existingPanel = document.getElementById(panelId);

  if (existingPanel) {
    panelCleanups.get(existingPanel)?.();
    existingPanel.remove();
  }

  const panel = document.createElement('div');
  panel.id = panelId;
  panel.setAttribute('role', 'toolbar');
  panel.setAttribute('aria-label', 'Controles de preview do convite');

  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'dev-preview-handle';
  handle.setAttribute('aria-label', 'Mover painel de desenvolvimento');
  handle.title = 'Arraste ou use as teclas direcionais para mover o painel';
  for (let i = 0; i < 6; i++) {
    const dot = document.createElement('span');
    dot.setAttribute('aria-hidden', 'true');
    handle.appendChild(dot);
  }
  panel.appendChild(handle);
  const controls = document.createElement('div');
  controls.className = 'dev-preview-controls';
  panel.appendChild(controls);

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
        card,
        cardControl,
        mode: nextMode
      });

      [...controls.querySelectorAll('button[data-preview]')].forEach((item) => {
        const isSelected = item.getAttribute('data-preview') === nextMode;
        item.classList.toggle('is-active', isSelected);
        item.setAttribute('aria-pressed', String(isSelected));
      });
    });

    controls.appendChild(button);
  });

  const exitButton = document.createElement('button');
  exitButton.type = 'button';
  exitButton.textContent = 'Sair';
  exitButton.className = 'dev-preview-exit';

  exitButton.addEventListener('click', () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('devmode');
    window.history.replaceState({}, '', url);

    panelCleanups.get(panel)();
    panel.remove();

    resetInvitationState();
    applyDeveloperPreview({
      welcome,
      letter,
      card,
      cardControl,
      mode: 'cover'
    });
  });

  controls.appendChild(exitButton);
  document.body.appendChild(panel);
  panelCleanups.set(panel, enableMovement(panel, handle));
}
