import { callAdminFunction } from './functions.js';
export { AdminFunctionError } from './functions.js';

/** Carrega somente registros pendentes da contingência autorizada. */
export async function getPendingContingency() {
  const result = await callAdminFunction('admin-list-contingency', {
    method: 'GET',
  });

  if (!Array.isArray(result?.records)) {
    throw new Error('A função retornou uma lista inválida.');
  }

  return result.records;
}

/** Solicita ao backend a recuperação idempotente de um request da contingência. */
export async function recoverContingency(requestId) {
  return callAdminFunction('admin-recover-contingency', {
    body: { request_id: requestId },
  });
}

/** Executa create/update/delete e valida a confirmação explícita da API. */
export async function manageGuest(action, id, guest) {
  const result = await callAdminFunction('admin-manage-guests', {
    body: { action, ...(action !== 'create' ? { id } : {}), ...(['create', 'update'].includes(action) ? { guest } : {}) },
  });
  const expected = { create: 'created', update: 'updated', delete: 'deleted' }[action];
  if (result?.success !== true || result.action !== expected || typeof result.id !== 'string') {
    throw new Error('A operação não foi confirmada pelo backend.');
  }
  return result;
}
