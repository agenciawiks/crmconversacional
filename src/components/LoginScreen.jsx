import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Loader2, ArrowRight, Mail, Lock, Sun, Moon, AlertCircle } from 'lucide-react';
import '../styles/variables.css';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Local theme state for unauthenticated screen
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('crm_theme') || 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('crm_theme', nextTheme);
    const root = document.documentElement;
    if (nextTheme === 'dark') {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }
  };

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
      fontFamily: 'var(--font-sans)',
      transition: 'background-color var(--transition-normal)'
    }}>
      {/* Background Subtle Grid Pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(to right, var(--bg-grid-color) 1px, transparent 1px), linear-gradient(to bottom, var(--bg-grid-color) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        opacity: 0.8,
        zIndex: 0
      }}></div>

      {/* Brand Glowing Orbs */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        background: 'var(--bg-glow-1)',
        filter: 'blur(120px)',
        borderRadius: '50%',
        top: '-15%',
        left: '-15%',
        zIndex: 0,
        transition: 'background var(--transition-normal)'
      }}></div>
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'var(--bg-glow-2)',
        filter: 'blur(100px)',
        borderRadius: '50%',
        bottom: '-15%',
        right: '-15%',
        zIndex: 0,
        transition: 'background var(--transition-normal)'
      }}></div>

      {/* Theme Switcher Toggle */}
      <button 
        onClick={toggleTheme} 
        className="login-theme-btn"
        aria-label="Alternar tema"
        title="Alternar tema"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Glassmorphism Card */}
      <div 
        className="glass-panel" 
        style={{
          position: 'relative',
          zIndex: 10,
          width: '90%',
          maxWidth: '420px',
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          boxSizing: 'border-box'
        }}
      >
        {/* Brand/Logo Area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          {/* Logo container matching Sidebar style but scaled */}
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
            boxShadow: '0 8px 24px var(--accent-glow)',
            border: '1px solid var(--border-glass)'
          }}>
            <img 
              src="/logo.jpg" 
              alt="Wiks Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '28px',
              fontWeight: '800',
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

        {/* Form Inputs Section */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Styled Error Alert */}
          {errorMsg && (
            <div className="login-error-alert">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Email field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>
              E-mail corporativo
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <Mail 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '14px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="glass-input"
                style={{ paddingLeft: '44px' }}
                disabled={loading}
              />
            </div>
          </div>

          {/* Password field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>
              Senha
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <Lock 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '14px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="glass-input"
                style={{ paddingLeft: '44px' }}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="glass-btn"
          style={{
            marginTop: '8px',
            padding: '12px 18px',
            width: '100%'
          }}
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
