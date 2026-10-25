import { APP_BASE_URL } from '../../scripts/shared/app-config.js';
import { getSupabaseClient, getRecoveryState } from './supabase.js';
import { clearRecoveryUrl, createPasswordReset, INVALID_RECOVERY_MESSAGE } from './password-recovery.js';

const form = document.querySelector('#reset-form');
const feedback = document.querySelector('#reset-feedback');
const button = document.querySelector('#reset-button');
const retry = document.querySelector('#reset-logout');
const login = document.querySelector('#reset-login');
const loginUrl = new URL('admin/login.html', APP_BASE_URL).href;
login.href = `${loginUrl}?recovery=request`;

async function initialize() {
  form.inert = true;
  let client;
  try {
    client = await getSupabaseClient();
    const initialized = await client.auth.initialize();
    // v2.117.2 agenda PASSWORD_RECOVERY com setTimeout(0) após validar a URL.
    await new Promise(resolve => setTimeout(resolve, 0));
    if (initialized.error) throw initialized.error;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!getRecoveryState().allows(data.session)) throw Object.assign(new Error('Invalid recovery'), { code: 'invalid_recovery' });
  } catch (error) {
    feedback.textContent = error?.code === 'invalid_recovery' || error?.status >= 400 && error.status < 500
      ? INVALID_RECOVERY_MESSAGE : 'Não foi possível validar o link de recuperação. Confira a conexão e solicite outro link.';
    feedback.setAttribute('role', 'alert');
    getRecoveryState()?.dispose();
    return;
  } finally {
    clearRecoveryUrl(window.location, window.history);
  }

  let submitting = false;
  const hidePasswordForm = () => { form.reset(); form.hidden = true; form.inert = true; };
  const reset = createPasswordReset(client.auth, getRecoveryState(), {
    onPasswordUpdated() {
      hidePasswordForm();
      feedback.setAttribute('role', 'status');
      feedback.textContent = 'Senha alterada com sucesso. Encerrando esta sessão...';
    },
  });
  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    submitting = true;
    button.disabled = retry.disabled = true;
    login.hidden = true;
    form.setAttribute('aria-busy', 'true');
    feedback.textContent = form.hidden ? 'Encerrando esta sessão...' : 'Atualizando sua senha...';
    const values = new FormData(form);
    const result = await reset(String(values.get('password') || ''), String(values.get('confirmation') || ''));
    feedback.textContent = result.message || '';
    feedback.setAttribute('role', result.status === 'success' ? 'status' : 'alert');
    button.disabled = retry.disabled = false;
    submitting = false;
    form.removeAttribute('aria-busy');
    if (['success', 'logout-error', 'expired', 'unconfirmed'].includes(result.status)) hidePasswordForm();
    retry.hidden = result.status !== 'logout-error';
    login.hidden = result.status === 'logout-error';
    if (result.status === 'success') {
      login.href = `${loginUrl}?password-reset=success`;
      login.textContent = 'Ir para o login';
      login.setAttribute('aria-describedby', 'reset-feedback');
      login.focus();
    }
  }
  form.addEventListener('submit', submit);
  retry.addEventListener('click', submit);
  feedback.textContent = 'Link validado. Defina sua nova senha.';
  form.hidden = false;
  form.inert = false;
  document.querySelector('#new-password').focus();
}

void initialize();
