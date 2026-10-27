import { getPendingContingency, recoverContingency } from './contingency.js';
import { formatTimestamp } from './date-time.js';

/** Recebe a atualização após uma recuperação confirmada. */
export function initializeContingency({ onRecovered }) {
  return { reload: loadContingency };

  /** Carrega a fila e preserva feedback quando chamada após uma recuperação. */
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

  /** Cria uma linha da fila sem interpretar dados fora do contrato permitido. */
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

  /** Coordena recuperação, mensagens de conflito e refresh de convidados/contingência. */
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
      await onRecovered(); // Preserva edições do evento ao atualizar convidados e métricas.
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

  /** Publica feedback da operação de contingência. */
  function setContingencyFeedback(message, type) {
    const feedbackMessage = document.querySelector('#contingency-feedback');
    feedbackMessage.className = `feedback feedback--${type}`;
    feedbackMessage.textContent = message;
    feedbackMessage.hidden = false;
  }

}

/** Cria célula textual para evitar interpretar dados remotos como HTML. */
function createCell(value) {
  const cell = document.createElement('td');
  cell.textContent = value;
  return cell;
}

/** Exibe uma mensagem em um elemento de feedback já existente no HTML. */
function showError(element, message) {
  element.textContent = message;
  element.hidden = false;
}
