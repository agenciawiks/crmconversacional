const includesAny = (value, terms) => terms.some((term) => value.includes(term));

export const getAuthErrorMessage = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  const status = Number(error?.status || 0);

  if (code === 'invalid_credentials' || includesAny(message, ['invalid login credentials', 'invalid credentials'])) {
    return 'E-mail ou senha incorretos. Revise os dados e tente novamente.';
  }

  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou fale com o administrador.';
  }

  if (status === 429 || code.includes('rate_limit') || message.includes('rate limit')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  }

  if (
    status === 402
    || status >= 500
    || includesAny(code, ['fetch_error', 'retryable_fetch'])
    || includesAny(message, ['failed to fetch', 'network', 'service unavailable', 'payment required'])
  ) {
    return 'O serviço de autenticação está temporariamente indisponível. Tente novamente mais tarde ou fale com o administrador.';
  }

  return 'Não foi possível entrar agora. Tente novamente ou fale com o administrador.';
};
