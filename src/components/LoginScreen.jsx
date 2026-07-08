import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Loader2, ArrowRight } from 'lucide-react';
import '../styles/variables.css';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Preencha os campos para continuar.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg('E-mail ou senha incorretos.');
    }
    
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-app)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Premium glowing background orbs */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        background: 'var(--accent-glow)',
        filter: 'blur(120px)',
        borderRadius: '50%',
        top: '-10%',
        left: '-10%',
        zIndex: 0,
        opacity: 0.8
      }}></div>
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'rgba(6, 182, 212, 0.1)',
        filter: 'blur(100px)',
        borderRadius: '50%',
        bottom: '-10%',
        right: '-10%',
        zIndex: 0,
        opacity: 0.6
      }}></div>

      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '400px',
        padding: '48px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        background: 'rgba(18, 18, 26, 0.6)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
      }}>
        {/* Logo and Title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-md)',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            padding: '6px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)'
          }}>
            <img 
              src="/logo.jpg" 
              alt="FaceAll Institute" 
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '26px',
              fontWeight: '700',
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.5px'
            }}>
              CRM Wiks
            </h1>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              margin: 0,
              fontWeight: '500'
            }}>
              Acesso exclusivo à plataforma
            </p>
          </div>
        </div>

        {/* Inputs */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#FCA5A5',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              textAlign: 'center',
              fontWeight: '500',
              animation: 'fadeIn 0.3s ease-out'
            }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>
              E-mail corporativo
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ 
                padding: '14px 16px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s ease',
                width: '100%',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.border = '1px solid var(--accent-primary)'}
              onBlur={(e) => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>
              Senha
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ 
                padding: '14px 16px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s ease',
                width: '100%',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.border = '1px solid var(--accent-primary)'}
              onBlur={(e) => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            marginTop: '8px',
            padding: '16px',
            background: 'var(--accent-primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.8 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 20px var(--accent-glow)'
          }}
          onMouseEnter={(e) => { if(!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { if(!loading) e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              Entrar no CRM
              <ArrowRight size={18} strokeWidth={2.5} />
            </>
          )}
        </button>

      </div>
    </div>
  );
}
