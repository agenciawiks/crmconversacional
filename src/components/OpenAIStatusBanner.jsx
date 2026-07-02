import React, { useState } from 'react';
import { AlertTriangle, X, RefreshCw, ExternalLink, Zap } from 'lucide-react';
import { useOpenAIQuota } from '../hooks/useOpenAIQuota';

export default function OpenAIStatusBanner() {
  const { status, isChecking, lastChecked, recheck } = useOpenAIQuota(120000); // re-check every 2min
  const [dismissed, setDismissed] = useState(false);

  // Only show the banner when there's a problem
  if (status === 'ok' || status === 'loading' || status === 'no_key' || dismissed) return null;

  const configs = {
    quota_exceeded: {
      bg: 'linear-gradient(90deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.06) 100%)',
      border: 'rgba(239,68,68,0.35)',
      accent: '#ef4444',
      glow: 'rgba(239,68,68,0.2)',
      icon: <AlertTriangle size={15} />,
      title: 'Créditos OpenAI esgotados',
      message: 'O saldo da chave OpenAI acabou. O Agente de IA está offline até que os créditos sejam recarregados.',
      cta: { label: 'Recarregar créditos', href: 'https://platform.openai.com/settings/billing/overview' }
    },
    invalid_key: {
      bg: 'linear-gradient(90deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.06) 100%)',
      border: 'rgba(245,158,11,0.35)',
      accent: '#f59e0b',
      glow: 'rgba(245,158,11,0.2)',
      icon: <AlertTriangle size={15} />,
      title: 'Chave OpenAI inválida',
      message: 'A chave de API configurada no Agente de IA é inválida ou foi revogada.',
      cta: { label: 'Configurar chave', href: null, screen: 'builder' }
    },
    unknown: {
      bg: 'linear-gradient(90deg, rgba(100,116,139,0.12) 0%, rgba(100,116,139,0.06) 100%)',
      border: 'rgba(100,116,139,0.35)',
      accent: '#64748b',
      glow: 'rgba(100,116,139,0.15)',
      icon: <AlertTriangle size={15} />,
      title: 'Falha ao verificar OpenAI',
      message: 'Não foi possível confirmar o status da API OpenAI. Verifique a conectividade.',
      cta: null
    }
  };

  const cfg = configs[status] || configs.unknown;

  const timeStr = lastChecked
    ? lastChecked.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        padding: '9px 20px',
        background: cfg.bg,
        borderBottom: `1px solid ${cfg.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 200,
        backdropFilter: 'blur(8px)',
        flexShrink: 0,
        boxShadow: `0 1px 0 ${cfg.glow}`
      }}
    >
      {/* Pulsing indicator */}
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: cfg.accent,
        boxShadow: `0 0 8px ${cfg.accent}`,
        flexShrink: 0,
        animation: 'pulse 2s infinite'
      }} />

      {/* Icon */}
      <span style={{ color: cfg.accent, flexShrink: 0, display: 'flex' }}>
        {cfg.icon}
      </span>

      {/* Text */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
        <span style={{
          fontSize: '12.5px',
          fontWeight: '600',
          color: cfg.accent,
          whiteSpace: 'nowrap'
        }}>
          {cfg.title}
        </span>
        <span style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          lineHeight: 1.4
        }}>
          {cfg.message}
        </span>
        {timeStr && (
          <span style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap'
          }}>
            · verificado às {timeStr}
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {cfg.cta && cfg.cta.href && (
          <a
            href={cfg.cta.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11.5px',
              fontWeight: '600',
              color: '#fff',
              background: cfg.accent,
              padding: '4px 10px',
              borderRadius: '6px',
              textDecoration: 'none',
              transition: 'opacity 0.15s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <ExternalLink size={11} />
            {cfg.cta.label}
          </a>
        )}

        <button
          onClick={recheck}
          disabled={isChecking}
          title="Verificar novamente"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: '1px solid var(--border-glass)',
            padding: '4px 8px',
            borderRadius: '6px',
            cursor: isChecking ? 'wait' : 'pointer',
            opacity: isChecking ? 0.6 : 1,
            transition: 'all 0.15s',
            whiteSpace: 'nowrap'
          }}
        >
          <RefreshCw size={11} style={{ animation: isChecking ? 'spin 1s linear infinite' : 'none' }} />
          {isChecking ? 'Verificando...' : 'Verificar'}
        </button>

        <button
          onClick={() => setDismissed(true)}
          title="Fechar aviso"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            transition: 'color 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <X size={14} />
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}
