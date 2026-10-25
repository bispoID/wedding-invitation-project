import { APP_BASE_URL } from '../../scripts/shared/app-config.js';
import { createRecoveryRequester, recoveryRedirectUrl } from './password-recovery.js';

export function initializeRecoveryRequest(auth, document = globalThis.document, { open = false } = {}) {
  const toggle = document.querySelector('#forgot-password');
  const back = document.querySelector('#recovery-back');
  const loginPanel = document.querySelector('#login-panel');
  const panel = document.querySelector('#recovery-panel');
  const title = document.querySelector('#login-title');
  const description = document.querySelector('#login-description');
  const loginTitle = title.textContent;
  const loginDescription = description.textContent;
  const loginEmail = document.querySelector('#email');
  const recoveryEmail = document.querySelector('#recovery-email');
  const form = document.querySelector('#recovery-form');
  const button = document.querySelector('#recovery-button');
  const feedback = document.querySelector('#recovery-feedback');
  const request = createRecoveryRequester(auth, recoveryRedirectUrl(APP_BASE_URL));
  toggle.hidden = false;
  const setOpen = (value, syncEmail = true) => {
    const source = value ? loginEmail : recoveryEmail;
    const target = value ? recoveryEmail : loginEmail;
    if (syncEmail) target.value = source.value;
    loginPanel.hidden = value;
    loginPanel.inert = value;
    panel.hidden = !value;
    panel.inert = !value;
    title.textContent = value ? 'Recuperar senha' : loginTitle;
    description.textContent = value ? 'Informe seu e-mail para receber as instruções de recuperação.' : loginDescription;
    toggle.setAttribute('aria-expanded', String(value));
    target.focus();
  };
  setOpen(open, false);
  toggle.addEventListener('click', () => setOpen(true));
  back.addEventListener('click', () => setOpen(false));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled || !form.reportValidity()) return;
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    feedback.hidden = true;
    try {
      const message = await request(String(new FormData(form).get('email') || ''));
      feedback.textContent = message;
      feedback.hidden = false;
    } finally {
      button.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
}
