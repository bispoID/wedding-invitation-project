/* =========================================================
   RSVP
========================================================= */

export function initRsvp() {

  const rsvpForm =
    document.querySelector('.rsvp-form');

  const feedback =
    document.querySelector('.form-feedback');

  if (!rsvpForm || !feedback) {
    return;
  }

  rsvpForm.addEventListener(
    'submit',
    (event) => {

      event.preventDefault();

      feedback.textContent =
        'A confirmação será conectada ao RSVP quando a API e o Supabase forem configurados.';

    }
  );
}
