/**
 * Exibe a carta, inicia sua animação de entrada e move o foco para o título.
 *
 * @param {HTMLElement} letter Seção da carta do convite.
 * @returns {void}
 */
export function showLetter(letter) {
  // O foco acompanha a mudança de seção para usuários de teclado e leitores.
  letter.hidden = false;
  letter.classList.add('is-entering');

  const letterTitle = letter.querySelector('#letter-title');

  letterTitle?.focus({
    preventScroll: true
  });
}


/**
 * Oculta a carta e remove seu estado de animação para a próxima abertura.
 *
 * @param {HTMLElement} letter Seção da carta do convite.
 * @returns {void}
 */
export function hideLetter(letter) {
  // Remove também o estado de entrada para que a próxima abertura anime de novo.
  letter.hidden = true;
  letter.classList.remove('is-entering');
}
