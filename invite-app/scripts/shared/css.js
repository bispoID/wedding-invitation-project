/* Leitura de tokens CSS utilizados pelo comportamento JavaScript. */

/**
 * Lê um custom property no elemento raiz do documento.
 *
 * Manter essa leitura em um utilitário evita que cada módulo conheça a
 * implementação de getComputedStyle ou replique a normalização do valor.
 *
 * @param {string} variableName Nome do token, incluindo os dois hífens.
 * @returns {string} Valor normalizado do token ou uma string vazia.
 */
export function readCssVariable(variableName) {
  // Centraliza a leitura para CSS e JS compartilharem os mesmos tokens.
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
}


/**
 * Converte uma duração CSS para milissegundos.
 *
 * O CSS pode usar `ms` ou `s`; o JavaScript precisa de um número para
 * alimentar setTimeout e a Web Animations API. Tokens ausentes retornam 0.
 *
 * @param {string} variableName Nome do token de duração.
 * @returns {number} Duração em milissegundos.
 */
export function readMilliseconds(variableName) {
  const rawValue = readCssVariable(variableName);
  const numericValue = Number.parseFloat(rawValue);

  if (!Number.isFinite(numericValue)) {
    // Um token ausente não interrompe a inicialização da aplicação.
    return 0;
  }

  return rawValue.endsWith('s') && !rawValue.endsWith('ms')
    ? numericValue * 1000
    : numericValue;
}
