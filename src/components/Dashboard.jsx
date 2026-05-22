import React from 'react';
import { useCrm } from '../context/CrmContext';

export default function Dashboard() {
  const { contacts, isBotEnabled, setIsBotEnabled, setActiveScreen, setActiveContactId } = useCrm();

  // Metrics calculators
  const totalChats = contacts.length;
  const newLeads = contacts.filter(c => c.status === 'new').length;
  const proposalLeads = contacts.filter(c => c.status === 'proposal').length;
  const wonLeadsTotal = contacts.filter(c => c.status === 'won').reduce((sum, c) => sum + c.value, 0);

  const kpis = [
    {
      title: 'Conversas Ativas',
      value: totalChats,
      trend: '+12% esta semana',
      isPositive: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    },
    {
      title: 'Novos Leads',
      value: newLeads,
      trend: '+4 novos hoje',
      isPositive: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      )
    },
    {
      title: 'Em Proposta',
      value: proposalLeads,
      trend: '-2% vs ontem',
      isPositive: false,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    },
    {
      title: 'Receita Ganha',
      value: `R$ ${wonLeadsTotal.toLocaleString('pt-BR')}`,
      trend: '+24% este mês',
      isPositive: true,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    }
  ];

  // Activities Log timeline
  const activities = [
    {
      id: 1,
      type: 'bot',
      title: 'Bot Auto-resposta executado',
      meta: 'Disparado por palavra-chave "olá" de Mariana Costa',
      time: 'Há 5 minutos',
      icon: '🤖'
    },
    {
      id: 2,
      type: 'won',
      title: 'Lead ganho! Status atualizado',
      meta: 'Roberto Souza fechou contrato no valor de R$ 15.400',
      time: 'Há 2 horas',
      icon: '🎉'
    },
    {
      id: 3,
      type: 'webhook',
      title: 'Webhook n8n integrado com sucesso',
      meta: 'Dados do lead Carlos Oliveira enviados para CRM principal',
      time: 'Há 3 horas',
      icon: '🔌'
    },
    {
      id: 4,
      type: 'lead',
      title: 'Novo Lead importado via Webchat',
      meta: 'Mariana Costa iniciou uma nova sessão no chat público',
      time: 'Há 5 horas',
      icon: '👤'
    }
  ];

  const handleStartChat = (contactId) => {
    setActiveContactId(contactId);
    setActiveScreen('chat');
  };

  return (
    <div className="content-wrapper animated-fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Painel Comercial</h1>
          <p>Visão geral de interações e funil de vendas em tempo real.</p>
        </div>
        
        {/* Toggle global chatbot switch */}
        <div className="glass-panel" style={{
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--bg-surface-solid)'
        }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Automação Bot Ativa:</span>
          <button
            onClick={() => setIsBotEnabled(prev => !prev)}
            style={{
              width: '46px',
              height: '24px',
              borderRadius: '100px',
              background: isBotEnabled ? 'var(--accent-primary)' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all var(--transition-fast)'
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: 'var(--radius-round)',
              background: '#fff',
              position: 'absolute',
              top: '3px',
              left: isBotEnabled ? '25px' : '3px',
              transition: 'all var(--transition-fast)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}></div>
          </button>
        </div>
      </div>

      {/* KPI STATS SECTION */}
      <div className="dashboard-grid">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="glass-panel kpi-card">
            <div className="kpi-header">
              <span className="kpi-title">{kpi.title}</span>
              <div className="kpi-icon-wrapper">{kpi.icon}</div>
            </div>
            <div>
              <div className="kpi-value">{kpi.value}</div>
              <div className={`kpi-trend ${kpi.isPositive ? 'positive' : 'negative'}`}>
                {kpi.isPositive ? '▲' : '▼'} {kpi.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* DYNAMIC CHARTS & TIMELINE SECTION */}
      <div className="charts-grid">
        {/* SVG Sales & Leads Growth Chart */}
        <div className="glass-panel chart-card">
          <div>
            <span className="chart-title">Desempenho Comercial</span>
            <span className="chart-subtitle">Evolução do valor total em negociações e leads gerados</span>
          </div>

          <div className="svg-chart-container">
            {/* Custom High-Fidelity SVG Line Graph */}
            <svg width="100%" height="100%" viewBox="0 0 600 240" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="gradient-secondary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-secondary)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Horizontal Guidelines */}
              <line x1="50" y1="40" x2="560" y2="40" stroke="var(--border-glass)" strokeWidth="1" />
              <line x1="50" y1="100" x2="560" y2="100" stroke="var(--border-glass)" strokeWidth="1" />
              <line x1="50" y1="160" x2="560" y2="160" stroke="var(--border-glass)" strokeWidth="1" />
              <line x1="50" y1="220" x2="560" y2="220" stroke="var(--border-glass)" strokeWidth="2" />

              {/* Y Axis Labels */}
              <text x="15" y="45" fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-sans)">R$ 20k</text>
              <text x="15" y="105" fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-sans)">R$ 10k</text>
              <text x="15" y="165" fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-sans)">R$ 5k</text>
              <text x="15" y="225" fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-sans)">R$ 0</text>

              {/* Fill Area Chart */}
              <path
                d="M 50 220 L 120 180 L 200 130 L 290 145 L 380 90 L 470 120 L 560 50 L 560 220 Z"
                fill="url(#gradient-area)"
              />
              <path
                d="M 50 220 L 120 200 L 200 170 L 290 190 L 380 140 L 470 160 L 560 110 L 560 220 Z"
                fill="url(#gradient-secondary)"
              />

              {/* Grid Lines Chart paths */}
              <path
                d="M 50 220 L 120 180 L 200 130 L 290 145 L 380 90 L 470 120 L 560 50"
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 50 220 L 120 200 L 200 170 L 290 190 L 380 140 L 470 160 L 560 110"
                fill="none"
                stroke="var(--accent-secondary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive nodes circles markers */}
              <circle cx="120" cy="180" r="4" fill="#fff" stroke="var(--accent-primary)" strokeWidth="2.5" />
              <circle cx="200" cy="130" r="4" fill="#fff" stroke="var(--accent-primary)" strokeWidth="2.5" />
              <circle cx="290" cy="145" r="4" fill="#fff" stroke="var(--accent-primary)" strokeWidth="2.5" />
              <circle cx="380" cy="90" r="4" fill="#fff" stroke="var(--accent-primary)" strokeWidth="2.5" />
              <circle cx="470" cy="120" r="4" fill="#fff" stroke="var(--accent-primary)" strokeWidth="2.5" />
              <circle cx="560" cy="50" r="5" fill="var(--accent-primary)" stroke="#fff" strokeWidth="2" />

              <circle cx="560" cy="110" r="4" fill="var(--accent-secondary)" stroke="#fff" strokeWidth="2" />

              {/* X Axis labels */}
              <text x="110" y="235" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-sans)">Seg</text>
              <text x="190" y="235" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-sans)">Ter</text>
              <text x="280" y="235" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-sans)">Qua</text>
              <text x="370" y="235" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-sans)">Qui</text>
              <text x="460" y="235" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-sans)">Sex</text>
              <text x="550" y="235" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-sans)">Hoje</text>
            </svg>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-primary)' }}></div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Faturamento Ganho (Won)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-secondary)' }}></div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Leads em Negociação (Pipeline)</span>
            </div>
          </div>
        </div>

        {/* TIMELINE ACTIVITIES LIST */}
        <div className="glass-panel timeline-card">
          <div>
            <span className="chart-title">Atividades do Bot</span>
            <span className="chart-subtitle">Eventos e triggers automatizados mais recentes</span>
          </div>

          <div className="timeline-list">
            {activities.map(act => (
              <div key={act.id} className="timeline-item">
                <div className="timeline-icon-dot">
                  {act.icon}
                </div>
                <div className="timeline-content">
                  <span className="timeline-title">{act.title}</span>
                  <span className="timeline-meta">{act.meta}</span>
                  <span className="timeline-time">{act.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QUICK CHATS SHORTCUT ROW */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Clientes Aguardando Resposta</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {contacts.filter(c => c.unread).slice(0, 3).map(contact => (
            <div key={contact.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'var(--bg-surface-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-glass)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="avatar" style={{ background: contact.avatarColor }}>
                  {contact.name.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>{contact.name}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Última msg: "{contact.messages[contact.messages.length - 1]?.text}"
                  </span>
                </div>
              </div>
              <button onClick={() => handleStartChat(contact.id)} className="glass-btn" style={{ padding: '8px 12px', fontSize: '12px' }}>
                Responder
              </button>
            </div>
          ))}
          {contacts.filter(c => c.unread).length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
              Nenhuma mensagem pendente de atendimento humano. 🎉
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
