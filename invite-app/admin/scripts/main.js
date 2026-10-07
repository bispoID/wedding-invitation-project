import { getCurrentSession, signIn, signOut } from './auth.js';
import { getPendingContingency, recoverContingency } from './contingency.js';
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

    await Promise.all([loadGuests(), loadContingency()]);
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

async function loadContingency({ preserveFeedback = false } = {}) {
  const loadingMessage = document.querySelector('#contingency-loading');
  const errorMessage = document.querySelector('#contingency-error');
  const feedbackMessage = document.querySelector('#contingency-feedback');
  const emptyMessage = document.querySelector('#contingency-empty');
  const tableContainer = document.querySelector('#contingency-table-container');
  const tableBody = document.querySelector('#contingency-table-body');

  loadingMessage.hidden = false;
  errorMessage.hidden = true;
  emptyMessage.hidden = true;
  tableContainer.hidden = true;
  tableBody.replaceChildren();

  if (!preserveFeedback) {
    feedbackMessage.hidden = true;
  }

  try {
    const records = await getPendingContingency();
    loadingMessage.hidden = true;

    if (records.length === 0) {
      emptyMessage.hidden = false;
      return;
    }

    for (const record of records) {
      tableBody.append(createContingencyRow(record));
    }

    tableContainer.hidden = false;
  } catch (error) {
    console.error('Erro ao carregar contingência:', error);
    loadingMessage.hidden = true;
    showError(
      errorMessage,
      'Não foi possível carregar a contingência. Tente atualizar a página.'
    );
  }
}

function createContingencyRow(record) {
  const row = document.createElement('tr');
  const attendance = record.attendance === true
    ? 'Confirmado'
    : record.attendance === false
      ? 'Não comparecerá'
      : '—';
  const companions = Number.isInteger(record.companions)
    ? String(record.companions)
    : '—';
  const button = document.createElement('button');
  const actionCell = document.createElement('td');

  button.className = 'button button--small';
  button.type = 'button';
  button.textContent = 'Recuperar';
  button.addEventListener('click', () => handleRecovery(record, button));
  actionCell.append(button);

  row.append(
    createCell(record.request_id),
    createCell(record.name),
    createCell(record.email),
    createCell(attendance),
    createCell(companions),
    createCell(formatDate(record.created_at)),
    createCell(record.status === 'pending' ? 'Pendente' : record.status),
    actionCell
  );

  return row;
}

async function handleRecovery(record, button) {
  button.disabled = true;
  button.textContent = 'Recuperando...';
  button.setAttribute('aria-busy', 'true');
  setContingencyFeedback('Recuperação em andamento...', 'success');

  try {
    const result = await recoverContingency(record.request_id);

    if (result?.success !== true || result?.contingency_removed !== true) {
      setContingencyFeedback(
        'A recuperação não foi confirmada. O registro continua na lista.',
        'error'
      );
      return;
    }

    setContingencyFeedback(
      result.result === 'already_persisted'
        ? 'Registro já persistido e reconciliado; linha removida da contingência.'
        : 'Registro recuperado e removido da contingência.',
      'success'
    );
    await loadContingency({ preserveFeedback: true });
  } catch (error) {
    const code = error?.code;
    let message = error instanceof Error
      ? error.message
      : 'Não foi possível recuperar o registro.';
    let type = 'error';

    if (code === 'DATA_CONFLICT') {
      message = 'Conflito de dados. A linha foi preservada para revisão manual.';
      type = 'warning';
    } else if (code === 'CLEANUP_PENDING') {
      message = 'Registro persistido no banco; a limpeza da contingência continua pendente.';
      type = 'warning';
    } else if (code === 'LOCK_BUSY') {
      message = 'Outra recuperação está em andamento. Tente novamente.';
    }

    setContingencyFeedback(message, type);
  } finally {
    button.disabled = false;
    button.textContent = 'Recuperar';
    button.removeAttribute('aria-busy');
  }
}

function setContingencyFeedback(message, type) {
  const feedbackMessage = document.querySelector('#contingency-feedback');
  feedbackMessage.className = `feedback feedback--${type}`;
  feedbackMessage.textContent = message;
  feedbackMessage.hidden = false;
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
