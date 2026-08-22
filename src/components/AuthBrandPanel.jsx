import { Activity, CheckCircle2, MessageCircleMore, ShieldCheck } from 'lucide-react';

export default function AuthBrandPanel({ mode = 'login' }) {
  const isFirstAccess = mode === 'first-access';

  return (
    <aside className="auth-brand-panel" aria-label="CRM Wiks Conversacional">
      <div className="auth-brand auth-reveal">
        <span className="auth-logo-shell">
          <img src="/logo.jpg" alt="" width="48" height="48" />
        </span>
        <span>
          <strong>CRM Wiks</strong>
          <small>CONVERSACIONAL</small>
        </span>
      </div>

      <div className="auth-brand-copy">
        <span className="auth-live-pill auth-reveal">
          <i aria-hidden="true" /> Plataforma em tempo real
        </span>
        <h1 className="auth-reveal">
          {isFirstAccess ? 'Seu acesso começa com segurança.' : 'Conversas que viram relacionamentos.'}
        </h1>
        <p className="auth-reveal">
          {isFirstAccess
            ? 'Confirme sua senha antes de entrar no ambiente exclusivo da sua empresa.'
            : 'Centralize atendimento, oportunidades e automações em uma experiência rápida, clara e humana.'}
        </p>
      </div>

      <div className="auth-feature-list auth-reveal" aria-label="Recursos da plataforma">
        <span><MessageCircleMore size={17} aria-hidden="true" /> Atendimento unificado</span>
        <span><Activity size={17} aria-hidden="true" /> Operação em tempo real</span>
        <span><ShieldCheck size={17} aria-hidden="true" /> Dados isolados por cliente</span>
      </div>

      <div className="auth-brand-footer auth-reveal">
        <span className="auth-health-mark"><CheckCircle2 size={15} aria-hidden="true" /> Ambiente protegido</span>
        <span className="auth-signal" aria-hidden="true">
          <i className="auth-signal-bar" /><i className="auth-signal-bar" /><i className="auth-signal-bar" /><i className="auth-signal-bar" />
        </span>
      </div>
    </aside>
  );
}
