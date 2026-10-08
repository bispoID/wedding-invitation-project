import { getSupabaseClient } from './supabase.js';

export class AdminFunctionError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'AdminFunctionError';
    this.code = code;
    this.status = status;
  }
}

async function callAdminFunction(name, options) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.functions.invoke(name, options);

  if (error) {
    const response = error.context;

    if (response instanceof Response) {
      let body;
      try {
        body = await response.clone().json();
      } catch {
        body = null;
      }

      throw new AdminFunctionError(
        body?.error ?? 'FUNCTION_FAILED',
        body?.message ?? 'A solicitação administrativa falhou.',
        response.status
      );
    }

    throw error;
  }

  return data;
}

export async function getPendingContingency() {
  const result = await callAdminFunction('admin-list-contingency', {
    method: 'GET',
  });

  if (!Array.isArray(result?.records)) {
    throw new Error('A função retornou uma lista inválida.');
  }

  return result.records;
}

export async function recoverContingency(requestId) {
  return callAdminFunction('admin-recover-contingency', {
    body: { request_id: requestId },
  });
}

export async function manageGuest(action, id, guest) {
  return callAdminFunction('admin-manage-guests', {
    body: { action, id, ...(action === 'update' ? { guest } : {}) },
  });
}
