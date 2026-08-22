const welcome = document.querySelector('.welcome');
const letter = document.querySelector('.letter');

const envelope = document.querySelector('.envelope');

const backButton = document.querySelector('.back-to-cover');

const rsvpForm = document.querySelector('.rsvp-form');
const feedback = document.querySelector('.form-feedback');

let isOpening = false;


/* =========================================================
   ABRIR CONVITE
========================================================= */

function openInvitation() {

  // Evita múltiplos cliques durante a animação
  if (isOpening) {
    return;
  }

  isOpening = true;

  /*
   * ETAPA 1
   *
   * Abre somente a aba superior.
   */
  welcome.classList.add('is-opening-envelope');


  /*
   * ETAPA 2
   *
   * Depois que a aba termina de abrir,
   * o cartão começa a sair do envelope.
   */
  window.setTimeout(() => {

    welcome.classList.add('is-opening-card');

  }, 850);


  /*
   * ETAPA 3
   *
   * Depois que o cartão se movimenta,
   * fazemos a transição para a carta.
   */
  window.setTimeout(() => {

    welcome.classList.add('is-closing');

  }, 1500);


  /*
   * ETAPA 4
   *
   * A capa desaparece e a carta entra.
   */
  window.setTimeout(() => {

    welcome.hidden = true;

    letter.hidden = false;

    letter.classList.add('is-entering');

    const letterTitle = letter.querySelector('#letter-title');

    if (letterTitle) {
      letterTitle.focus({
        preventScroll: true
      });
    }

    isOpening = false;

  }, 2050);

}


/* =========================================================
   VOLTAR PARA A CAPA
========================================================= */

function returnToCover() {

  letter.hidden = true;

  letter.classList.remove('is-entering');

  welcome.hidden = false;

  /*
   * Remove todas as etapas da animação.
   *
   * O envelope volta automaticamente para o estado inicial:
   *
   * - aba fechada
   * - cartão dentro
   * - selo visível
   */
  welcome.classList.remove(
    'is-opening-envelope',
    'is-opening-card',
    'is-closing'
  );

  isOpening = false;

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

  envelope.focus({
    preventScroll: true
  });

}


/* =========================================================
   EVENTOS
========================================================= */

envelope.addEventListener(
  'click',
  openInvitation
);

envelope.addEventListener(
  'keydown',
  (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openInvitation();
    }
  }
);

backButton.addEventListener(
  'click',
  returnToCover
);


/* =========================================================
   RSVP
========================================================= */

rsvpForm.addEventListener(
  'submit',
  (event) => {

    event.preventDefault();

    feedback.textContent =
      'A confirmação será conectada ao RSVP quando a API e o Supabase forem configurados.';

  }
);
