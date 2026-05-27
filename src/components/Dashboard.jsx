import React, { useEffect, useState } from 'react';
import { useCrm } from '../context/CrmContext';

export default function Dashboard() {
  const { contacts, isBotEnabled, setIsBotEnabled, setActiveScreen, setActiveContactId } = useCrm();

  // Metrics calculators
  const totalChats = contacts.length;
  const newLeads = contacts.filter(c => c.status === 'new').length;
  const proposalLeads = contacts.filter(c => c.status === 'proposal').length;
  const wonLeadsTotal = contacts.filter(c => c.status === 'won').reduce((sum, c) => sum + c.value, 0);
  const proposalContacts = contacts.filter(c => c.status === 'proposal');
  const wonCount = contacts.filter(c => c.status === 'won').length;

  // Render a 3-column animated chart, so we need max value for scale
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Trigger the rising animation on mount
    setIsAnimating(true);
  }, []);

  const maxFunnelCount = Math.max(newLeads, proposalLeads, wonCount, 1);

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
        {/* Animated 3-Column Funnel Chart */}
        <div className="glass-panel chart-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '340px' }}>
          <div>
            <span className="chart-title" style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Funil de Vendas</span>
            <div className="chart-subtitle" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Acompanhamento em tempo real das etapas de conversão
            </div>
          </div>

          <div className="funnel-chart-container">
            <div className="funnel-column-wrapper">
              <div className="funnel-value">{newLeads}</div>
              <div 
                className={`funnel-column funnel-col-new ${isAnimating ? 'animate-rise' : ''}`}
                style={{ height: `${Math.max((newLeads / maxFunnelCount) * 100, 10)}%`, animationDelay: '0s' }}
              ></div>
              <div className="funnel-label">Novos Leads</div>
            </div>
            
            <div className="funnel-column-wrapper">
              <div className="funnel-value">{proposalLeads}</div>
              <div 
                className={`funnel-column funnel-col-progress ${isAnimating ? 'animate-rise' : ''}`}
                style={{ height: `${Math.max((proposalLeads / maxFunnelCount) * 100, 10)}%`, animationDelay: '0.2s' }}
              ></div>
              <div className="funnel-label">Em Atendimento</div>
            </div>

            <div className="funnel-column-wrapper">
              <div className="funnel-value">{wonCount}</div>
              <div 
                className={`funnel-column funnel-col-won ${isAnimating ? 'animate-rise' : ''}`}
                style={{ height: `${Math.max((wonCount / maxFunnelCount) * 100, 10)}%`, animationDelay: '0.4s' }}
              ></div>
              <div className="funnel-label">Vendas Fechadas</div>
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

      {/* LOWER GRID: PROPOSAL LEADS TABLE & QUICK CHATS */}
      <div className="dashboard-footer-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginTop: '24px' }}>
        {/* LEADS IN PROPOSAL STAGE TABLE */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>🔥 Negociações em Proposta</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Leads quentes na fase decisiva do funil</p>
            </div>
            <span className="tag status-proposal" style={{ background: 'rgba(217, 70, 239, 0.15)', color: 'var(--color-status-proposal)', fontWeight: '700', border: '1px solid rgba(217, 70, 239, 0.3)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
              {proposalContacts.length} ativos
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lead</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Canal</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Valor</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {proposalContacts.map(contact => (
                  <tr key={contact.id} className="proposal-table-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '14px 8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar" style={{ background: contact.avatarColor, width: '28px', height: '28px', fontSize: '11px' }}>
                        {contact.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{contact.name}</span>
                    </td>
                    <td style={{ padding: '14px 8px' }}>
                      <span className={`kanban-card-channel-icon ${contact.channel}`} style={{ width: '20px', height: '20px', fontSize: '9px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#fff' }}>
                        {contact.channel === 'whatsapp' && 'W'}
                        {contact.channel === 'telegram' && 'I'}
                        {contact.channel === 'webchat' && 'T'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 8px', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {contact.value > 0 ? `R$ ${contact.value.toLocaleString('pt-BR')}` : 'R$ ---'}
                    </td>
                    <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                      <button onClick={() => handleStartChat(contact.id)} className="glass-btn" style={{ padding: '6px 12px', fontSize: '11px', background: 'rgba(7, 167, 225, 0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(7, 167, 225, 0.2)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'none' }}>
                        Negociar ➔
                      </button>
                    </td>
                  </tr>
                ))}
                {proposalContacts.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Nenhum lead na fase de proposta no momento. 💼
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* QUICK CHATS SHORTCUT ROW */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>⚡ Respostas Pendentes</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Clientes aguardando atendimento humano</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
            {contacts.filter(c => c.unread).slice(0, 3).map(contact => (
              <div key={contact.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: 'var(--bg-surface-hover)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-glass)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div className="avatar" style={{ background: contact.avatarColor, width: '28px', height: '28px', fontSize: '11px', flexShrink: 0 }}>
                    {contact.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontWeight: '600', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contact.messages[contact.messages.length - 1]?.text}
                    </span>
                  </div>
                </div>
                <button onClick={() => handleStartChat(contact.id)} className="glass-btn" style={{ padding: '6px 10px', fontSize: '11px', height: '28px', flexShrink: 0 }}>
                  Responder
                </button>
              </div>
            ))}
            {contacts.filter(c => c.unread).length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
                Nenhuma mensagem pendente. 🎉
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
