import { getCurrentSession, signIn } from './auth.js';
import { getSupabaseClient, getRecoveryState } from './supabase.js';
import { initializeRecoveryRequest } from './recovery-request.js';

/** Verifica sessão existente e conecta o formulário ao Supabase Auth. */
export async function initializeLogin() {
  const form = document.querySelector('#login-form');
  const button = document.querySelector('#login-button');
  const errorMessage = document.querySelector('#login-error');
  const loadingMessage = document.querySelector('#login-loading');

  try {
    const session = await getCurrentSession();
    const recovery = getRecoveryState();
    const recoveryRequested = new URLSearchParams(window.location.search).get('recovery') === 'request';

    if (session && !recovery?.allows(session) && !recoveryRequested) {
      window.location.replace('./index.html');
      return;
    }

    if (recovery?.allows(session)) {
      showError(errorMessage, 'Abra o link de recuperação na página de nova senha. Solicite outro link abaixo.');
      window.history.replaceState(null, '', window.location.pathname);
    }

    const success = document.querySelector('#login-success');
    if (new URLSearchParams(window.location.search).get('password-reset') === 'success') {
      success.textContent = 'Senha alterada com sucesso.';
      success.hidden = false;
      window.history.replaceState(null, '', window.location.pathname);
    }
    const client = await getSupabaseClient();
    loadingMessage.hidden = true;
    form.hidden = false;
    initializeRecoveryRequest(client.auth, document, { open: recoveryRequested });
    if (recoveryRequested) window.history.replaceState(null, '', window.location.pathname);
  } catch (error) {
    loadingMessage.hidden = true;
    showError(errorMessage, getErrorMessage(error));
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.hidden = true;
    button.disabled = true;
    button.textContent = 'Entrando...';
    form.setAttribute('aria-busy', 'true');
    loadingMessage.hidden = false;
    loadingMessage.textContent = 'Autenticando...';

    const formData = new FormData(form);
    const email = String(formData.get('email')).trim().toLowerCase();
    const password = String(formData.get('password'));

    try {
      await signIn(email, password);
      window.location.replace('./index.html');
    } catch (error) {
      showError(errorMessage, getSignInErrorMessage(error));
    } finally {
      button.disabled = false;
      button.textContent = 'Entrar';
      form.removeAttribute('aria-busy');
      loadingMessage.hidden = true;
    }
  });
}

/** Exibe uma mensagem em um elemento de feedback já existente no HTML. */
function showError(element, message) {
  element.textContent = message;
  element.hidden = false;
}

function getSignInErrorMessage(error) {
  if (error?.status === 400 || error?.code === 'invalid_credentials') {
    return 'E-mail ou senha inválidos. Confira os dados e tente novamente.';
  }

  return `Não foi possível realizar o login. ${getErrorMessage(error)}`;
}

function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
}
