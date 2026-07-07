import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          background: 'var(--bg-app, #0f172a)',
          border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))',
          borderRadius: '12px',
          color: 'var(--text-primary, #f8fafc)',
          textAlign: 'center',
          margin: '20px auto',
          maxWidth: '500px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          backdropFilter: 'blur(8px)',
          fontFamily: "'Inter', sans-serif"
        }}>
          <h2 style={{
            color: 'var(--accent-primary, #ef4444)',
            fontSize: '18px',
            marginBottom: '12px',
            fontWeight: '600'
          }}>
            ⚠️ Algo deu errado ao carregar o chat
          </h2>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary, #94a3b8)',
            marginBottom: '20px',
            lineHeight: '1.6'
          }}>
            Houve uma falha inesperada na renderização das mensagens. Mas não se preocupe, a mensagem já foi salva no servidor.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, var(--accent-primary, #ef4444), var(--accent-secondary, #f43f5e))',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              transition: 'transform 0.15s ease',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
