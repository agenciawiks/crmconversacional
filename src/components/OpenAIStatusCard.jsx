import React from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ExternalLink, Zap, Clock, WifiOff } from 'lucide-react';
import { useOpenAIQuota } from '../hooks/useOpenAIQuota';

export default function OpenAIStatusCard() {
  const { status, errorType, isChecking, lastChecked, recheck } = useOpenAIQuota(120000);

  const statusMap = {
    loading: {
      icon: <RefreshCw size={18} style={{ animation: 'spin 1.2s linear infinite' }} />,
      color: '#64748b',
      glow: 'rgba(100,116,139,0.15)',
      bg: 'rgba(100,116,139,0.06)',
      border: 'rgba(100,116,139,0.2)',
      label: 'Verificando...',
      sublabel: 'Consultando a API OpenAI'
    },
    ok: {
      icon: <CheckCircle2 size={18} />,
      color: '#10b981',
      glow: 'rgba(16,185,129,0.2)',
      bg: 'rgba(16,185,129,0.06)',
      border: 'rgba(16,185,129,0.2)',
      label: 'OpenAI Operacional',
      sublabel: 'Chave ativa e com créditos disponíveis'
    },
    quota_exceeded: {
      icon: <AlertTriangle size={18} />,
      color: '#ef4444',
      glow: 'rgba(239,68,68,0.2)',
      bg: 'rgba(239,68,68,0.06)',
      border: 'rgba(239,68,68,0.25)',
      label: 'Créditos Esgotados',
      sublabel: 'O Agente de IA está offline. Recarregue os créditos.'
    },
    invalid_key: {
      icon: <AlertTriangle size={18} />,
      color: '#f59e0b',
      glow: 'rgba(245,158,11,0.2)',
      bg: 'rgba(245,158,11,0.06)',
      border: 'rgba(245,158,11,0.25)',
      label: 'Chave Inválida',
      sublabel: 'A chave de API foi revogada ou é incorreta'
    },
    unknown: {
      icon: <WifiOff size={18} />,
      color: '#64748b',
      glow: 'rgba(100,116,139,0.15)',
      bg: 'rgba(100,116,139,0.06)',
      border: 'rgba(100,116,139,0.2)',
      label: 'Status Desconhecido',
      sublabel: 'Não foi possível conectar à API OpenAI'
    },
    no_key: {
      icon: <Zap size={18} />,
      color: '#8b5cf6',
      glow: 'rgba(139,92,246,0.2)',
      bg: 'rgba(139,92,246,0.06)',
      border: 'rgba(139,92,246,0.2)',
      label: 'Sem chave configurada',
      sublabel: 'Configure uma chave de API OpenAI abaixo'
    }
  };

  const cfg = statusMap[status] || statusMap.unknown;

  const timeStr = lastChecked
    ? lastChecked.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: '12px',
        padding: '16px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 0 20px ${cfg.glow}`,
        flexShrink: 0
      }}
    >
      {/* Glow accent left bar */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '3px',
        background: cfg.color,
        borderRadius: '12px 0 0 12px',
        boxShadow: `0 0 12px ${cfg.color}`
      }} />

      {/* Animated shimmer bg */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at 0% 50%, ${cfg.glow} 0%, transparent 60%)`,
        pointerEvents: 'none'
      }} />

      {/* Icon */}
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        background: `${cfg.color}18`,
        border: `1px solid ${cfg.color}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: cfg.color,
        flexShrink: 0,
        position: 'relative'
      }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span style={{
            fontSize: '13.5px',
            fontWeight: '700',
            color: cfg.color
          }}>
            {cfg.label}
          </span>
          {/* Live dot for ok */}
          {status === 'ok' && (
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
              display: 'inline-block',
              animation: 'pulseGreen 2s infinite'
            }} />
          )}
        </div>
        <p style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          margin: 0,
          lineHeight: 1.4
        }}>
          {cfg.sublabel}
        </p>
        {timeStr && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '6px',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}>
            <Clock size={10} />
            Último check: {timeStr}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
        {status === 'quota_exceeded' && (
          <a
            href="https://platform.openai.com/settings/billing/overview"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11.5px',
              fontWeight: '600',
              color: '#fff',
              background: '#ef4444',
              padding: '6px 12px',
              borderRadius: '7px',
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
              transition: 'opacity 0.15s',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <ExternalLink size={11} />
            Recarregar créditos
          </a>
        )}

        <button
          onClick={recheck}
          disabled={isChecking}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11.5px',
            fontWeight: '500',
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: '1px solid var(--border-glass)',
            padding: '6px 12px',
            borderRadius: '7px',
            cursor: isChecking ? 'wait' : 'pointer',
            opacity: isChecking ? 0.6 : 1,
            transition: 'all 0.15s',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={e => { if (!isChecking) e.currentTarget.style.borderColor = cfg.color; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-glass)'; }}
        >
          <RefreshCw size={11} style={{ animation: isChecking ? 'spin 1s linear infinite' : 'none' }} />
          {isChecking ? 'Verificando...' : 'Verificar agora'}
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulseGreen {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #10b981; }
          50% { opacity: 0.6; box-shadow: 0 0 4px #10b981; }
        }
      `}</style>
    </div>
  );
}
