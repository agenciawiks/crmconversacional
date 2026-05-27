import React from 'react';
import { useCrm } from '../context/CrmContext';
import { PieChart, Pie, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartContext } from './ui/chart';
import { TrendingUp } from 'lucide-react';

export default function KanbanBoard() {
  const { contacts, changeContactStatus, setActiveContactId, setActiveScreen } = useCrm();
  const [activeDropCol, setActiveDropCol] = React.useState(null);
  const [viewMode, setViewMode] = React.useState('board'); // 'board' or 'charts'
  const [hoveredSegmentIdx, setHoveredSegmentIdx] = React.useState(null);

  const columns = [
    { id: 'new', title: 'Novos Leads', class: 'new' },
    { id: 'contacted', title: 'Em Contato', class: 'contacted' },
    { id: 'proposal', title: 'Propostas', class: 'proposal' },
    { id: 'won', title: 'Vendas Ganhas', class: 'won' },
    { id: 'lost', title: 'Perdidos', class: 'lost' }
  ];

  // Drag Handlers
  const handleDragStart = (e, contactId) => {
    e.dataTransfer.setData('text/plain', contactId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, statusId) => {
    e.preventDefault();
    if (activeDropCol !== statusId) {
      setActiveDropCol(statusId);
    }
  };

  const handleDragLeave = () => {
    setActiveDropCol(null);
  };

  const handleDrop = (e, statusId) => {
    e.preventDefault();
    setActiveDropCol(null);
    const contactIdStr = e.dataTransfer.getData('text/plain');
    if (contactIdStr) {
      const contactId = isNaN(contactIdStr) ? contactIdStr : Number(contactIdStr);
      changeContactStatus(contactId, statusId);
    }
  };

  const handleOpenChat = (contactId) => {
    setActiveContactId(contactId);
    setActiveScreen('chat');
  };

  // Render the modern Funnel Chart using pure SVG polygons (Enlarged)
  const RenderFunnelChart = () => {
    const newCount = contacts.filter(c => c.status === 'new').length;
    const contactedCount = contacts.filter(c => c.status === 'contacted').length;
    const proposalCount = contacts.filter(c => c.status === 'proposal').length;
    const wonCount = contacts.filter(c => c.status === 'won').length;

    const stages = [
      { title: 'Novos Leads', count: newCount, color: '#a855f7', wTop: 300, wBottom: 240, y: 10, h: 56 },
      { title: 'Em Contato', count: contactedCount, color: '#3b82f6', wTop: 236, wBottom: 176, y: 76, h: 56 },
      { title: 'Proposta', count: proposalCount, color: '#eab308', wTop: 172, wBottom: 112, y: 142, h: 56 },
      { title: 'Ganho', count: wonCount, color: '#10b981', wTop: 108, wBottom: 48, y: 208, h: 56 }
    ];

    return (
      <Card className="flex flex-col glass-panel" style={{ padding: '0px', flex: 1, border: 'none', background: 'transparent' }}>
        <CardHeader style={{ padding: '24px 24px 0px 24px' }}>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
            <span>📐</span> Conversão do Funil (Leads)
          </CardTitle>
          <CardDescription style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Fluxo de conversão linear das etapas do CRM
          </CardDescription>
        </CardHeader>
        <CardContent style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <svg width="360" height="270" viewBox="0 0 360 270" style={{ overflow: 'visible' }}>
            <defs>
              <filter id="glow-funnel" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              {stages.map((st, i) => (
                <linearGradient key={i} id={`funnel-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={st.color} stopOpacity="0.7" />
                  <stop offset="100%" stopColor={st.color} stopOpacity="0.15" />
                </linearGradient>
              ))}
            </defs>
            
            {stages.map((st, i) => {
              const xTopLeft = 180 - st.wTop / 2;
              const xTopRight = 180 + st.wTop / 2;
              const xBottomLeft = 180 - st.wBottom / 2;
              const xBottomRight = 180 + st.wBottom / 2;
              const points = `${xTopLeft},${st.y} ${xTopRight},${st.y} ${xBottomRight},${st.y + st.h} ${xBottomLeft},${st.y + st.h}`;
              
              return (
                <g key={i} className="funnel-stage-group" style={{ cursor: 'pointer' }}>
                  <polygon 
                    points={points} 
                    fill={`url(#funnel-grad-${i})`} 
                    stroke={st.color} 
                    strokeWidth="1.5"
                    style={{ 
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))'
                    }}
                  />
                  <text x="180" y={st.y + 32} fill="var(--text-primary)" fontSize="12" fontWeight="700" textAnchor="middle" style={{ pointerEvents: 'none', fontFamily: 'var(--font-sans)', letterSpacing: '0.5px' }}>
                    {st.title}: {st.count}
                  </text>
                </g>
              );
            })}
          </svg>
        </CardContent>
      </Card>
    );
  };

  // Render the modern Pizza Donut Chart (Enlarged)
  const RenderDonutChart = () => {
    const newCount = contacts.filter(c => c.status === 'new').length;
    const contactedCount = contacts.filter(c => c.status === 'contacted').length;
    const proposalCount = contacts.filter(c => c.status === 'proposal').length;
    const wonCount = contacts.filter(c => c.status === 'won').length;
    const lostCount = contacts.filter(c => c.status === 'lost').length;

    const totalLeads = contacts.length;
    const activeLeads = contacts.filter(c => c.status !== 'lost' && c.status !== 'won').length;

    const rawSegments = [
      { name: "Novos Leads", value: newCount, color: "#a855f7" },
      { name: "Em Contato", value: contactedCount, color: "#3b82f6" },
      { name: "Propostas", value: proposalCount, color: "#eab308" },
      { name: "Vendas Ganhas", value: wonCount, color: "#10b981" },
      { name: "Perdidos", value: lostCount, color: "#ef4444" }
    ].filter(s => s.value > 0);

    const r = 85;
    const strokeWidth = 16;
    const circ = 2 * Math.PI * r; // ~534

    let accumulatedOffset = 0;
    const segments = rawSegments.map((s, idx) => {
      const pct = totalLeads > 0 ? s.value / totalLeads : 0;
      const strokeLength = pct * circ;
      const offset = accumulatedOffset;
      accumulatedOffset += strokeLength;

      return {
        ...s,
        idx,
        pct,
        strokeLength,
        strokeDasharray: `${strokeLength} ${circ - strokeLength}`,
        strokeDashoffset: -offset
      };
    });

    const isHovered = hoveredSegmentIdx !== null;
    const hoveredSeg = isHovered ? segments.find(s => s.idx === hoveredSegmentIdx) : null;

    return (
      <Card className="flex flex-col glass-panel" style={{ padding: '0px', flex: 1, border: 'none', background: 'transparent' }}>
        <CardHeader className="pb-0" style={{ padding: '24px 24px 0px 24px' }}>
          <CardTitle style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📐</span> Distribuição do Funil
            </span>
            <Badge
              variant="outline"
              className="text-green-500 bg-green-500/10 border-none"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}
            >
              <TrendingUp className="h-3 w-3" />
              <span>{activeLeads} Ativos</span>
            </Badge>
          </CardTitle>
          <CardDescription style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Proporção de leads por etapa do pipeline
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ height: '300px', width: '100%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            
            <svg width="260" height="260" viewBox="0 0 260 260" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
              <defs>
                <filter id="glow-svg" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              
              <circle
                cx="130"
                cy="130"
                r={r}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.03)"
                strokeWidth={strokeWidth}
              />

              {totalLeads === 0 ? (
                <circle
                  cx="130"
                  cy="130"
                  r={r}
                  fill="transparent"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circ} 0`}
                  strokeDashoffset="0"
                />
              ) : (
                segments.map((seg) => {
                  const active = hoveredSegmentIdx === seg.idx;
                  return (
                    <circle
                      key={seg.idx}
                      cx="130"
                      cy="130"
                      r={r}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={active ? strokeWidth + 4 : strokeWidth}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="round"
                      style={{
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        filter: active ? 'url(#glow-svg)' : 'none',
                        opacity: hoveredSegmentIdx === null || active ? 1 : 0.65
                      }}
                      onMouseEnter={() => setHoveredSegmentIdx(seg.idx)}
                      onMouseLeave={() => setHoveredSegmentIdx(null)}
                    />
                  );
                })
              )}
            </svg>

            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              width: '144px',
              height: '144px',
              borderRadius: '50%',
              background: 'rgba(10, 10, 15, 0.4)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.02)',
              boxShadow: 'inset 0 4px 20px rgba(0, 0, 0, 0.4)'
            }}>
              <span style={{ 
                fontSize: '32px', 
                fontWeight: '800', 
                fontFamily: 'var(--font-display)', 
                color: isHovered ? hoveredSeg.color : 'var(--text-primary)',
                textShadow: isHovered ? `0 0 12px ${hoveredSeg.color}66` : 'none',
                transition: 'all 0.2s ease'
              }}>
                {isHovered ? hoveredSeg.value : totalLeads}
              </span>
              <span style={{ 
                fontSize: '10px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em', 
                color: 'var(--text-muted)',
                fontWeight: '600',
                marginTop: '2px',
                maxWidth: '110px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}>
                {isHovered ? hoveredSeg.name : 'Leads'}
              </span>
              {isHovered && (
                <span style={{ 
                  fontSize: '9px', 
                  color: 'rgba(255,255,255,0.4)', 
                  fontWeight: '500', 
                  marginTop: '1px' 
                }}>
                  {Math.round(hoveredSeg.pct * 100)}% do total
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render horizontal glowing bars for communication channel performance
  const RenderChannelPerformance = () => {
    const whatsappCount = contacts.filter(c => c.channel === 'whatsapp').length;
    const telegramCount = contacts.filter(c => c.channel === 'telegram').length;
    const webchatCount = contacts.filter(c => c.channel === 'webchat' || c.channel === 'web').length;
    const total = whatsappCount + telegramCount + webchatCount || 1;

    const channels = [
      { name: 'Whatsapp', count: whatsappCount, color: 'var(--color-whatsapp)', pct: (whatsappCount / total) * 100, icon: '💬' },
      { name: 'Instagram', count: telegramCount, color: 'var(--color-telegram)', pct: (telegramCount / total) * 100, icon: '📸' },
      { name: 'Tiktok', count: webchatCount, color: 'var(--color-webchat)', pct: (webchatCount / total) * 100, icon: '🎵' }
    ];

    return (
      <Card className="flex flex-col glass-panel" style={{ padding: '0px', flex: 1, border: 'none', background: 'transparent' }}>
        <CardHeader style={{ padding: '24px 24px 0px 24px' }}>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
            <span>🔌</span> Desempenho de Canais
          </CardTitle>
          <CardDescription style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Origem e engajamento dos leads ativos por canal
          </CardDescription>
        </CardHeader>
        <CardContent style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center', height: '300px' }}>
          {channels.map((ch, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  <span>{ch.icon}</span> {ch.name}
                </span>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                  {ch.count} leads ({Math.round(ch.pct)}%)
                </span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '100px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                <div style={{
                  height: '100%',
                  width: `${ch.pct}%`,
                  background: ch.color,
                  borderRadius: '100px',
                  boxShadow: `0 0 12px ${ch.color}`,
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  // Render conversion rates cards (AI Performance)
  const RenderBotPerformance = () => {
    const totalMsg = contacts.reduce((acc, c) => acc + (c.messages?.length || 0), 0);
    const automationRate = 88; // 88% handled by bot
    const botHandled = Math.round(totalMsg * 0.88);
    const humanHandled = totalMsg - botHandled;

    return (
      <Card className="flex flex-col glass-panel" style={{ padding: '0px', flex: 1, border: 'none', background: 'transparent' }}>
        <CardHeader style={{ padding: '24px 24px 0px 24px' }}>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
            <span>🤖</span> Automação e IA
          </CardTitle>
          <CardDescription style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Métricas de engajamento do Assistente de Inteligência Artificial
          </CardDescription>
        </CardHeader>
        <CardContent style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '300px', alignItems: 'center' }}>
          
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
            <svg width="130" height="130" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
              <defs>
                <filter id="glow-bot" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.02)"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="transparent"
                stroke="#06b6d4"
                strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - 0.88)}`}
                strokeLinecap="round"
                style={{
                  filter: 'url(#glow-bot)',
                  transition: 'all 1s ease'
                }}
              />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'var(--font-display)', color: '#06b6d4', textShadow: '0 0 10px rgba(6, 182, 212, 0.4)' }}>
                88%
              </div>
              <div style={{ fontSize: '8px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>
                Automatizado
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>Interações da IA</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{botHandled || 184} msg</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>Transbordos (Humanos)</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{humanHandled || 25} msg</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>Tempo de Resposta IA</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>⚡ &lt; 2s</span>
            </div>
          </div>

        </CardContent>
      </Card>
    );
  };

  return (
    <div className="content-wrapper animated-fade-in" style={{ height: '100%', overflow: 'auto', paddingBottom: '40px' }}>
      <div className="page-header">
        <div className="page-title">
          <h1>Funil de Vendas</h1>
          <p>Gerencie, visualize e analise o fluxo de conversão dos seus leads comercialmente.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Total em negociação: <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
              R$ {contacts.filter(c => c.status !== 'lost').reduce((acc, c) => acc + c.value, 0).toLocaleString('pt-BR')}
            </span>
          </div>

          {/* Toggle pill switcher */}
          <div className="glass-panel" style={{ display: 'flex', padding: '4px', gap: '4px', background: 'var(--bg-surface-solid)' }}>
            <button 
              onClick={() => setViewMode('board')} 
              className={`glass-btn ${viewMode === 'board' ? '' : 'secondary'}`}
              style={{ padding: '6px 14px', fontSize: '12px', boxShadow: 'none' }}
            >
              📋 Quadro
            </button>
            <button 
              onClick={() => setViewMode('charts')} 
              className={`glass-btn ${viewMode === 'charts' ? '' : 'secondary'}`}
              style={{ padding: '6px 14px', fontSize: '12px', boxShadow: 'none' }}
            >
              📊 Gráficos
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'board' ? (
        /* KANBAN SCROLLER BOARD VIEW */
        <div className="kanban-board-container">
          {columns.map(col => {
            const colContacts = contacts.filter(c => c.status === col.id);
            const colSum = colContacts.reduce((acc, c) => acc + c.value, 0);
            const isHovered = activeDropCol === col.id;

            return (
              <div
                key={col.id}
                className={`kanban-column ${col.class} ${isHovered ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Header metrics */}
                <div className="kanban-column-header">
                  <div className="kanban-column-title">
                    <span>{col.title}</span>
                    <span className="kanban-count-pill">{colContacts.length}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    R$ {colSum.toLocaleString('pt-BR')}
                  </div>
                </div>

                {/* Stack items */}
                <div className="kanban-cards-stack">
                  {colContacts.map(contact => (
                    <div
                      key={contact.id}
                      className="kanban-card"
                      draggable
                      onDragStart={(e) => handleDragStart(e, contact.id)}
                    >
                      <div className="kanban-card-header">
                        <span className="kanban-card-name">{contact.name}</span>
                        <span 
                          className={`kanban-card-channel-icon ${contact.channel}`} 
                          title={
                            contact.channel === 'whatsapp' ? 'Canal: Whatsapp' : 
                            contact.channel === 'telegram' ? 'Canal: Instagram' : 
                            contact.channel === 'webchat' ? 'Canal: Tiktok' : `Canal: ${contact.channel}`
                          }
                        >
                          {contact.channel === 'whatsapp' && 'W'}
                          {contact.channel === 'telegram' && 'I'}
                          {contact.channel === 'webchat' && 'T'}
                        </span>
                      </div>

                      <div className="kanban-card-tags">
                        {contact.tags && contact.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="kanban-card-tag">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="kanban-card-footer">
                        <span className="kanban-card-value">
                          {contact.value > 0 ? `R$ ${contact.value.toLocaleString('pt-BR')}` : 'R$ ---'}
                        </span>
                        <button
                          onClick={() => handleOpenChat(contact.id)}
                          className="kanban-card-action-btn"
                        >
                          Chat ➔
                        </button>
                      </div>
                    </div>
                  ))}

                  {colContacts.length === 0 && (
                    <div className="kanban-empty-column-placeholder">
                      Nenhum cliente nesta fase. <br /> Arraste um cartão aqui.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* MODERN ANALYTICS CHARTS VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', animation: 'fadeIn var(--transition-normal) forwards' }}>
          <RenderFunnelChart />
          <RenderDonutChart />
          <RenderChannelPerformance />
          <RenderBotPerformance />
        </div>
      )}
    </div>
  );
}
