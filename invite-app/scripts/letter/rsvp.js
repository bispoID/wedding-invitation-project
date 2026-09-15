/*
 * O RSVP ainda não envia dados. Este intervalo apenas impede cliques
 * repetidos no protótipo; na API real, o lock acompanhará a requisição.
 */
const LOCAL_SUBMIT_COOLDOWN = 600;

const PENDING_MESSAGE =
  'A confirmação será conectada ao RSVP quando a API e o Supabase forem configurados.';


/**
 * Inicializa o RSVP local enquanto a integração com a API não existe.
 *
 * A validação nativa do formulário continua ativa; após um envio válido,
 * o botão é temporariamente desabilitado para absorver cliques repetidos.
 *
 * @returns {void}
 */
export function initRsvp() {
  const rsvpForm = document.querySelector('.rsvp-form');
  const feedback = document.querySelector('.form-feedback');
  const submitButton = rsvpForm?.querySelector('button[type="submit"]');

  if (!rsvpForm || !feedback || !submitButton) {
    return;
  }

  // A validação nativa do formulário continua acontecendo antes do submit.
  let isSubmitLocked = false;

  rsvpForm.addEventListener('submit', (event) => {
    event.preventDefault();

    // Evita submissões repetidas enquanto o RSVP ainda é apenas local.
    if (isSubmitLocked) {
      return;
    }

    isSubmitLocked = true;
    submitButton.disabled = true;
    rsvpForm.setAttribute('aria-busy', 'true');
    feedback.textContent = PENDING_MESSAGE;

    // Na integração real, o desbloqueio deve acompanhar a resposta da API.
    window.setTimeout(() => {
      isSubmitLocked = false;
      submitButton.disabled = false;
      rsvpForm.removeAttribute('aria-busy');
    }, LOCAL_SUBMIT_COOLDOWN);
  });
}
