const welcome = document.querySelector('.welcome');
const letter = document.querySelector('.letter');
const openButton = document.querySelector('.open-invitation');
const backButton = document.querySelector('.back-to-cover');
const rsvpForm = document.querySelector('.rsvp-form');
const feedback = document.querySelector('.form-feedback');

function openInvitation() {
  welcome.classList.add('is-closing');

  window.setTimeout(() => {
    welcome.hidden = true;
    letter.hidden = false;
    letter.classList.add('is-entering');
    letter.querySelector('#letter-title').focus({ preventScroll: true });
  }, 700);
}

function returnToCover() {
  letter.hidden = true;
  letter.classList.remove('is-entering');
  welcome.hidden = false;
  welcome.classList.remove('is-closing');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  openButton.focus({ preventScroll: true });
}

openButton.addEventListener('click', openInvitation);
backButton.addEventListener('click', returnToCover);

rsvpForm.addEventListener('submit', (event) => {
  event.preventDefault();
  feedback.textContent = 'A confirmação será conectada ao RSVP quando a API e o Supabase forem configurados.';
});
