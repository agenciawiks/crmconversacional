import React, { useEffect, useState } from 'react';
import { useCrm } from '../context/CrmContext';
import { supabase } from '../supabase';
import { 
  MessageCircle, UserPlus, FileText, BadgeDollarSign, Cpu, CheckCircle2, 
  Webhook, Briefcase, MessagesSquare, Bot, TrendingUp, TrendingDown, 
  ArrowRight, StickyNote 
} from 'lucide-react';

const calculatePercentageChange = (curr, prev) => {
  if (prev === 0) return curr > 0 ? '+100%' : '0%';
  const diff = ((curr - prev) / prev) * 100;
  return `${diff >= 0 ? '+' : ''}${diff.toFixed(0)}%`;
};

const formatRelativeTime = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Agora';
  if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Há ${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString('pt-BR');
};

const formatActivityItem = (row) => ({
  id: row.id,
  type: row.type, // 'bot' | 'won' | 'lost' | 'lead' | 'note' | 'status_changed' | 'webhook'
  title: row.title,
  meta: row.meta,
  contactId: row.contact_id,
  timestamp: row.created_at,
  time: formatRelativeTime(row.created_at)
});

const ACTIVITY_VISUAL = {
  lead:           { icon: UserPlus,      color: 'var(--accent-secondary)' },      // Cyan
  bot:            { icon: Bot,           color: 'var(--accent-primary)' },        // Violet
  webhook:        { icon: MessageCircle, color: 'var(--color-status-contacted)' },// Blue
  won:            { icon: TrendingUp,    color: 'var(--color-status-won)' },      // Success
  lost:           { icon: TrendingDown,  color: 'var(--color-status-lost)' },     // Danger
  status_changed: { icon: ArrowRight,    color: 'var(--color-status-proposal)' }, // Amber
  note:           { icon: StickyNote,    color: 'var(--text-secondary)' }         // Slate
};

export default function Dashboard() {
  const { contacts, isBotEnabled, setIsBotEnabled, setActiveScreen, setActiveContactId } = useCrm();

  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

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

  // Fetch activities from Supabase & Subscribe to Realtime
  useEffect(() => {
    let active = true;
    async function loadActivities() {
      try {
        const { data, error } = await supabase
          .from('activity_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (active && !error && data) {
          setActivities(data.map(formatActivityItem));
        }
      } catch (e) {
        console.error("Erro ao carregar atividades do Supabase:", e);
      } finally {
        if (active) setLoadingActivities(false);
      }
    }
    loadActivities();

    const channel = supabase
      .channel('activity_log_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        (payload) => {
          if (active) {
            setActivities(prev => [formatActivityItem(payload.new), ...prev].slice(0, 10));
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const maxFunnelCount = Math.max(newLeads, proposalLeads, wonCount, 1);

  // Calculate dynamic trend indicators
  const now = new Date();
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfLastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const leadsThisWeek = contacts.filter(c => new Date(c.created_at) >= startOfWeek).length;
  const leadsLastWeek = contacts.filter(c => {
    const d = new Date(c.created_at);
    return d >= startOfLastWeek && d < startOfWeek;
  }).length;

  const totalLeadsTrend = `+${leadsThisWeek} esta semana (${calculatePercentageChange(leadsThisWeek, leadsLastWeek)} vs sem. anterior)`;
  const isTotalLeadsTrendPositive = leadsThisWeek >= leadsLastWeek;

  const startOfToday = new Date();
  startOfToday.setHours(0,0,0,0);
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

  const leadsToday = contacts.filter(c => c.status === 'new' && new Date(c.created_at) >= startOfToday).length;
  const leadsYesterday = contacts.filter(c => {
    const d = new Date(c.created_at);
    return c.status === 'new' && d >= startOfYesterday && d < startOfToday;
  }).length;

  const deltaLeads = leadsToday - leadsYesterday;
  const newLeadsTrend = `${deltaLeads >= 0 ? '+' : ''}${deltaLeads} hoje (vs ${leadsYesterday} ontem)`;
  const isNewLeadsTrendPositive = deltaLeads >= 0;

  const proposalToday = contacts.filter(c => c.status === 'proposal' && new Date(c.updated_at || c.created_at) >= startOfToday).length;
  const proposalYesterday = contacts.filter(c => {
    const d = new Date(c.updated_at || c.created_at);
    return c.status === 'proposal' && d >= startOfYesterday && d < startOfToday;
  }).length;

  const deltaProposal = proposalToday - proposalYesterday;
  const proposalTrend = `${deltaProposal >= 0 ? '+' : ''}${deltaProposal} hoje (vs ${proposalYesterday} ontem)`;
  const isProposalTrendPositive = deltaProposal >= 0;

  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const revenueThisMonth = contacts.filter(c => c.status === 'won' && new Date(c.created_at) >= startOfThisMonth).reduce((sum, c) => sum + (c.value || 0), 0);
  const revenueLastMonth = contacts.filter(c => {
    const d = new Date(c.created_at);
    return c.status === 'won' && d >= startOfLastMonth && d <= endOfLastMonth;
  }).reduce((sum, c) => sum + (c.value || 0), 0);

  const revenueTrend = `${calculatePercentageChange(revenueThisMonth, revenueLastMonth)} vs mês anterior`;
  const isRevenueTrendPositive = revenueThisMonth >= revenueLastMonth;

  const kpis = [
    {
      title: 'Total de Leads',
      value: totalChats,
      trend: totalLeadsTrend,
      isPositive: isTotalLeadsTrendPositive,
      icon: <MessageCircle size={18} strokeWidth={2.5} />
    },
    {
      title: 'Novos Leads',
      value: newLeads,
      trend: newLeadsTrend,
      isPositive: isNewLeadsTrendPositive,
      icon: <UserPlus size={18} strokeWidth={2.5} />
    },
    {
      title: 'Tem Interesse',
      value: proposalLeads,
      trend: proposalTrend,
      isPositive: isProposalTrendPositive,
      icon: <Briefcase size={18} strokeWidth={2.5} />
    },
    {
      title: 'Receita Ganha',
      value: `R$ ${wonLeadsTotal.toLocaleString('pt-BR')}`,
      trend: revenueTrend,
      isPositive: isRevenueTrendPositive,
      icon: <BadgeDollarSign size={18} strokeWidth={2.5} />
    }
  ];

  const renderActivityIcon = (type) => {
    const visual = ACTIVITY_VISUAL[type] || { icon: MessageCircle, color: 'var(--text-muted)' };
    const IconComponent = visual.icon;
    return <IconComponent size={16} strokeWidth={2.5} style={{ color: visual.color }} />;
  };

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
            <span className="chart-title">Histórico de Atividades</span>
            <span className="chart-subtitle">Eventos, triggers e interações em tempo real</span>
          </div>

          <div className="timeline-list">
            {loadingActivities ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
                Carregando atividades...
              </div>
            ) : activities.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
                Nenhuma atividade registrada.
              </div>
            ) : (
              activities.map(act => (
                <div key={act.id} className="timeline-item">
                  <div className="timeline-icon-dot">
                    {renderActivityIcon(act.type)}
                  </div>
                  <div className="timeline-content">
                    <span className="timeline-title">{act.title}</span>
                    <span className="timeline-meta">{act.meta}</span>
                    <span className="timeline-time">{act.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* LOWER GRID: PROPOSAL LEADS TABLE & QUICK CHATS */}
      <div className="dashboard-footer-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginTop: '24px' }}>
        {/* LEADS IN PROPOSAL STAGE TABLE */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={18} strokeWidth={2.5} style={{ color: 'var(--color-status-proposal)' }} />
                Negociações em Tem Interesse
              </h3>
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
                        Negociar
                      </button>
                    </td>
                  </tr>
                ))}
                {proposalContacts.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Nenhum lead na fase de Tem Interesse no momento.
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
            <h3 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessagesSquare size={18} strokeWidth={2.5} style={{ color: 'var(--color-status-contacted)' }} />
              Respostas Pendentes
            </h3>
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
                Nenhuma mensagem pendente.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
