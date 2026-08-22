import { useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, Moon, ShieldCheck, Sun } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuthExperienceMotion } from '../hooks/useAuthExperienceMotion';
import AuthBackground from './AuthBackground';
import AuthBrandPanel from './AuthBrandPanel';

export default function LoginScreen() {
  const rootRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('crm_theme') || 'dark');

  useAuthExperienceMotion(rootRef);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;

    setTheme(nextTheme);
    localStorage.setItem('crm_theme', nextTheme);
    root.classList.toggle('dark-theme', nextTheme === 'dark');
    root.classList.toggle('light-theme', nextTheme === 'light');
  };

  const handleLogin = async (event) => {
    event?.preventDefault();

    if (!email || !password) {
      setErrorMsg('Preencha o e-mail e a senha para continuar.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMsg('E-mail ou senha incorretos. Revise os dados e tente novamente.');
    }

    setLoading(false);
  };

  return (
    <main ref={rootRef} className="auth-experience">
      <AuthBackground />

      <button
        type="button"
        onClick={toggleTheme}
        className="auth-theme-button auth-interactive"
        aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
        title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
      >
        {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      </button>

      <div className="auth-stage">
        <AuthBrandPanel />

        <section className="auth-panel" aria-labelledby="login-title">
          <div className="auth-mobile-brand auth-action-reveal" aria-hidden="true">
            <span className="auth-logo-shell"><img src="/logo.jpg" alt="" width="42" height="42" /></span>
            <span><strong>CRM Wiks</strong><small>CONVERSACIONAL</small></span>
          </div>

          <header className="auth-panel-heading auth-action-reveal">
            <span className="auth-section-kicker"><ShieldCheck size={14} aria-hidden="true" /> Acesso seguro</span>
            <h2 id="login-title">Bem-vindo de volta</h2>
            <p>Entre com os dados vinculados à sua empresa.</p>
          </header>

          <form className="auth-form" onSubmit={handleLogin} noValidate>
            <div className="auth-message-slot" aria-live="polite">
              {errorMsg && (
                <div className="auth-error-alert" role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="login-email">E-mail corporativo</label>
              <div className="auth-input-shell">
                <Mail size={18} aria-hidden="true" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  spellCheck={false}
                  placeholder="nome@empresa.com…"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(errorMsg)}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Senha</label>
              <div className="auth-input-shell">
                <Lock size={18} aria-hidden="true" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Digite sua senha…"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                  aria-invalid={Boolean(errorMsg)}
                />
                <button
                  type="button"
                  className="auth-password-toggle auth-interactive"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit-button auth-interactive auth-action-reveal" disabled={loading}>
              <span>{loading ? 'Validando acesso…' : 'Entrar no CRM'}</span>
              {loading ? <span className="auth-button-loader" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
            </button>
          </form>

          <p className="auth-security-note auth-action-reveal">
            <ShieldCheck size={15} aria-hidden="true" /> Sua sessão é protegida e os dados permanecem isolados por cliente.
          </p>
        </section>
      </div>
    </main>
  );
}
