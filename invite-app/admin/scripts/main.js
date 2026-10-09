import { getCurrentSession, signIn, signOut } from './auth.js';
import { getPendingContingency, manageGuest, recoverContingency } from './contingency.js';
import { getGuests } from './guests.js';
import { calculateGuestMetrics } from './guest-metrics.js';
import { validateGuest } from './guest-validation.js';
import { initializeEventConfig } from './event-config.js';
import { initializeInvitationLinks } from './navigation.js';
import { formatTimestamp } from './date-time.js';

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

    initializeGuestEditor();
    initializeInvitationLinks();
    void initializeEventConfig();
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
  const feedbackMessage = document.querySelector('#guests-feedback');

  loadingMessage.hidden = false;
  errorMessage.hidden = true;
  emptyMessage.hidden = true;
  tableContainer.hidden = true;
  tableBody.replaceChildren();
  feedbackMessage.hidden = true;

  try {
    const guests = await getGuests();
    updateGuestMetrics(guests);
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

function updateGuestMetrics(guests) {
  const metrics = calculateGuestMetrics(guests);
  document.querySelector('#metric-total').textContent = String(metrics.totalGuests);
  document.querySelector('#metric-confirmed').textContent = String(metrics.confirmedGuests);
  document.querySelector('#metric-declined').textContent = String(metrics.declinedGuests);
  document.querySelector('#metric-companions').textContent = String(metrics.totalCompanions);
  document.querySelector('#metric-confirmed-people').textContent = String(metrics.confirmedPeople);
}

function createGuestRow(guest) {
  const row = document.createElement('tr');
  const attendance = guest.attendance ? 'Confirmado' : 'Não poderá comparecer';
  const createdAt = formatTimestamp(guest.created_at);
  const actions = document.createElement('td');
  const editButton = document.createElement('button');
  const deleteButton = document.createElement('button');

  editButton.className = 'button button--small';
  editButton.type = 'button';
  editButton.textContent = 'Editar';
  editButton.setAttribute('aria-label', `Editar ${guest.name}`);
  editButton.addEventListener('click', () => openGuestEditor(guest));

  deleteButton.className = 'button button--small button--danger';
  deleteButton.type = 'button';
  deleteButton.textContent = 'Excluir';
  deleteButton.setAttribute('aria-label', `Excluir ${guest.name}`);
  deleteButton.addEventListener('click', () => deleteGuestRecord(guest, deleteButton));
  actions.className = 'guest-actions';
  actions.append(editButton, deleteButton);

  row.append(
    createCell(guest.name),
    createCell(guest.email),
    createCell(attendance),
    createCell(String(guest.companions)),
    createCell(createdAt),
    actions
  );

  return row;
}

function initializeGuestEditor() {
  const dialog = document.querySelector('#guest-dialog');
  const form = document.querySelector('#guest-form');
  const attendance = document.querySelector('#guest-attendance');
  const companions = document.querySelector('#guest-companions');
  const cancelButton = document.querySelector('#guest-cancel');
  const saveButton = document.querySelector('#guest-save');

  attendance.addEventListener('change', () => {
    const attending = attendance.value === 'true';
    companions.disabled = !attending;
    if (!attending) {
      companions.value = '0';
    }
  });

  document.querySelector('#guest-create').addEventListener('click', () => openGuestEditor());
  dialog.addEventListener('cancel', (event) => {
    if (form.getAttribute('aria-busy') === 'true') event.preventDefault();
  });
  cancelButton.addEventListener('click', () => dialog.close());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const errorMessage = document.querySelector('#guest-form-error');
    errorMessage.hidden = true;

    if (form.getAttribute('aria-busy') === 'true') return;
    const id = form.dataset.guestId;
    const action = form.dataset.mode === 'create' ? 'create' : 'update';
    const formData = new FormData(form);
    const name = String(formData.get('name')).trim();
    const email = String(formData.get('email')).trim().toLowerCase();
    const attendanceValue = String(formData.get('attendance'));
    const companionsValue = document.querySelector('#guest-companions').value.trim();
    const companionsCount = Number(companionsValue);

    const parsed = validateGuest({ name, email, attendance: ['true', 'false'].includes(attendanceValue) ? attendanceValue === 'true' : null, companions: companionsValue ? companionsCount : NaN });
    if ('error' in parsed) {
      showError(errorMessage, 'Confira nome (até 200), e-mail (até 320), presença e acompanhantes (0 a 15).');
      return;
    }
    [...form.elements].forEach((control) => { control.disabled = true; });
    saveButton.textContent = 'Salvando...';
    form.setAttribute('aria-busy', 'true');

    try {
      await manageGuest(action, id, parsed.guest);
      dialog.close();
      form.reset();
      delete form.dataset.guestId;
      await loadGuests();
      setGuestFeedback(action === 'create' ? 'Convidado criado e confirmado.' : 'Dados do convidado atualizados.', 'success');
    } catch (error) {
      showError(errorMessage, getGuestMutationMessage(error));
    } finally {
      [...form.elements].forEach((control) => { control.disabled = false; });
      companions.disabled = attendance.value !== 'true';
      saveButton.textContent = action === 'create' ? 'Criar convidado' : 'Salvar alterações';
      form.removeAttribute('aria-busy');
    }
  });
}

function openGuestEditor(guest = null) {
  const dialog = document.querySelector('#guest-dialog');
  const form = document.querySelector('#guest-form');
  form.reset();
  form.dataset.mode = guest ? 'update' : 'create';
  if (guest) form.dataset.guestId = guest.id;
  else delete form.dataset.guestId;
  document.querySelector('#guest-dialog-title').textContent = guest ? 'Editar convidado' : 'Criar convidado';
  document.querySelector('#guest-save').textContent = guest ? 'Salvar alterações' : 'Criar convidado';
  form.elements.name.value = guest?.name ?? '';
  form.elements.email.value = guest?.email ?? '';
  form.elements.attendance.value = String(guest?.attendance ?? true);
  form.elements.companions.value = String(guest?.companions ?? 0);
  form.elements.companions.disabled = guest?.attendance === false;
  document.querySelector('#guest-form-error').hidden = true;
  dialog.showModal();
  form.elements.name.focus();
}

async function deleteGuestRecord(guest, button) {
  const confirmed = window.confirm(
    `Excluir o convidado "${guest.name}" (${guest.email})? Esta ação não pode ser desfeita.`
  );

  if (!confirmed) {
    return;
  }

  button.disabled = true;
  button.textContent = 'Excluindo...';
  button.setAttribute('aria-busy', 'true');

  try {
    await manageGuest('delete', guest.id);
    await loadGuests();
    setGuestFeedback('Convidado excluído.', 'success');
  } catch (error) {
    setGuestFeedback(getGuestMutationMessage(error), 'error');
    button.disabled = false;
    button.textContent = 'Excluir';
    button.removeAttribute('aria-busy');
  }
}

function getGuestMutationMessage(error) {
  if (error?.code === 'EMAIL_ALREADY_REGISTERED') {
    return 'Este e-mail já está associado a outro convidado. Os dados atuais foram preservados.';
  }

  return error instanceof Error && error.message
    ? error.message
    : 'Não foi possível salvar a alteração.';
}

function setGuestFeedback(message, type) {
  const feedbackMessage = document.querySelector('#guests-feedback');
  feedbackMessage.className = `feedback feedback--${type}`;
  feedbackMessage.textContent = message;
  feedbackMessage.hidden = false;
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
    createCell(formatTimestamp(record.created_at)),
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
    await loadGuests(); // Refresh metrics without discarding unsaved event edits.
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
