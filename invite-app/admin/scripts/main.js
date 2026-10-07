import { getCurrentSession, signIn, signOut } from './auth.js';
import { getGuests } from './guests.js';

const page = document.body.dataset.page;

if (page === 'login') {
  initializeLogin();
} else if (page === 'dashboard') {
  initializeDashboard();
}

async function initializeLogin() {
  const form = document.querySelector('#login-form');
  const button = document.querySelector('#login-button');
  const errorMessage = document.querySelector('#login-error');
  const loadingMessage = document.querySelector('#login-loading');

  try {
    const session = await getCurrentSession();

    if (session) {
      window.location.replace('./index.html');
      return;
    }

    loadingMessage.hidden = true;
    form.hidden = false;
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

    await loadGuests();
  } catch (error) {
    loadingMessage.hidden = true;
    showError(errorMessage, getErrorMessage(error));
  }
}

async function loadGuests() {
  const loadingMessage = document.querySelector('#guests-loading');
  const errorMessage = document.querySelector('#guests-error');
  const emptyMessage = document.querySelector('#guests-empty');
  const tableContainer = document.querySelector('#guests-table-container');
  const tableBody = document.querySelector('#guests-table-body');

  loadingMessage.hidden = false;
  errorMessage.hidden = true;
  emptyMessage.hidden = true;
  tableContainer.hidden = true;
  tableBody.replaceChildren();

  try {
    const guests = await getGuests();
    loadingMessage.hidden = true;

    if (guests.length === 0) {
      emptyMessage.hidden = false;
      return;
    }

    for (const guest of guests) {
      tableBody.append(createGuestRow(guest));
    }

    tableContainer.hidden = false;
  } catch (error) {
    console.error('Erro ao carregar convidados:', error);
    loadingMessage.hidden = true;
    showError(
      errorMessage,
      'Não foi possível carregar a lista de convidados. Tente atualizar a página.'
    );
  }
}

function createGuestRow(guest) {
  const row = document.createElement('tr');
  const attendance = guest.attendance ? 'Confirmado' : 'Não poderá comparecer';
  const createdAt = formatDate(guest.created_at);

  row.append(
    createCell(guest.name),
    createCell(guest.email),
    createCell(attendance),
    createCell(String(guest.companions)),
    createCell(createdAt)
  );

  return row;
}

function createCell(value) {
  const cell = document.createElement('td');
  cell.textContent = value;
  return cell;
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

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
