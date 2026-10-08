import { FUNCTIONS_BASE_URL } from '../shared/app-config.js';

const RSVP_ENDPOINT = new URL('rsvp', FUNCTIONS_BASE_URL).href;

const ERROR_MESSAGES = {
  400: 'Verifique os dados informados e tente novamente.',
  409: 'Este e-mail já foi utilizado para uma confirmação.',
  500: 'Não foi possível registrar sua confirmação agora. Tente novamente em instantes.',
};

/**
 * Inicializa o formulário de RSVP e conecta o frontend à Edge Function.
 *
 * O frontend realiza apenas as validações necessárias para a experiência do
 * usuário. A API continua sendo responsável pela validação definitiva e pelas
 * regras de negócio.
 *
 * @returns {void}
 */
export function initRsvp() {
  const rsvpForm = document.querySelector('.rsvp-form');
  const feedback = document.querySelector('.form-feedback');
  const submitButton = rsvpForm?.querySelector('button[type="submit"]');
  const companionsInput = rsvpForm?.querySelector('#companions');

  if (!rsvpForm || !feedback || !submitButton || !companionsInput) {
    return;
  }

  let isSubmitting = false;
  let isSubmitted = false;

  rsvpForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isSubmitting || isSubmitted) {
      return;
    }

    // Mantém a validação nativa do navegador como primeira camada.
    if (!rsvpForm.checkValidity()) {
      rsvpForm.reportValidity();
      return;
    }

    const formData = new FormData(rsvpForm);
    const name = String(formData.get('name') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const attendanceValue = String(formData.get('attendance') ?? '');
    const companions = Number(formData.get('companions'));

    // Validações adicionais necessárias para montar um payload confiável.
    if (!name || !email || !['yes', 'no'].includes(attendanceValue)) {
      setFeedback(feedback, 'Verifique os dados informados e tente novamente.');
      return;
    }

    if (!Number.isInteger(companions) || companions < 0 || companions > 15) {
      setFeedback(feedback, 'A quantidade de acompanhantes deve estar entre 0 e 15.');
      companionsInput.focus();
      return;
    }

    const payload = {
      name,
      email,
      attendance: attendanceValue === 'yes',
      companions,
    };

    isSubmitting = true;
    setLoadingState(rsvpForm, submitButton, feedback);

    try {
      const response = await fetch(RSVP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 201) {
        isSubmitted = true;
        setSuccessState(rsvpForm, submitButton, feedback);
        return;
      }

      if (response.status === 202) {
        const result = await response.json();

        if (
          result.success === false &&
          result.contingency === true &&
          result.error === 'RSVP_SAVED_TO_CONTINGENCY'
        ) {
          isSubmitted = true;
          setContingencyState(rsvpForm, submitButton, feedback);
          return;
        }
      }

      setFeedback(
        feedback,
        ERROR_MESSAGES[response.status] ??
          'Não foi possível registrar sua confirmação. Tente novamente.'
      );
    } catch (error) {
      console.error('Erro ao enviar RSVP:', error);
      setFeedback(
        feedback,
        'Não foi possível conectar ao serviço de confirmação. Verifique sua conexão e tente novamente.'
      );
    } finally {
      isSubmitting = false;

      if (!isSubmitted) {
        submitButton.disabled = false;
        rsvpForm.removeAttribute('aria-busy');
      }
    }
  });
}

/**
 * Atualiza o formulário durante o envio.
 *
 * @param {HTMLFormElement} form
 * @param {HTMLButtonElement} button
 * @param {HTMLElement} feedback
 * @returns {void}
 */
function setLoadingState(form, button, feedback) {
  button.disabled = true;
  form.setAttribute('aria-busy', 'true');
  setFeedback(feedback, 'Enviando sua confirmação...');
}

/**
 * Atualiza o formulário após uma confirmação persistida pela API.
 *
 * @param {HTMLFormElement} form
 * @param {HTMLButtonElement} button
 * @param {HTMLElement} feedback
 * @returns {void}
 */
function setSuccessState(form, button, feedback) {
  button.disabled = true;
  form.setAttribute('aria-busy', 'false');
  setFeedback(feedback, 'Presença confirmada! Agradecemos pela sua confirmação.');
}

/**
 * Atualiza o formulário após salvar a confirmação na contingência.
 *
 * @param {HTMLFormElement} form
 * @param {HTMLButtonElement} button
 * @param {HTMLElement} feedback
 * @returns {void}
 */
function setContingencyState(form, button, feedback) {
  button.disabled = true;
  form.setAttribute('aria-busy', 'false');
  setFeedback(
    feedback,
    'Sua confirmação foi recebida e salva. Devido a uma instabilidade, ela será processada posteriormente.',
  );
}

/**
 * Atualiza a mensagem de feedback do formulário.
 *
 * @param {HTMLElement} feedback
 * @param {string} message
 * @returns {void}
 */
function setFeedback(feedback, message) {
  feedback.textContent = message;
}
