export const DEFAULT_INVITATION_TITLE = 'Um convite especial — Nosso Dia ♡';

/**
 * Cria o título textual usado no documento e nos metadados de compartilhamento.
 * Nomes incompletos mantêm o fallback genérico para não publicar um título
 * parcialmente preenchido.
 *
 * @param {Record<string, unknown>} config Configuração pública do evento.
 * @returns {string} Título pronto para uso em HTML.
 */
export function buildInvitationTitle(config = {}) {
  const brideName = typeof config.bride_name === 'string' ? config.bride_name.trim() : '';
  const groomName = typeof config.groom_name === 'string' ? config.groom_name.trim() : '';

  if (!brideName || !groomName) {
    return DEFAULT_INVITATION_TITLE;
  }

  return `Um convite especial — ${brideName} & ${groomName} ♡`;
}
