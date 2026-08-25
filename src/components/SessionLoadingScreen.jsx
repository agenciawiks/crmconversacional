import { useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuthExperienceMotion } from '../hooks/useAuthExperienceMotion';
import AuthBackground from './AuthBackground';

export default function SessionLoadingScreen() {
  const rootRef = useRef(null);
  useAuthExperienceMotion(rootRef);

  return (
    <main ref={rootRef} className="auth-experience auth-session-screen">
      <AuthBackground />
      <section className="auth-session-card auth-stage" role="status" aria-live="polite" aria-label="Validando sessão">
        <div className="auth-session-logo auth-reveal">
          <img src="/logo-mess.svg" alt="" width="52" height="52" />
          <span className="auth-session-orbit" aria-hidden="true" />
        </div>
        <span className="auth-section-kicker auth-reveal"><ShieldCheck size={14} aria-hidden="true" /> Sessão protegida</span>
        <h1 className="auth-reveal">Preparando seu CRM</h1>
        <p className="auth-reveal">Validando acesso, permissões e ambiente do cliente…</p>
        <div className="auth-session-progress auth-action-reveal" aria-hidden="true"><i /></div>
        <div className="auth-session-steps auth-action-reveal" aria-hidden="true">
          <i /><i /><i />
        </div>
      </section>
    </main>
  );
}
