/* =========================================================
   CONTROLE DA CARTA
========================================================= */

export function showLetter(letter) {

  letter.hidden = false;

  letter.classList.add(
    'is-entering'
  );

  const letterTitle =
    letter.querySelector(
      '#letter-title'
    );

  if (letterTitle) {

    letterTitle.focus({
      preventScroll: true
    });

  }
}


export function hideLetter(letter) {

  letter.hidden = true;

  letter.classList.remove(
    'is-entering'
  );
}
