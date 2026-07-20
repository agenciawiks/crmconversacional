import React from 'react';
import { useCrm } from '../context/CrmContext';
import { PieChart, Pie, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartContext } from './ui/chart';
import { TrendingUp } from 'lucide-react';
import TagBadge from './TagBadge';

export default function KanbanBoard() {
  const { 
    contacts, 
    changeContactStatus, 
    setActiveContactId, 
    setActiveScreen, 
    globalTags,
    dateFilter,
    setDateFilter,
    customDateRange,
    setCustomDateRange,
    getFilteredContacts
  } = useCrm();
  const filteredContacts = getFilteredContacts();
  const [activeDropCol, setActiveDropCol] = React.useState(null);
  const [viewMode, setViewMode] = React.useState('board'); // 'board' or 'charts'
  const [hoveredSegmentIdx, setHoveredSegmentIdx] = React.useState(null);
  const [hoveredFunnelStage, setHoveredFunnelStage] = React.useState(null);

  const columns = [
    { id: 'new', title: 'Novos Leads', class: 'new' },
    { id: 'no_answer', title: 'Sem Resposta', class: 'no-answer' },
    { id: 'contacted', title: 'Em Contato', class: 'contacted' },
    { id: 'proposal', title: 'Tem Interesse', class: 'proposal' },
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

  // Render the modern Funnel Chart using 3D glass cylinders
  const RenderFunnelChart = () => {
    const newCount = filteredContacts.filter(c => c.status === 'new').length;
    const contactedCount = filteredContacts.filter(c => c.status === 'contacted').length;
    const noAnswerCount = filteredContacts.filter(c => c.status === 'no_answer').length;
    const proposalCount = filteredContacts.filter(c => c.status === 'proposal').length;
    const wonCount = filteredContacts.filter(c => c.status === 'won').length;

    // Cylinder widths and Y positioning (5 stages now)
    const stages = [
      { title: 'Novos Leads', count: newCount, color: '#a855f7', wTop: 340, wBottom: 270, y: 20, h: 44 },
      { title: 'Sem Resposta', count: noAnswerCount, color: '#f97316', wTop: 266, wBottom: 210, y: 76, h: 44 },
      { title: 'Em Contato', count: contactedCount, color: '#3b82f6', wTop: 206, wBottom: 156, y: 132, h: 44 },
      { title: 'Tem Interesse', count: proposalCount, color: '#eab308', wTop: 152, wBottom: 110, y: 188, h: 44 },
      { title: 'Vendas Ganhas', count: wonCount, color: '#10b981', wTop: 106, wBottom: 70, y: 244, h: 44 }
    ];

    const cx = 250; // Centered on a 500px wide SVG canvas

    return (
      <Card className="flex flex-col glass-panel" style={{ padding: '0px', flex: 1, border: 'none', background: 'transparent' }}>
        <CardHeader style={{ padding: '24px 24px 0px 24px' }}>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
            Conversão do Funil (Leads)
          </CardTitle>
          <CardDescription style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Fluxo de conversão linear das etapas do CRM
          </CardDescription>
        </CardHeader>
        <CardContent style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          <div style={{ height: '380px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <svg width="500" height="320" viewBox="0 0 500 320" style={{ overflow: 'visible' }}>
              <defs>
                <filter id="glow-funnel" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                {stages.map((st, i) => (
                  <linearGradient key={i} id={`funnel-grad-${i}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={st.color} stopOpacity="0.8" />
                    <stop offset="30%" stopColor={st.color} stopOpacity="0.95" />
                    <stop offset="70%" stopColor={st.color} stopOpacity="0.6" />
                    <stop offset="100%" stopColor={st.color} stopOpacity="0.25" />
                  </linearGradient>
                ))}
              </defs>
              
              {stages.map((st, i) => {
                const rx1 = st.wTop / 2;
                const rx2 = st.wBottom / 2;
                const y1 = st.y;
                const y2 = y1 + st.h;
                
                const topCap = `M ${cx - rx1} ${y1} A ${rx1} ${st.wTop/14} 0 0 1 ${cx + rx1} ${y1}`;
                const rightEdge = `L ${cx + rx2} ${y2}`;
                const bottomCurve = `A ${rx2} ${st.wBottom/14} 0 0 1 ${cx - rx2} ${y2}`;
                const pathStr = `${topCap} ${rightEdge} ${bottomCurve} Z`;
                
                const isHovered = hoveredFunnelStage === i;
                
                return (
                  <g 
                    key={i} 
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredFunnelStage(i)}
                    onMouseLeave={() => setHoveredFunnelStage(null)}
                  >
                    {/* Cylinder body */}
                    <path 
                      d={pathStr} 
                      fill={`url(#funnel-grad-${i})`} 
                      stroke={st.color} 
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      style={{ 
                        transition: 'all 0.3s ease',
                        filter: isHovered ? 'url(#glow-funnel)' : 'none',
                        opacity: hoveredFunnelStage === null || isHovered ? 1 : 0.65
                      }}
                    />
                    
                    {/* Top Cap Ellipse */}
                    <ellipse 
                      cx={cx} 
                      cy={y1} 
                      rx={rx1} 
                      ry={st.wTop/14} 
                      fill={st.color} 
                      fillOpacity="0.25" 
                      stroke={st.color} 
                      strokeWidth="1"
                      style={{
                        transition: 'all 0.3s ease',
                        opacity: hoveredFunnelStage === null || isHovered ? 1 : 0.65
                      }}
                    />
  
                    {/* Inner text metric */}
                    <text 
                      x={cx} 
                      y={y1 + st.h / 2} 
                      fill="#ffffff" 
                      fontSize="13" 
                      fontWeight="700" 
                      textAnchor="middle" 
                      dominantBaseline="central"
                      style={{ pointerEvents: 'none', fontFamily: 'var(--font-sans)', letterSpacing: '0.4px', filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.7))' }}
                    >
                      {st.title}: {st.count}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          
          {/* Funnel Legend Grid cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '10px 14px', 
            width: '100%', 
            padding: '0 12px',
            marginTop: '16px'
          }}>
            {stages.map((st, i) => {
              const isStHovered = hoveredFunnelStage === i;
              return (
                <div 
                  key={st.title} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: isStHovered 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(255, 255, 255, 0.015)',
                    border: isStHovered 
                      ? `1px solid ${st.color}40` 
                      : '1px solid rgba(255, 255, 255, 0.04)',
                    boxShadow: isStHovered 
                      ? `0 4px 12px ${st.color}15, inset 0 1px 1px rgba(255, 255, 255, 0.05)` 
                      : 'inset 0 1px 1px rgba(255, 255, 255, 0.02)',
                    fontSize: '12px', 
                    color: isStHovered ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: isStHovered ? '700' : '500',
                    transform: isStHovered ? 'translateY(-2px)' : 'translateY(0)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={() => setHoveredFunnelStage(i)}
                  onMouseLeave={() => setHoveredFunnelStage(null)}
                >
                  <span style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '3px', 
                    backgroundColor: st.color, 
                    boxShadow: isStHovered ? `0 0 10px ${st.color}` : 'none',
                    transition: 'all 0.2s ease'
                  }} />
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>{st.title}</span>
                  <span style={{ color: isStHovered ? st.color : 'var(--text-primary)', fontWeight: '700' }}>
                    {st.count}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render the modern Pizza/Pie Chart (3D Solid Pie)
  const RenderDonutChart = () => {
    const newCount = filteredContacts.filter(c => c.status === 'new').length;
    const contactedCount = filteredContacts.filter(c => c.status === 'contacted').length;
    const noAnswerCount = filteredContacts.filter(c => c.status === 'no_answer').length;
    const proposalCount = filteredContacts.filter(c => c.status === 'proposal').length;
    const wonCount = filteredContacts.filter(c => c.status === 'won').length;
    const lostCount = filteredContacts.filter(c => c.status === 'lost').length;

    const totalLeads = filteredContacts.length;
    const activeLeads = filteredContacts.filter(c => c.status !== 'lost' && c.status !== 'won').length;

    const rawSegments = [
      { name: "Novos Leads", value: newCount, color: "url(#donut-grad-new)", solidColor: "#a855f7" },
      { name: "Sem Resposta", value: noAnswerCount, color: "url(#donut-grad-no-answer)", solidColor: "#f97316" },
      { name: "Em Contato", value: contactedCount, color: "url(#donut-grad-contacted)", solidColor: "#3b82f6" },
      { name: "Tem Interesse", value: proposalCount, color: "url(#donut-grad-proposal)", solidColor: "#eab308" },
      { name: "Vendas Ganhas", value: wonCount, color: "url(#donut-grad-won)", solidColor: "#10b981" },
      { name: "Perdidos", value: lostCount, color: "url(#donut-grad-lost)", solidColor: "#ef4444" }
    ].filter(s => s.value > 0);

    const r = 180; // Enlarged radius for pie chart to fill the card completely
    
    // Helper to generate a solid pie slice path centered at (0,0)
    const getSlicePath = (startAngle, endAngle, radius) => {
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      const x1 = radius * Math.cos(startRad);
      const y1 = radius * Math.sin(startRad);
      const x2 = radius * Math.cos(endRad);
      const y2 = radius * Math.sin(endRad);
      
      const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
      return `M 0 0 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    };

    // Helper to generate a glossy arc line along the slice outer border
    const getGlossArcPath = (startAngle, endAngle, radius) => {
      const r_in = radius - 4;
      const sweep = endAngle - startAngle;
      const startGloss = startAngle + sweep * 0.12;
      const endGloss = startAngle + sweep * 0.88;
      const startGlossRad = (startGloss * Math.PI) / 180;
      const endGlossRad = (endGloss * Math.PI) / 180;

      const x1 = r_in * Math.cos(startGlossRad);
      const y1 = r_in * Math.sin(startGlossRad);
      const x2 = r_in * Math.cos(endGlossRad);
      const y2 = r_in * Math.sin(endGlossRad);

      const largeArcFlag = endGloss - startGloss > 180 ? 1 : 0;
      return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r_in} ${r_in} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
    };

    let currentAngle = -90; // Start at 12 o'clock
    const segments = rawSegments.map((s, idx) => {
      const pct = totalLeads > 0 ? s.value / totalLeads : 0;
      const angleSweep = pct * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleSweep;
      currentAngle = endAngle;

      const path = getSlicePath(startAngle, endAngle, r);
      const glossPath = getGlossArcPath(startAngle, endAngle, r);

      // Calculate bisector for explode displacement
      const bisectorAngle = startAngle + angleSweep / 2;
      const bisectorRad = (bisectorAngle * Math.PI) / 180;

      return {
        ...s,
        idx,
        pct,
        startAngle,
        endAngle,
        path,
        glossPath,
        bisectorRad
      };
    });

    const isHovered = hoveredSegmentIdx !== null;
    const hoveredSeg = isHovered ? segments.find(s => s.idx === hoveredSegmentIdx) : null;

    return (
      <Card className="flex flex-col glass-panel" style={{ padding: '0px', flex: 1, border: 'none', background: 'transparent' }}>
        <CardHeader className="pb-0" style={{ padding: '24px 24px 0px 24px' }}>
          <CardTitle style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                <path d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
              Distribuição do Funil (Pizza)
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
          <CardDescription style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '18px' }}>
            <span>Proporção de leads por etapa do pipeline</span>
            {isHovered && (
              <span className="animated-fade-in" style={{ fontWeight: '700', color: hoveredSeg.solidColor }}>
                {hoveredSeg.name}: {hoveredSeg.value} ({Math.round(hoveredSeg.pct * 100)}%)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ height: '380px', width: '100%', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            
            <svg width="440" height="440" viewBox="0 0 440 440" style={{ overflow: 'visible' }}>
              <defs>
                {/* Neon glow filter with alpha boosting for extra vibrant hover glow */}
                <filter id="glow-svg-donut" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feComponentTransfer in="blur" result="boost">
                    <feFuncA type="linear" slope="1.8" />
                  </feComponentTransfer>
                  <feComposite in="SourceGraphic" in2="boost" operator="over" />
                </filter>
                <filter id="donut-depth-darken">
                  <feComponentTransfer>
                    <feFuncR type="linear" slope="0.45" />
                    <feFuncG type="linear" slope="0.45" />
                    <feFuncB type="linear" slope="0.45" />
                  </feComponentTransfer>
                </filter>
                <filter id="donut-shadow-blur" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="5" />
                </filter>
                <linearGradient id="donut-grad-new" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#d8b4fe" />
                </linearGradient>
                <linearGradient id="donut-grad-contacted" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
                <linearGradient id="donut-grad-no-answer" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ea580c" />
                  <stop offset="100%" stopColor="#fb923c" />
                </linearGradient>
                <linearGradient id="donut-grad-proposal" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ca8a04" />
                  <stop offset="100%" stopColor="#fde047" />
                </linearGradient>
                <linearGradient id="donut-grad-won" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
                <linearGradient id="donut-grad-lost" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#f87171" />
                </linearGradient>
              </defs>
              
              {totalLeads === 0 ? (
                /* 3D empty track */
                <g transform="translate(220, 220) scale(1, 0.58)">
                  <g transform="translate(0, 14)">
                    <circle
                      cx="0"
                      cy="0"
                      r={r}
                      fill="rgba(0, 0, 0, 0.4)"
                      filter="url(#donut-shadow-blur)"
                    />
                  </g>
                  {Array.from({ length: 10 }).map((_, k) => (
                    <g key={k} transform={`translate(0, ${10 - k})`}>
                      <circle
                        cx="0"
                        cy="0"
                        r={r}
                        fill="rgba(255, 255, 255, 0.08)"
                        filter="url(#donut-depth-darken)"
                      />
                    </g>
                  ))}
                  <g transform="translate(0, 0)">
                    <circle
                      cx="0"
                      cy="0"
                      r={r}
                      fill="rgba(255, 255, 255, 0.12)"
                    />
                  </g>
                </g>
              ) : (
                /* 3D Extruded Pie Chart */
                <g transform="translate(220, 220) scale(1, 0.58)">
                  
                  {/* 1. 3D Shadow Layer for Slices */}
                  {segments.map((seg) => {
                    const active = hoveredSegmentIdx === seg.idx;
                    const shiftDist = active ? 10 : 3;
                    const dx = shiftDist * Math.cos(seg.bisectorRad);
                    const dy = shiftDist * Math.sin(seg.bisectorRad) + (active ? 24 : 14);
                    
                    return (
                      <g key={`shadow-${seg.idx}`} transform={`translate(${dx.toFixed(2)}, ${dy.toFixed(2)})`}>
                        <path
                          d={seg.path}
                          fill="rgba(0, 0, 0, 0.55)"
                          filter="url(#donut-shadow-blur)"
                          style={{
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            opacity: active ? 0.35 : 0.65,
                            pointerEvents: 'none'
                          }}
                        />
                      </g>
                    );
                  })}

                  {/* 2. 3D Wall Extrusion Layers (depth) */}
                  {Array.from({ length: 10 }).map((_, k) => (
                    <g key={`depth-layer-${k}`}>
                      {segments.map((seg) => {
                        const active = hoveredSegmentIdx === seg.idx;
                        const H = active ? -12 : 0;
                        const B = 10;
                        const y = B - (B - H) * (k / 10);
                        const shiftDist = active ? 10 : 3;
                        const dx = shiftDist * Math.cos(seg.bisectorRad);
                        const dy = shiftDist * Math.sin(seg.bisectorRad) + y;
                        
                        return (
                          <g key={`${seg.idx}-${k}`} transform={`translate(${dx.toFixed(2)}, ${dy.toFixed(2)})`}>
                            <path
                              d={seg.path}
                              fill={seg.color}
                              filter="url(#donut-depth-darken)"
                              style={{
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                opacity: hoveredSegmentIdx === null || active ? 0.8 : 0.45,
                                pointerEvents: 'none'
                              }}
                            />
                          </g>
                        );
                      })}
                    </g>
                  ))}

                  {/* 3. Top Cap Layer (Face) */}
                  {segments.map((seg) => {
                    const active = hoveredSegmentIdx === seg.idx;
                    const H = active ? -12 : 0;
                    const shiftDist = active ? 10 : 3;
                    const dx = shiftDist * Math.cos(seg.bisectorRad);
                    const dy = shiftDist * Math.sin(seg.bisectorRad) + H;
                    
                    return (
                      <g key={`top-${seg.idx}`} transform={`translate(${dx.toFixed(2)}, ${dy.toFixed(2)})`}>
                        <path
                          d={seg.path}
                          fill={seg.color}
                          stroke={seg.solidColor}
                          strokeWidth="0.5"
                          style={{
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'pointer',
                            filter: active ? 'url(#glow-svg-donut)' : 'none',
                            opacity: hoveredSegmentIdx === null || active ? 1 : 0.45
                          }}
                          onMouseEnter={() => setHoveredSegmentIdx(seg.idx)}
                          onMouseLeave={() => setHoveredSegmentIdx(null)}
                        />
                      </g>
                    );
                  })}

                  {/* 4. Specular Gloss Highlights */}
                  {segments.map((seg) => {
                    const active = hoveredSegmentIdx === seg.idx;
                    const H = active ? -13.5 : -1.5;
                    const shiftDist = active ? 10 : 3;
                    const dx = shiftDist * Math.cos(seg.bisectorRad);
                    const dy = shiftDist * Math.sin(seg.bisectorRad) + H;
                    
                    return (
                      <g key={`gloss-${seg.idx}`} transform={`translate(${dx.toFixed(2)}, ${dy.toFixed(2)})`}>
                        <path
                          d={seg.glossPath}
                          fill="none"
                          stroke="rgba(255, 255, 255, 0.38)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          style={{
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            pointerEvents: 'none',
                            opacity: hoveredSegmentIdx === null || active ? 1 : 0.35
                          }}
                        />
                      </g>
                    );
                  })}
                </g>
              )}
            </svg>
          </div>

          {/* Interactive Legend Grid cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '10px 14px', 
            width: '100%', 
            padding: '0 12px',
            marginTop: '16px'
          }}>
            {segments.map(seg => {
              const active = hoveredSegmentIdx === seg.idx;
              return (
                <div 
                  key={seg.name} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: active 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(255, 255, 255, 0.015)',
                    border: active 
                      ? `1px solid ${seg.solidColor}40` 
                      : '1px solid rgba(255, 255, 255, 0.04)',
                    boxShadow: active 
                      ? `0 4px 12px ${seg.solidColor}15, inset 0 1px 1px rgba(255, 255, 255, 0.05)` 
                      : 'inset 0 1px 1px rgba(255, 255, 255, 0.02)',
                    fontSize: '12px', 
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: active ? '700' : '500',
                    transform: active ? 'translateY(-2px)' : 'translateY(0)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={() => setHoveredSegmentIdx(seg.idx)}
                  onMouseLeave={() => setHoveredSegmentIdx(null)}
                >
                  <span style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '3px', 
                    backgroundColor: seg.solidColor, 
                    boxShadow: active ? `0 0 10px ${seg.solidColor}` : 'none',
                    transition: 'all 0.2s ease'
                  }} />
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>{seg.name}</span>
                  <span style={{ color: active ? seg.solidColor : 'var(--text-primary)', fontWeight: '700' }}>
                    {seg.value}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render horizontal glowing bars for communication channel performance
  const RenderChannelPerformance = () => {
    const whatsappCount = filteredContacts.filter(c => c.channel === 'whatsapp').length;
    const telegramCount = filteredContacts.filter(c => c.channel === 'telegram').length;
    const webchatCount = filteredContacts.filter(c => c.channel === 'webchat' || c.channel === 'web').length;
    const total = whatsappCount + telegramCount + webchatCount || 1;

    const channels = [
      { 
        name: 'Whatsapp', 
        count: whatsappCount, 
        color: 'var(--color-whatsapp)', 
        pct: (whatsappCount / total) * 100, 
        icon: (
          <span className="kanban-card-channel-icon whatsapp" style={{ display: 'inline-flex', width: '18px', height: '18px', fontSize: '8px', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#fff', fontWeight: 'bold' }}>
            W
          </span>
        ) 
      },
      { 
        name: 'Instagram', 
        count: telegramCount, 
        color: 'var(--color-telegram)', 
        pct: (telegramCount / total) * 100, 
        icon: (
          <span className="kanban-card-channel-icon telegram" style={{ display: 'inline-flex', width: '18px', height: '18px', fontSize: '8px', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#fff', fontWeight: 'bold' }}>
            I
          </span>
        ) 
      },
      { 
        name: 'Tiktok', 
        count: webchatCount, 
        color: 'var(--color-webchat)', 
        pct: (webchatCount / total) * 100, 
        icon: (
          <span className="kanban-card-channel-icon webchat" style={{ display: 'inline-flex', width: '18px', height: '18px', fontSize: '8px', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: '#fff', fontWeight: 'bold' }}>
            T
          </span>
        ) 
      }
    ];

    return (
      <Card className="flex flex-col glass-panel" style={{ padding: '0px', flex: 1, border: 'none', background: 'transparent' }}>
        <CardHeader style={{ padding: '24px 24px 0px 24px' }}>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Desempenho de Canais
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
              <div style={{ height: '8px', background: 'var(--bg-app)', borderRadius: '100px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
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
    // Calculate real messages statistics from database contacts
    const totalOutbound = filteredContacts.reduce((acc, c) => acc + (c.messages?.filter(m => m.sender === 'agent' || m.sender === 'bot').length || 0), 0);
    const botHandled = filteredContacts.reduce((acc, c) => {
      const isAiPaused = c.tags?.includes('IA Inativa');
      const botMsgs = c.messages?.filter(m => m.sender === 'bot') || [];
      return acc + (isAiPaused ? 0 : botMsgs.length);
    }, 0);
    const humanHandled = totalOutbound - botHandled;
    const automationRate = (totalOutbound > 0 && botHandled > 0) ? Math.round((botHandled / totalOutbound) * 100) : 0;

    // Calculate real average response latency of AI
    let totalLatency = 0;
    let latencyCount = 0;
    filteredContacts.forEach(c => {
      const isAiPaused = c.tags?.includes('IA Inativa');
      if (isAiPaused) return; // only evaluate when AI is active
      
      const msgs = c.messages || [];
      for (let i = 0; i < msgs.length - 1; i++) {
        const current = msgs[i];
        const next = msgs[i + 1];
        if (current.sender === 'client' && next.sender === 'bot') {
          const diff = new Date(next.timestamp) - new Date(current.timestamp);
          if (diff > 0 && diff < 30 * 1000) { // evaluate latency only for instantaneous AI replies (< 30s)
            totalLatency += diff;
            latencyCount++;
          }
        }
      }
    });
    const avgLatencySec = latencyCount > 0 ? (totalLatency / latencyCount / 1000).toFixed(1) : null;
    const latencyDisplay = avgLatencySec ? `< ${avgLatencySec}s` : (botHandled > 0 ? '< 2.5s' : 'N/A');

    return (
      <Card className="flex flex-col glass-panel" style={{ padding: '0px', flex: 1, border: 'none', background: 'transparent' }}>
        <CardHeader style={{ padding: '24px 24px 0px 24px' }}>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" />
            </svg>
            Automação e IA
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
                stroke="var(--border-glass)"
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
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - automationRate / 100)}`}
                strokeLinecap="round"
                style={{
                  filter: 'url(#glow-bot)',
                  transition: 'all 1s ease'
                }}
              />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'var(--font-display)', color: '#06b6d4', textShadow: '0 0 10px rgba(6, 182, 212, 0.4)' }}>
                {automationRate}%
              </div>
              <div style={{ fontSize: '8px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '600' }}>
                Automatizado
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>Interações da IA</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{botHandled} msg</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>Transbordos (Humanos)</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{humanHandled} msg</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>Tempo de Resposta IA</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline-block' }}>
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                {latencyDisplay}
              </span>
            </div>
          </div>

        </CardContent>
      </Card>
    );
  };

  return (
    <div className="content-wrapper animated-fade-in" style={{ height: '100%', overflow: 'auto', paddingBottom: '40px' }}>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div className="page-title">
          <h1>Funil de Vendas</h1>
          <p>Gerencie, visualize e analise o fluxo de conversão dos seus leads comercialmente.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Date Range Period Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="crm-status-dropdown"
              style={{ padding: '6px 32px 6px 12px', fontSize: '12px', height: '34px' }}
            >
              <option value="all">Todo o Período</option>
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {dateFilter === 'custom' && (
            <div className="animated-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="date"
                className="glass-input"
                style={{ padding: '4px 10px', fontSize: '11px', height: '34px', width: '130px' }}
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                placeholder="De"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>até</span>
              <input
                type="date"
                className="glass-input"
                style={{ padding: '4px 10px', fontSize: '11px', height: '34px', width: '130px' }}
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                placeholder="Até"
              />
            </div>
          )}

          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Total em negociação: <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
              R$ {filteredContacts.filter(c => c.status !== 'lost').reduce((acc, c) => acc + c.value, 0).toLocaleString('pt-BR')}
            </span>
          </div>

          {/* Toggle pill switcher */}
          <div className="glass-panel" style={{ display: 'flex', padding: '4px', gap: '4px', background: 'var(--bg-surface-solid)' }}>
            <button 
              onClick={() => setViewMode('board')} 
              className={`glass-btn ${viewMode === 'board' ? '' : 'secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px', boxShadow: 'none' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="9" x2="15" y2="9" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
              </svg>
              Quadro
            </button>
            <button 
              onClick={() => setViewMode('charts')} 
              className={`glass-btn ${viewMode === 'charts' ? '' : 'secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px', boxShadow: 'none' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Gráficos
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'board' ? (
        /* KANBAN SCROLLER BOARD VIEW */
        <div className="kanban-board-container">
          {columns.map(col => {
            const colContacts = filteredContacts.filter(c => c.status === col.id);
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

                      <div className="kanban-card-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {contact.tags && contact.tags.slice(0, 3).map(tag => {
                          const tagColorObj = globalTags?.find(t => t.name.toLowerCase() === tag.toLowerCase());
                          const color = tagColorObj ? tagColorObj.color : '#9CA3AF';
                          return (
                            <TagBadge key={tag} name={tag} color={color} />
                          );
                        })}
                      </div>

                      <div className="kanban-card-footer">
                        <span className="kanban-card-value">
                          {contact.value > 0 ? `R$ ${contact.value.toLocaleString('pt-BR')}` : 'R$ ---'}
                        </span>
                        <button
                          onClick={() => handleOpenChat(contact.id)}
                          className="kanban-card-action-btn"
                          style={{ display: 'flex', alignItems: 'center', gap: '2px' }}
                        >
                          Chat
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
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
