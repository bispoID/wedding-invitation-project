/* =========================================================
   INICIALIZAÇÃO DO RSVP
========================================================= */

export function initRsvp() {

  const rsvpForm =
    document.querySelector('.rsvp-form');

  const feedback =
    document.querySelector('.form-feedback');

  if (!rsvpForm || !feedback) {
    return;
  }

  /*
   * O formulário permanece apenas como interface local
   * até que a integração com a API e o Supabase seja feita.
   */
  rsvpForm.addEventListener(
    'submit',
    (event) => {

      event.preventDefault();

      feedback.textContent =
        'A confirmação será conectada ao RSVP quando a API e o Supabase forem configurados.';
    }
  );
}
