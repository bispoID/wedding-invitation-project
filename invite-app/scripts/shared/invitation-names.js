/* Estados tipográficos próprios do cartão e da carta; a capa é independente. */
const LONG_NAMES_CLASS = 'has-long-names';

/** Mede a composição original sem alterar os spans ou o título visível. */
function measureOriginalNames(title, container) {
  const probe = title.cloneNode(true);
  probe.removeAttribute('id');
  probe.removeAttribute('tabindex');
  probe.setAttribute('aria-hidden', 'true');
  probe.classList.remove(LONG_NAMES_CLASS);
  Object.assign(probe.style, {
    position: 'absolute', visibility: 'hidden', pointerEvents: 'none',
    width: 'max-content', maxWidth: 'none', height: 'auto',
    margin: '0', padding: '0', whiteSpace: 'nowrap', overflow: 'visible',
  });
  for (const span of probe.querySelectorAll('.script-name')) {
    Object.assign(span.style, { whiteSpace: 'nowrap', minWidth: 'max-content' });
  }
  container.appendChild(probe);
  try {
    return probe.scrollWidth;
  } finally {
    probe.remove();
  }
}

export function initInvitationNames() {
  const card = document.querySelector('.envelope__card-inner');
  const letter = document.querySelector('.letter__header');
  const targets = [
    { container: card, title: card?.querySelector('.envelope__card-names'), widthRatio: 0.65 },
    { container: letter, title: letter?.querySelector('#letter-title'), widthRatio: 1 },
  ].filter(({ container, title }) => container && title);
  if (!targets.length) return;

  let frame = null;
  const update = () => {
    for (const { container, title, widthRatio } of targets) {
      const availableWidth = container.clientWidth * widthRatio;
      // A carta oculta não tem geometria válida; será medida ao ser exibida.
      if (availableWidth <= 0) continue;
      const originalWidth = measureOriginalNames(title, container);
      if (!Number.isFinite(originalWidth) || originalWidth <= 0) continue;
      const wrapped = originalWidth > availableWidth + 1;
      title.classList.toggle(LONG_NAMES_CLASS, wrapped);
      if (container === card) container.classList.toggle(LONG_NAMES_CLASS, wrapped);
    }
  };
  const schedule = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(update);
  };

  document.addEventListener('invitation:content-updated', schedule);
  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule, { once: true });
  document.fonts?.ready?.then(schedule);
  document.fonts?.addEventListener?.('loadingdone', schedule);

  if ('ResizeObserver' in window) {
    const observer = new window.ResizeObserver(schedule);
    targets.forEach(({ container }) => observer.observe(container));
  }
  if ('MutationObserver' in window) {
    const observer = new window.MutationObserver(schedule);
    for (const { container } of targets) {
      const section = container.closest('.welcome, .letter');
      if (section) observer.observe(section, { attributes: true, attributeFilter: ['hidden'] });
    }
  }
  schedule();
}
