import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Loader2, Lock, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import '../styles/variables.css';

export default function FirstLoginPrompt() {
  const { completeFirstLogin, user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // view can be 'options', 'change_password'
  const [view, setView] = useState('options');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleKeepPassword = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await completeFirstLogin(user.id);
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao atualizar status. Tente novamente.');
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setErrorMsg('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      await completeFirstLogin(user.id);
      setSuccess(true);
      
      // Let the success state show briefly before unmounting
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error(error);
      setErrorMsg('Erro ao atualizar a senha. Tente usar uma senha diferente.');
      setLoading(false);
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
      {/* Background Grid Pattern */}
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
        zIndex: 0
      }}></div>

      <div 
        className="glass-panel" 
        style={{
          position: 'relative',
          zIndex: 10,
          width: '90%',
          maxWidth: '440px',
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(18, 205, 135, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#12CD87',
            marginBottom: '8px'
          }}>
            {success ? <CheckCircle2 size={32} /> : <ShieldCheck size={32} />}
          </div>
          
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.5px'
          }}>
            {success ? 'Senha Atualizada!' : 'Bem-vindo ao CRM Wiks'}
          </h2>
          
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            margin: 0,
            fontWeight: '400',
            lineHeight: '1.5'
          }}>
            {success 
              ? 'Tudo certo. Redirecionando para o sistema...' 
              : 'Este é o seu primeiro acesso. Por questões de segurança, você pode definir uma nova senha pessoal ou continuar com a senha gerada pelo administrador.'}
          </p>
        </div>

        {errorMsg && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: '500',
            textAlign: 'center'
          }}>
            {errorMsg}
          </div>
        )}

        {!success && view === 'options' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button
              onClick={() => setView('change_password')}
              className="glass-btn"
              style={{ padding: '14px', width: '100%' }}
            >
              Criar Nova Senha
              <ArrowRight size={18} />
            </button>
            <button
              onClick={handleKeepPassword}
              disabled={loading}
              style={{
                padding: '14px',
                width: '100%',
                background: 'transparent',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Manter senha atual'}
            </button>
          </div>
        )}

        {!success && view === 'change_password' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                Nova Senha
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '40px' }}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                Confirmar Nova Senha
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '40px' }}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={() => setView('options')}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'transparent',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-secondary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Voltar
              </button>
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="glass-btn"
                style={{ flex: 1, padding: '12px' }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Salvar Senha'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
