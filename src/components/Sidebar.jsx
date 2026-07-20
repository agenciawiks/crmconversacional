import React from 'react';
import { useCrm } from '../context/CrmContext';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, MessageSquare, Kanban, Calendar, Bot, Users, Link2, Sun, Moon, Clock, LogOut, Bell, BellOff, Volume2, VolumeX } from 'lucide-react';

export default function Sidebar() {
  const { 
    activeScreen, setActiveScreen, theme, toggleTheme,
    soundEnabled, setSoundEnabled, notificationsEnabled, setNotificationsEnabled, requestNotificationPermission
  } = useCrm();
  const { user, signOut } = useAuth();
  
  const displayName = user?.user_metadata?.name || user?.email || 'Usuário Logado';
  const displayInitials = (displayName || 'UA').substring(0, 2).toUpperCase();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Painel Geral',
      icon: <LayoutDashboard size={20} strokeWidth={2} />
    },
    {
      id: 'chat',
      label: 'Chat Ao Vivo',
      icon: <MessageSquare size={20} strokeWidth={2} />
    },
    {
      id: 'kanban',
      label: 'Funil Comercial',
      icon: <Kanban size={20} strokeWidth={2} />
    },
    {
      id: 'calendar',
      label: 'Agenda',
      icon: <Calendar size={20} strokeWidth={2} />
    },
    {
      id: 'builder',
      label: 'Agente de IA',
      icon: <Bot size={20} strokeWidth={2} />
    },
    {
      id: 'contacts',
      label: 'Leads & Contatos',
      icon: <Users size={20} strokeWidth={2} />
    },
    {
      id: 'channels',
      label: 'Conectar Canais',
      icon: <Link2 size={20} strokeWidth={2} />
    },
    {
      id: 'followup',
      label: 'Follow-Up',
      icon: <Clock size={20} strokeWidth={2} />
    }
  ];

  return (
    <aside className="glass-panel" style={{
      width: '260px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '0',
      borderRight: '1px solid var(--border-glass)',
      background: 'var(--bg-sidebar)',
      zIndex: 100
    }}>
      {/* Brand logo container */}
      <div style={{
        padding: '24px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid var(--border-glass)'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-md)',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '4px',
          boxShadow: '0 4px 12px var(--accent-glow)',
          border: '1px solid var(--border-glass)'
        }}>
          <img 
            src="/logo.jpg" 
            alt="Wiks Logo" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain',
              borderRadius: '6px'
            }} 
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            fontWeight: '800',
            letterSpacing: '0.5px',
            color: 'var(--text-primary)'
          }}>CRM Wiks</span>
          <span style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>Conversacional</span>
        </div>
      </div>

      {/* Navigation menu list */}
      <nav style={{
        flex: 1,
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {menuItems.map(item => {
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-nav-icon">
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer controls: theme switcher & active agent profile */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--border-glass)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Operator Alert & Notification Controls */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Alertas Sonoros: Ativados (Clique para silenciar)" : "Alertas Sonoros: Silenciados (Clique para ativar)"}
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: 'var(--radius-md)',
              background: soundEnabled ? 'var(--bg-surface-hover)' : 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--border-glass)',
              color: soundEnabled ? 'var(--text-primary)' : 'var(--color-status-lost)',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              transition: 'all 0.2s ease'
            }}
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span>{soundEnabled ? 'Som' : 'Muto'}</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              if (!notificationsEnabled) {
                await requestNotificationPermission();
              } else {
                setNotificationsEnabled(false);
              }
            }}
            title={notificationsEnabled ? "Notificações Desktop: Ativas (Clique para desativar)" : "Notificações Desktop: Desativadas (Clique para ativar)"}
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: 'var(--radius-md)',
              background: notificationsEnabled ? 'var(--bg-surface-hover)' : 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--border-glass)',
              color: notificationsEnabled ? 'var(--text-primary)' : 'var(--color-status-lost)',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              transition: 'all 0.2s ease'
            }}
          >
            {notificationsEnabled ? <Bell size={13} /> : <BellOff size={13} />}
            <span>{notificationsEnabled ? 'Notif' : 'Sem Notif'}</span>
          </button>
        </div>

        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          className="sidebar-theme-btn"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {theme === 'dark' ? (
              <>
                <Moon size={16} strokeWidth={2} />
                Modo Escuro
              </>
            ) : (
              <>
                <Sun size={16} strokeWidth={2} />
                Modo Claro
              </>
            )}
          </span>
          <span style={{
            fontSize: '9px',
            background: 'var(--accent-primary)',
            color: '#fff',
            padding: '2px 6px',
            borderRadius: '100px',
            fontWeight: '600'
          }}>ATV</span>
        </button>

        {/* User profile & Logout */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-round)',
              background: 'var(--accent-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '13px',
              border: '2px solid var(--border-glass)',
              flexShrink: 0
            }}>
              {displayInitials}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }} title={displayName}>
                {displayName}
              </span>
              <span style={{
                fontSize: '10px',
                color: 'var(--color-status-won)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: '500'
              }}>
                <span className="pulsing-dot" style={{ width: '5px', height: '5px' }}></span> Logado
              </span>
            </div>
          </div>
          
          <button 
            onClick={signOut}
            title="Sair da Conta"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = 'var(--color-status-lost)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <LogOut size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}
