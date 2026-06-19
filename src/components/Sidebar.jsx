import React from 'react';
import { useCrm } from '../context/CrmContext';
import { LayoutDashboard, MessageSquare, Kanban, Bot, Users, Link2, Sun, Moon, Clock } from 'lucide-react';

export default function Sidebar() {
  const { activeScreen, setActiveScreen, theme, toggleTheme } = useCrm();

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
      id: 'pipeline',
      label: 'Funil Comercial',
      icon: <Kanban size={20} strokeWidth={2} />
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

        {/* Agent active card status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-round)',
            background: 'hsl(260, 60%, 50%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '14px',
            border: '2px solid var(--border-glass)'
          }}>
            CA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>Caio Agent</span>
            <span style={{
              fontSize: '11px',
              color: 'var(--color-status-won)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: '500'
            }}>
              <span className="pulsing-dot" style={{ width: '6px', height: '6px' }}></span> Ativo
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
