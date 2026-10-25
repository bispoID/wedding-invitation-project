/** Regras do fluxo, independentes de DOM e sem persistir prova de recuperação. */
export const RECOVERY_SENT_MESSAGE = 'Se houver uma conta associada a esse e-mail, você receberá as instruções de recuperação.';
export const INVALID_RECOVERY_MESSAGE = 'Este link não é válido ou expirou. Solicite outro link no login. Se você recarregou a página, solicite um novo link também.';
export const MIN_PASSWORD_LENGTH = 6;
export const UNCONFIRMED_PASSWORD_MESSAGE = 'Não foi possível confirmar se a senha foi alterada. Não reenvie este formulário. Volte ao login para tentar a nova senha ou solicitar outro link.';

function isExpiredSession(error) {
  return error?.status === 401 || ['session_not_found', 'session_expired', 'refresh_token_not_found', 'otp_expired', 'bad_jwt'].includes(error?.code);
}

function isCommunicationError(error) {
  const rejectionCodes = ['weak_password', 'same_password', 'reauthentication_needed', 'session_not_found', 'session_expired', 'refresh_token_not_found', 'otp_expired', 'bad_jwt'];
  return error?.status >= 500 || error?.name === 'AuthRetryableFetchError' || !error?.status && !rejectionCodes.includes(error?.code);
}

/** Recebe exclusivamente APP_BASE_URL já validada pelo bootstrap. */
export function recoveryRedirectUrl(appBaseUrl) {
  return new URL('admin/reset-password.html', appBaseUrl).href;
}

export function requestErrorMessage(error) {
  if (error?.status === 429 || ['over_email_send_rate_limit', 'over_request_rate_limit'].includes(error?.code)) {
    return 'Aguarde alguns minutos antes de tentar novamente.';
  }
  return 'Não foi possível solicitar a recuperação agora. Confira sua conexão e tente novamente mais tarde.';
}

export function passwordErrorMessage(error) {
  if (error?.code === 'same_password') return 'Escolha uma senha diferente da anterior.';
  if (error?.code === 'weak_password') return 'A senha não atende à política de segurança. Escolha uma senha mais forte.';
  if (error?.status === 429) return 'Aguarde alguns minutos antes de tentar novamente.';
  if (isExpiredSession(error)) return INVALID_RECOVERY_MESSAGE;
  if (error?.code === 'reauthentication_needed') return 'É necessária uma nova confirmação de identidade. Solicite outro link de recuperação.';
  return 'O servidor não aceitou a nova senha. Confira a política de segurança ou solicite outro link.';
}

export function validateNewPassword(password, confirmation) {
  if (Array.from(password).length < MIN_PASSWORD_LENGTH) return `Use pelo menos ${MIN_PASSWORD_LENGTH} caracteres na nova senha.`;
  if (password !== confirmation) return 'As senhas não coincidem.';
  return '';
}

/** Callback síncrono: nunca chama Auth, nem aguarda operações durante eventos. */
export function observeRecovery(auth, href) {
  const hash = new URLSearchParams(new URL(href).hash.slice(1));
  let expectedToken = hash.get('type') === 'recovery' ? hash.get('access_token') : null;
  let recovered = null;
  // Identifica continuidade da sessão já validada pelo SDK; não autentica JWTs.
  const sessionId = session => {
    try {
      const payload = session.access_token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
      const id = JSON.parse(atob(payload)).session_id;
      return typeof id === 'string' && id ? id : null;
    } catch { return null; }
  };
  const sameSession = session => Boolean(recovered && recovered.userId === session?.user?.id &&
    (recovered.sessionId ? recovered.sessionId === sessionId(session) : recovered.accessToken === session?.access_token));
  const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' && expectedToken && session?.access_token === expectedToken) {
      recovered = session.user?.id ? { userId: session.user.id, sessionId: sessionId(session), accessToken: session.access_token } : null;
      expectedToken = null;
    } else if (event === 'SIGNED_OUT' || recovered && session && !sameSession(session)) {
      recovered = null;
    }
  });
  return {
    allows: sameSession,
    dispose() { expectedToken = null; recovered = null; subscription.unsubscribe(); },
  };
}

/** Exclui query/hash apenas depois que o SDK terminou de processar o retorno. */
export function clearRecoveryUrl(location, history) {
  history.replaceState(null, '', location.pathname);
}

/** Serializa solicitações mesmo se submit for disparado por código. */
export function createRecoveryRequester(auth, redirectTo) {
  let busy = false;
  return async email => {
    if (busy) return null;
    busy = true;
    try {
      const { error } = await auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
      // Respostas relativas a contas não são exibidas, mesmo se o servidor as enviar.
      if (error && (error.status === 429 || ['over_email_send_rate_limit', 'over_request_rate_limit'].includes(error.code) || error.status >= 500 || !error.status || error.name === 'AuthRetryableFetchError')) throw error;
      return RECOVERY_SENT_MESSAGE;
    } catch (error) {
      return requestErrorMessage(error);
    } finally { busy = false; }
  };
}

/** Atualiza só a senha e tenta logout local separadamente; retry não repete updateUser. */
export function createPasswordReset(auth, recovery, { onPasswordUpdated = () => {} } = {}) {
  let busy = false;
  let updated = false;
  let terminalResult;
  return async (password, confirmation) => {
    if (busy) return { status: 'busy' };
    if (terminalResult) return terminalResult;
    const validation = validateNewPassword(password, confirmation);
    if (!updated && validation) return { status: 'invalid', message: validation };
    busy = true;
    let updateStarted = false;
    const unconfirmed = () => {
      recovery.dispose();
      terminalResult = { status: 'unconfirmed', message: UNCONFIRMED_PASSWORD_MESSAGE };
      return terminalResult;
    };
    try {
      if (!updated) {
        const { data, error } = await auth.getSession();
        if (error) throw error;
        if (!recovery.allows(data.session)) return { status: 'expired', message: INVALID_RECOVERY_MESSAGE };
        updateStarted = true;
        const result = await auth.updateUser({ password });
        if (result.error) {
          if (isCommunicationError(result.error)) return unconfirmed();
          const message = passwordErrorMessage(result.error);
          return { status: message === INVALID_RECOVERY_MESSAGE ? 'expired' : 'error', message };
        }
        if (!result.data?.user?.id || result.data.user.id !== data.session.user.id) return unconfirmed();
        updated = true;
        onPasswordUpdated();
      }
      try {
        const { error } = await auth.signOut({ scope: 'local' });
        if (error) throw error;
      } catch {
        return { status: 'logout-error', message: 'Senha alterada com sucesso, mas não foi possível encerrar esta sessão. Tente encerrar a sessão novamente antes de voltar ao login.' };
      }
      recovery.dispose();
      terminalResult = { status: 'success', message: 'Senha alterada com sucesso.' };
      return terminalResult;
    } catch (error) {
      if (updated) return { status: 'logout-error', message: 'Senha alterada com sucesso, mas não foi possível concluir o encerramento desta sessão. Tente encerrar a sessão novamente.' };
      if (isExpiredSession(error)) return { status: 'expired', message: INVALID_RECOVERY_MESSAGE };
      if (updateStarted && isCommunicationError(error)) return unconfirmed();
      if (!updateStarted && isCommunicationError(error)) return { status: 'communication-error', message: 'Não foi possível verificar sua sessão. Confira a conexão e tente novamente.' };
      return { status: 'error', message: passwordErrorMessage(error) };
    } finally { busy = false; }
  };
}
