import { useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useAuthExperienceMotion } from '../hooks/useAuthExperienceMotion';
import AuthBackground from './AuthBackground';
import AuthBrandPanel from './AuthBrandPanel';

export default function FirstLoginPrompt() {
  const rootRef = useRef(null);
  const { completeFirstLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [view, setView] = useState('options');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useAuthExperienceMotion(rootRef);

  const handleKeepPassword = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      await completeFirstLogin();
    } catch (error) {
      console.error(error);
      setErrorMsg('Não foi possível confirmar o acesso. Tente novamente.');
      setLoading(false);
    }
  };

  const handleChangePassword = async (event) => {
    event?.preventDefault();

    if (newPassword.length < 6) {
      setErrorMsg('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('As senhas não coincidem. Digite a mesma senha nos 2 campos.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      await completeFirstLogin();
      setSuccess(true);

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error(error);
      setErrorMsg('Não foi possível atualizar a senha. Tente uma senha diferente.');
      setLoading(false);
    }
  };

  return (
    <main ref={rootRef} className="auth-experience">
      <AuthBackground />

      <div className="auth-stage auth-stage--first-access">
        <AuthBrandPanel mode="first-access" />

        <section className="auth-panel auth-panel--first-access" aria-labelledby="first-access-title">
          <div className={`auth-first-access-icon auth-action-reveal ${success ? 'is-success' : ''}`} aria-hidden="true">
            {success ? <CheckCircle2 size={27} /> : <KeyRound size={27} />}
          </div>

          <header className="auth-panel-heading auth-action-reveal">
            <span className="auth-section-kicker"><ShieldCheck size={14} aria-hidden="true" /> Primeiro acesso</span>
            <h2 id="first-access-title">{success ? 'Acesso confirmado' : 'Proteja sua conta'}</h2>
            <p>
              {success
                ? 'Tudo certo. Estamos preparando o ambiente da sua empresa…'
                : 'Você pode criar uma senha pessoal agora ou continuar com a senha gerada pelo administrador.'}
            </p>
          </header>

          <div className="auth-message-slot" aria-live="polite">
            {errorMsg && (
              <div className="auth-error-alert" role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {success && (
            <div className="auth-success-state auth-action-reveal" role="status">
              <span className="auth-success-loader" aria-hidden="true" />
              <span>Carregando sua sessão segura…</span>
            </div>
          )}

          {!success && view === 'options' && (
            <div className="auth-option-stack">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setView('change_password');
                }}
                className="auth-submit-button auth-interactive auth-action-reveal"
                disabled={loading}
              >
                <span>Criar nova senha</span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={handleKeepPassword}
                disabled={loading}
                className="auth-secondary-button auth-interactive auth-action-reveal"
              >
                {loading ? <><span className="auth-button-loader" aria-hidden="true" /> Confirmando…</> : 'Manter senha atual'}
              </button>
            </div>
          )}

          {!success && view === 'change_password' && (
            <form className="auth-form auth-password-form" onSubmit={handleChangePassword}>
              <div className="auth-field">
                <label htmlFor="new-password">Nova senha</label>
                <div className="auth-input-shell">
                  <Lock size={18} aria-hidden="true" />
                  <input
                    id="new-password"
                    name="new-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo de 6 caracteres…"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    minLength={6}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="confirm-password">Confirmar nova senha</label>
                <div className="auth-input-shell">
                  <Lock size={18} aria-hidden="true" />
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repita a nova senha…"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={6}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="auth-form-actions auth-action-reveal">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setView('options');
                  }}
                  disabled={loading}
                  className="auth-secondary-button auth-interactive"
                >
                  <ArrowLeft size={17} aria-hidden="true" /> Voltar
                </button>
                <button type="submit" disabled={loading} className="auth-submit-button auth-interactive">
                  {loading ? <><span className="auth-button-loader" aria-hidden="true" /> Salvando…</> : <>Salvar senha <ArrowRight size={17} aria-hidden="true" /></>}
                </button>
              </div>
            </form>
          )}

          {!success && (
            <p className="auth-security-note auth-action-reveal">
              <ShieldCheck size={15} aria-hidden="true" /> Esta etapa mantém o acesso vinculado ao cliente correto.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
