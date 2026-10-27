import { getCurrentSession, signOut } from './auth.js';
import { initializeLogin } from './login.js';
import { initializeGuests } from './guests-ui.js';
import { initializeContingency } from './contingency-ui.js';
import { initializeEventConfig } from './event-config.js';
import { initializeInvitationLinks } from './navigation.js';

/** Ponto de entrada do painel: seleciona login ou dashboard pelo atributo HTML. */
const page = document.body.dataset.page;

if (page === 'login') {
  initializeLogin();
} else if (page === 'dashboard') {
  initializeDashboard();
}

/** Valida sessão, conecta logout e inicializa os módulos independentes do painel. */
async function initializeDashboard() {
  const loadingMessage = document.querySelector('#dashboard-loading');
  const errorMessage = document.querySelector('#dashboard-error');
  const content = document.querySelector('#dashboard-content');
  const logoutButton = document.querySelector('#logout-button');

  try {
    const session = await getCurrentSession();

    if (!session) {
      window.location.replace('./login.html');
      return;
    }

    document.querySelector('#admin-email').textContent =
      session.user.email || 'E-mail não disponível';

    loadingMessage.hidden = true;
    content.hidden = false;

    logoutButton.addEventListener('click', async () => {
      logoutButton.disabled = true;
      logoutButton.textContent = 'Saindo...';
      errorMessage.hidden = true;

      try {
        await signOut();
        window.location.replace('./login.html');
      } catch (error) {
        showError(errorMessage, `Não foi possível encerrar a sessão. ${getErrorMessage(error)}`);
        logoutButton.disabled = false;
        logoutButton.textContent = 'Sair';
      }
    });

    const guests = initializeGuests();
    const contingency = initializeContingency({ onRecovered: guests.reload });
    initializeInvitationLinks();
    void initializeEventConfig();
    await Promise.all([guests.reload(), contingency.reload()]);
  } catch (error) {
    loadingMessage.hidden = true;
    showError(errorMessage, getErrorMessage(error));
  }
}

/** Exibe uma mensagem em um elemento de feedback já existente no HTML. */
function showError(element, message) {
  element.textContent = message;
  element.hidden = false;
}

function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
}
