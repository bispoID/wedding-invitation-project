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
