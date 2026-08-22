import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useCrm } from '../context/CrmContext';
import { supabase } from '../supabase';
import {
  ArrowRight, BadgeDollarSign, Bot, Briefcase, CheckCircle2, ChevronRight,
  MessageCircle, MessagesSquare, StickyNote, TrendingDown, TrendingUp, UserPlus
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
  type: row.type,
  title: row.title,
  meta: row.meta,
  contactId: row.contact_id,
  timestamp: row.created_at,
  time: formatRelativeTime(row.created_at)
});

const ACTIVITY_VISUAL = {
  lead: { icon: UserPlus, className: 'lead' },
  bot: { icon: Bot, className: 'bot' },
  webhook: { icon: MessageCircle, className: 'webhook' },
  won: { icon: TrendingUp, className: 'won' },
  lost: { icon: TrendingDown, className: 'lost' },
  status_changed: { icon: ArrowRight, className: 'status' },
  note: { icon: StickyNote, className: 'note' }
};

const getInitials = (name) => (name || 'Sem nome').substring(0, 2).toUpperCase();
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const chartDayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
const chartRangeFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

const buildSmoothPath = (points) => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const midpoint = (previous.x + point.x) / 2;
    return `${path} C ${midpoint},${previous.y} ${midpoint},${point.y} ${point.x},${point.y}`;
  }, `M ${points[0].x},${points[0].y}`);
};

export default function Dashboard() {
  const {
    contacts,
    initialDataLoaded,
    isBotEnabled,
    setIsBotEnabled,
    setActiveScreen,
    setActiveContactId
  } = useCrm();

  const dashboardRef = useRef(null);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [chartPeriod, setChartPeriod] = useState(7);
  const [activeChartIndex, setActiveChartIndex] = useState(null);
  const dashboardReady = initialDataLoaded && !loadingActivities;
  const leadContacts = contacts.filter((contact) => !contact.is_group);

  const totalChats = leadContacts.length;
  const newLeads = leadContacts.filter((contact) => contact.status === 'new').length;
  const proposalLeads = leadContacts.filter((contact) => contact.status === 'proposal').length;
  const wonLeadsTotal = leadContacts
    .filter((contact) => contact.status === 'won')
    .reduce((sum, contact) => sum + (contact.value || 0), 0);
  const proposalContacts = leadContacts.filter((contact) => contact.status === 'proposal');
  const wonCount = leadContacts.filter((contact) => contact.status === 'won').length;

  // Full-motion engine ported from the animated reference project.
  useLayoutEffect(() => {
    const root = dashboardRef.current;
    if (!root || !dashboardReady) return undefined;

    const context = gsap.context(() => {
      const hero = root.querySelector('.dashboard-hero');
      const metrics = Array.from(root.querySelectorAll('.dashboard-kpi-card'));
      const surfaces = Array.from(root.querySelectorAll('.dashboard-primary-card, .dashboard-activity-card, .dashboard-side-card, .dashboard-footer-card'));
      const entryTargets = [hero, ...metrics, ...surfaces].filter(Boolean);

      gsap.killTweensOf(entryTargets);
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from(hero, { y: -24, autoAlpha: 0, duration: 0.62, clearProps: 'transform,opacity,visibility' }, 0)
        .from(metrics, { scale: 0.92, y: 28, autoAlpha: 0, duration: 0.58, stagger: 0.1, clearProps: 'transform,opacity,visibility' }, 0.14)
        .from(surfaces, { y: 34, autoAlpha: 0, duration: 0.64, stagger: 0.12, clearProps: 'transform,opacity,visibility' }, 0.32);

      gsap.to('.dashboard-ambient-blob--blue', { x: -95, y: 76, scale: 1.18, duration: 13, ease: 'sine.inOut', repeat: -1, yoyo: true });
      gsap.to('.dashboard-ambient-blob--mint', { x: 125, y: -68, scale: 0.84, duration: 17, ease: 'sine.inOut', repeat: -1, yoyo: true });
      gsap.to('.dashboard-live-chip i, .dashboard-overline i', { scale: 1.35, duration: 1.55, ease: 'sine.inOut', repeat: -1, yoyo: true, stagger: 0.22 });
    }, root);

    const glow = root.querySelector('.dashboard-cursor-glow');
    const xGlow = glow ? gsap.quickTo(glow, 'x', { duration: 0.55, ease: 'power3.out' }) : null;
    const yGlow = glow ? gsap.quickTo(glow, 'y', { duration: 0.55, ease: 'power3.out' }) : null;
    const interactiveSelector = '.dashboard-kpi-card, .dashboard-card, .dashboard-bot-control';
    let pendingPointerEvent = null;
    let pointerFrame = null;

    const renderPointerFrame = () => {
      const event = pendingPointerEvent;
      pointerFrame = null;
      if (!event) return;

      const rootBounds = root.getBoundingClientRect();
      const target = event.target instanceof Element ? event.target : null;
      const card = target?.closest(interactiveSelector) || null;
      const cardBounds = card?.getBoundingClientRect() || null;

      root.style.setProperty('--dashboard-pointer-x', `${((event.clientX - rootBounds.left) / rootBounds.width) * 100}%`);
      root.style.setProperty('--dashboard-pointer-y', `${((event.clientY - rootBounds.top) / rootBounds.height) * 100}%`);
      xGlow?.(event.clientX - rootBounds.left - 190);
      yGlow?.(event.clientY - rootBounds.top - 190);

      if (!card || !cardBounds) return;
      const rotateX = (((event.clientY - cardBounds.top) / cardBounds.height) - 0.5) * -4.2;
      const rotateY = (((event.clientX - cardBounds.left) / cardBounds.width) - 0.5) * 5.2;
      card.style.setProperty('--dashboard-mouse-x', `${event.clientX - cardBounds.left}px`);
      card.style.setProperty('--dashboard-mouse-y', `${event.clientY - cardBounds.top}px`);
      gsap.to(card, { y: -3, rotationX: rotateX, rotationY: rotateY, transformPerspective: 900, duration: 0.32, ease: 'power2.out', overwrite: 'auto' });
    };

    const handlePointerMove = (event) => {
      pendingPointerEvent = event;
      if (pointerFrame === null) pointerFrame = window.requestAnimationFrame(renderPointerFrame);
    };

    const handlePointerOut = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const card = target?.closest(interactiveSelector);
      if (card && !card.contains(event.relatedTarget)) {
        gsap.to(card, { y: 0, rotationX: 0, rotationY: 0, duration: 0.72, ease: 'elastic.out(1, .55)', overwrite: 'auto' });
      }
    };

    root.addEventListener('pointermove', handlePointerMove, { passive: true });
    root.addEventListener('pointerout', handlePointerOut);
    return () => {
      root.removeEventListener('pointermove', handlePointerMove);
      root.removeEventListener('pointerout', handlePointerOut);
      if (pointerFrame !== null) window.cancelAnimationFrame(pointerFrame);
      context.revert();
    };
  }, [dashboardReady]);

  useEffect(() => {
    let active = true;

    async function loadActivities() {
      try {
        const { data, error } = await supabase
          .from('activity_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (active && !error && data) setActivities(data.map(formatActivityItem));
      } catch (error) {
        console.error('Erro ao carregar atividades do Supabase:', error);
      } finally {
        if (active) setLoadingActivities(false);
      }
    }

    loadActivities();
    const channel = supabase
      .channel('activity_log_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, (payload) => {
        if (active) setActivities((previous) => [formatActivityItem(payload.new), ...previous].slice(0, 10));
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const now = new Date();
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfLastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const leadsThisWeek = leadContacts.filter((contact) => new Date(contact.created_at) >= startOfWeek).length;
  const leadsLastWeek = leadContacts.filter((contact) => {
    const date = new Date(contact.created_at);
    return date >= startOfLastWeek && date < startOfWeek;
  }).length;
  const totalLeadsTrend = `+${leadsThisWeek} esta semana (${calculatePercentageChange(leadsThisWeek, leadsLastWeek)} vs sem. anterior)`;
  const isTotalLeadsTrendPositive = leadsThisWeek >= leadsLastWeek;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const leadsToday = leadContacts.filter((contact) => contact.status === 'new' && new Date(contact.created_at) >= startOfToday).length;
  const leadsYesterday = leadContacts.filter((contact) => {
    const date = new Date(contact.created_at);
    return contact.status === 'new' && date >= startOfYesterday && date < startOfToday;
  }).length;
  const deltaLeads = leadsToday - leadsYesterday;
  const newLeadsTrend = `${deltaLeads >= 0 ? '+' : ''}${deltaLeads} hoje (vs ${leadsYesterday} ontem)`;
  const isNewLeadsTrendPositive = deltaLeads >= 0;

  const proposalToday = leadContacts.filter((contact) => contact.status === 'proposal' && new Date(contact.updated_at || contact.created_at) >= startOfToday).length;
  const proposalYesterday = leadContacts.filter((contact) => {
    const date = new Date(contact.updated_at || contact.created_at);
    return contact.status === 'proposal' && date >= startOfYesterday && date < startOfToday;
  }).length;
  const deltaProposal = proposalToday - proposalYesterday;
  const proposalTrend = `${deltaProposal >= 0 ? '+' : ''}${deltaProposal} hoje (vs ${proposalYesterday} ontem)`;
  const isProposalTrendPositive = deltaProposal >= 0;

  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const revenueThisMonth = leadContacts
    .filter((contact) => contact.status === 'won' && new Date(contact.created_at) >= startOfThisMonth)
    .reduce((sum, contact) => sum + (contact.value || 0), 0);
  const revenueLastMonth = leadContacts
    .filter((contact) => {
      const date = new Date(contact.created_at);
      return contact.status === 'won' && date >= startOfLastMonth && date <= endOfLastMonth;
    })
    .reduce((sum, contact) => sum + (contact.value || 0), 0);
  const revenueTrend = `${calculatePercentageChange(revenueThisMonth, revenueLastMonth)} vs mês anterior`;
  const isRevenueTrendPositive = revenueThisMonth >= revenueLastMonth;

  const bucketCount = 7;
  const periodEnd = now.getTime();
  const periodStart = periodEnd - chartPeriod * 24 * 60 * 60 * 1000;
  const bucketDuration = (periodEnd - periodStart) / bucketCount;
  const chartSeriesBase = Array.from({ length: bucketCount }, (_, index) => {
    const start = periodStart + index * bucketDuration;
    const end = start + bucketDuration;
    const value = leadContacts.filter((contact) => {
      const timestamp = new Date(contact.created_at).getTime();
      return timestamp >= start && timestamp < end;
    }).length;
    const labelDate = new Date(end - 1);
    const label = chartPeriod === 7
      ? new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(labelDate).replace('.', '').toUpperCase()
      : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(labelDate);
    const periodLabel = chartPeriod === 7
      ? chartDayFormatter.format(labelDate)
      : `${chartRangeFormatter.format(new Date(start))} – ${chartRangeFormatter.format(labelDate)}`;
    return { label, value, periodLabel };
  });
  const chartTotal = chartSeriesBase.reduce((sum, item) => sum + item.value, 0);
  const chartSeries = chartSeriesBase.map((item, index) => ({
    ...item,
    delta: index === 0 ? null : item.value - chartSeriesBase[index - 1].value,
    share: chartTotal > 0 ? (item.value / chartTotal) * 100 : 0
  }));
  const chartMaximum = Math.max(...chartSeries.map((item) => item.value), 1);
  const chartPoints = chartSeries.map((item, index) => ({
    ...item,
    x: 12 + index * (676 / (bucketCount - 1)),
    y: 188 - (item.value / chartMaximum) * 158
  }));
  const chartPath = buildSmoothPath(chartPoints);
  const chartAreaPath = `${chartPath} L ${chartPoints[chartPoints.length - 1].x},204 L ${chartPoints[0].x},204 Z`;
  const peakPoint = chartPoints.reduce((peak, point) => (point.value > peak.value ? point : peak), chartPoints[0]);
  const conversionRate = totalChats > 0 ? (wonCount / totalChats) * 100 : 0;
  const unreadContacts = contacts.filter((contact) => contact.unread);

  useLayoutEffect(() => {
    const root = dashboardRef.current;
    if (!root || !dashboardReady) return undefined;

    const context = gsap.context(() => {
      const trendLine = root.querySelector('.dashboard-trend-line');
      const trendArea = root.querySelector('.dashboard-trend-area');
      const trendPoints = root.querySelectorAll('.dashboard-trend-point');
      const targets = [trendLine, trendArea, ...trendPoints].filter(Boolean);

      gsap.killTweensOf(targets);
      if (trendLine) {
        const length = trendLine.getTotalLength();
        gsap.fromTo(
          trendLine,
          { strokeDasharray: length, strokeDashoffset: length },
          {
            strokeDashoffset: 0,
            duration: 0.82,
            ease: 'power2.inOut',
            onComplete: () => gsap.set(trendLine, { clearProps: 'strokeDasharray,strokeDashoffset' })
          }
        );
      }
      if (trendArea) gsap.fromTo(trendArea, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.42, delay: 0.34 });
      if (trendPoints.length) gsap.fromTo(trendPoints, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, transformOrigin: 'center', duration: 0.32, stagger: 0.035, ease: 'back.out(1.7)', delay: 0.38 });
    }, root);

    return () => context.revert();
  }, [chartPath, chartPeriod, dashboardReady]);

  const kpis = [
    { title: 'Total de Leads', value: totalChats, trend: totalLeadsTrend, isPositive: isTotalLeadsTrendPositive, icon: MessageCircle, tone: 'blue' },
    { title: 'Novos Leads', value: newLeads, trend: newLeadsTrend, isPositive: isNewLeadsTrendPositive, icon: UserPlus, tone: 'mint' },
    { title: 'Tem Interesse', value: proposalLeads, trend: proposalTrend, isPositive: isProposalTrendPositive, icon: Briefcase, tone: 'cyan' },
    { title: 'Receita Ganha', value: currencyFormatter.format(wonLeadsTotal), trend: revenueTrend, isPositive: isRevenueTrendPositive, icon: BadgeDollarSign, tone: 'lime' }
  ];

  const handleStartChat = (contactId) => {
    setActiveContactId(contactId);
    setActiveScreen('chat');
  };

  if (!dashboardReady) {
    return (
      <main ref={dashboardRef} className="content-wrapper commercial-dashboard dashboard-loading-shell" aria-busy="true" aria-live="polite">
        <div className="dashboard-ambient-blob dashboard-ambient-blob--blue" aria-hidden="true" />
        <div className="dashboard-ambient-blob dashboard-ambient-blob--mint" aria-hidden="true" />
        <div className="dashboard-data-loader">
          <span className="dashboard-data-loader-mark" aria-hidden="true"><i /><i /><i /></span>
          <strong>Preparando seu painel</strong>
          <span>Sincronizando indicadores e atividades…</span>
        </div>
      </main>
    );
  }

  return (
    <main ref={dashboardRef} className="content-wrapper commercial-dashboard">
      <div className="dashboard-cursor-glow" aria-hidden="true" />
      <div className="dashboard-ambient-blob dashboard-ambient-blob--blue" aria-hidden="true" />
      <div className="dashboard-ambient-blob dashboard-ambient-blob--mint" aria-hidden="true" />
      <header className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-overline"><i />Visão em tempo real</span>
          <h1>Seu comercial, mais inteligente.</h1>
          <p>Painel Comercial · Interações e funil de vendas em tempo real.</p>
        </div>

        <div className="dashboard-hero-actions">
          <section className="dashboard-bot-control" aria-label="Controle de automação">
            <div className="dashboard-bot-control-icon"><Bot size={17} aria-hidden="true" /></div>
            <div><strong>Automação Bot</strong><span>{isBotEnabled ? 'Ativa e acompanhando conversas' : 'Pausada para novas conversas'}</span></div>
            <button type="button" className={`dashboard-switch ${isBotEnabled ? 'is-active' : ''}`} role="switch" aria-checked={isBotEnabled} aria-label={isBotEnabled ? 'Desativar automação Bot' : 'Ativar automação Bot'} onClick={() => setIsBotEnabled((previous) => !previous)}><span /></button>
          </section>
        </div>
      </header>

      <section className="dashboard-stage">
        <div className="dashboard-main-column">
          <section className="dashboard-kpi-grid" aria-label="Indicadores comerciais">
            {kpis.slice(0, 3).map((kpi, index) => {
              const Icon = kpi.icon;
              return <article key={kpi.title} className={`dashboard-kpi-card dashboard-kpi-card--${kpi.tone}`} style={{ '--stagger-index': index }}>
                <div className="dashboard-kpi-topline"><span>{kpi.title}</span><span className="dashboard-kpi-icon"><Icon size={18} strokeWidth={2} aria-hidden="true" /></span></div>
                <strong className="dashboard-kpi-value">{kpi.value}</strong>
                <span className={`dashboard-kpi-trend ${kpi.isPositive ? 'is-positive' : 'is-negative'}`}>{kpi.isPositive ? <TrendingUp size={13} aria-hidden="true" /> : <TrendingDown size={13} aria-hidden="true" />}{kpi.trend}</span>
              </article>;
            })}
          </section>

          <article className="dashboard-card dashboard-primary-card dashboard-trend-card">
            <div className="dashboard-card-heading">
              <div><span className="dashboard-card-kicker">Performance</span><h2>Ritmo de Conversão</h2><p>Novos contatos que chegaram no período selecionado.</p></div>
              <div className="dashboard-period-tabs" aria-label="Período do gráfico">
                {[7, 30, 90].map((period) => <button type="button" key={period} className={chartPeriod === period ? 'is-active' : ''} aria-pressed={chartPeriod === period} onClick={() => { setChartPeriod(period); setActiveChartIndex(null); }}>{period}D</button>)}
              </div>
            </div>
            <div className="dashboard-chart-area" aria-label={`Novos contatos nos últimos ${chartPeriod} dias`}>
              <div className="dashboard-chart-grid" aria-hidden="true"><i /><i /><i /><i /></div>
              <svg className="dashboard-chart-svg" viewBox="0 0 700 210" preserveAspectRatio="none" role="img" aria-label={`Pico de ${peakPoint.value} novos contatos no período`}>
                <defs>
                  <linearGradient id="dashboardAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#37c8d9" stopOpacity=".34" /><stop offset="1" stopColor="#37c8d9" stopOpacity="0" /></linearGradient>
                  <linearGradient id="dashboardLineGradient" x1="0" x2="1"><stop stopColor="#20b6df" /><stop offset="1" stopColor="#50dcae" /></linearGradient>
                </defs>
                <path className="dashboard-trend-area" d={chartAreaPath} fill="url(#dashboardAreaGradient)" />
                <path className="dashboard-trend-line" d={chartPath} fill="none" stroke="url(#dashboardLineGradient)" strokeWidth="4" strokeLinecap="round" />
                {chartPoints.map((point, index) => <circle key={`${point.label}-${point.x}`} className={`dashboard-trend-point ${activeChartIndex === index ? 'is-active' : ''}`} cx={point.x} cy={point.y} r={point === peakPoint ? 6 : 3.5} fill="var(--dashboard-card-solid)" stroke={point === peakPoint ? '#4bd9ab' : '#2bbbe9'} strokeWidth={point === peakPoint ? 4 : 2.5} />)}
              </svg>
              {activeChartIndex !== null && <span className="dashboard-chart-focus-line" aria-hidden="true" style={{ left: `${(chartPoints[activeChartIndex].x / 700) * 100}%`, top: `${(chartPoints[activeChartIndex].y / 210) * 100}%` }} />}
              <div className="dashboard-chart-interactions">
                {chartPoints.map((point, index) => {
                  const isActive = activeChartIndex === index;
                  const deltaLabel = point.delta === null
                    ? 'Primeiro período da análise'
                    : `${point.delta >= 0 ? '+' : ''}${point.delta} em relação ao período anterior`;
                  return (
                    <button
                      type="button"
                      key={`chart-detail-${point.label}-${index}`}
                      className={`dashboard-chart-hit-target ${isActive ? 'is-active' : ''} ${index === 0 ? 'is-edge-start' : ''} ${index === chartPoints.length - 1 ? 'is-edge-end' : ''} ${point.y < 74 ? 'is-tooltip-below' : ''}`}
                      style={{ left: `${(point.x / 700) * 100}%`, top: `${(point.y / 210) * 100}%` }}
                      aria-label={`${point.periodLabel}: ${point.value} novos leads, ${deltaLabel}`}
                      onPointerEnter={() => setActiveChartIndex(index)}
                      onPointerLeave={() => setActiveChartIndex(null)}
                      onFocus={() => setActiveChartIndex(index)}
                      onBlur={() => setActiveChartIndex(null)}
                      onClick={() => setActiveChartIndex((current) => current === index ? null : index)}
                    >
                      <span className="dashboard-chart-hit-dot" aria-hidden="true" />
                      {isActive && <span className="dashboard-chart-tooltip" role="tooltip"><small>{point.periodLabel}</small><strong>{point.value} {point.value === 1 ? 'novo lead' : 'novos leads'}</strong><span>{point.share.toFixed(1).replace('.', ',')}% do período</span><em className={point.delta !== null && point.delta < 0 ? 'is-negative' : ''}>{deltaLabel}</em></span>}
                    </button>
                  );
                })}
              </div>
              <div className="dashboard-chart-labels">{chartSeries.map((item, index) => <span key={`${item.label}-${index}`}>{item.label}</span>)}</div>
            </div>
          </article>

          <article className="dashboard-card dashboard-activity-card">
            <div className="dashboard-card-heading"><div><span className="dashboard-card-kicker">Ao vivo</span><h2>Movimentos Recentes</h2><p>Acompanhamento instantâneo do atendimento e das automações.</p></div><span className="dashboard-live-chip"><i />Atualizado agora</span></div>
            <div className="dashboard-activity-list" aria-live="polite">
              {loadingActivities && <div className="dashboard-empty-state">Carregando atividades…</div>}
              {!loadingActivities && activities.length === 0 && <div className="dashboard-empty-state">Nenhuma atividade registrada.</div>}
              {!loadingActivities && activities.slice(0, 6).map((activity, index) => {
                const visual = ACTIVITY_VISUAL[activity.type] || { icon: MessageCircle, className: 'default' };
                const Icon = visual.icon;
                return <article key={activity.id} className="dashboard-activity-item" style={{ '--activity-index': index }}><span className={`dashboard-activity-icon ${visual.className}`}><Icon size={15} strokeWidth={2.2} aria-hidden="true" /></span><div><strong>{activity.title}</strong><p>{activity.meta}</p></div><time dateTime={activity.timestamp}>{activity.time}</time></article>;
              })}
            </div>
          </article>
        </div>

        <aside className="dashboard-side-column" aria-label="Resumo comercial">
          <article className="dashboard-card dashboard-side-card dashboard-revenue-card">
            <div className="dashboard-revenue-top"><span className="dashboard-card-kicker">Receita ganha</span><span>{wonCount} {wonCount === 1 ? 'venda' : 'vendas'}</span></div>
            <strong>{currencyFormatter.format(wonLeadsTotal)}</strong>
            <p>{kpis[3].trend}</p>
            <div className="dashboard-progress"><i style={{ width: `${Math.min(conversionRate, 100)}%` }} /></div>
            <div className="dashboard-progress-foot"><span>Conversão da base</span><b>{conversionRate.toFixed(1).replace('.', ',')}%</b></div>
          </article>

          <article className="dashboard-card dashboard-side-card dashboard-compact-funnel">
            <div className="dashboard-card-heading"><div><span className="dashboard-card-kicker">Agora</span><h2>Funil Comercial</h2><p>Distribuição por etapa.</p></div></div>
            <div className="dashboard-funnel-list">
              {[{ label: 'Novos leads', description: 'Entrada recente', value: newLeads, tone: 'mint' }, { label: 'Em atendimento', description: 'Time e IA', value: proposalLeads, tone: 'cyan' }, { label: 'Fechamentos', description: 'Vendas ganhas', value: wonCount, tone: 'lime' }].map((stage) => <div className={`dashboard-funnel-row dashboard-funnel-row--${stage.tone}`} key={stage.label}><i /><div><strong>{stage.label}</strong><span>{stage.description}</span></div><b>{stage.value}</b></div>)}
            </div>
          </article>

          <article className="dashboard-card dashboard-side-card dashboard-ai-insight">
            <span className="dashboard-card-kicker">Prioridade inteligente</span>
            <h2>{unreadContacts.length > 0 ? `${unreadContacts.length} conversas merecem atenção.` : 'Seu atendimento está em dia.'}</h2>
            <p>{unreadContacts.length > 0 ? 'Há clientes aguardando leitura. Responder agora reduz o risco de perder oportunidades.' : 'Nenhuma conversa está aguardando leitura neste momento.'}</p>
            <div className="dashboard-ai-metrics" aria-label="Resumo das prioridades">
              <span><b>{unreadContacts.length}</b> aguardando resposta</span>
              <span><b>{proposalLeads}</b> em negociação</span>
            </div>
            <button type="button" onClick={() => setActiveScreen('chat')}>{unreadContacts.length > 0 ? 'Ver Pendências' : 'Abrir Chat Ao Vivo'} <ChevronRight size={14} aria-hidden="true" /></button>
          </article>
        </aside>
      </section>

      <section className="dashboard-footer-grid">
        <article className="dashboard-card dashboard-footer-card dashboard-proposals-card">
          <div className="dashboard-card-heading dashboard-card-heading--compact"><div><span className="dashboard-card-kicker">Negociações</span><h2><Briefcase size={18} aria-hidden="true" />Tem Interesse</h2><p>Leads quentes na fase decisiva do funil.</p></div><span className="dashboard-count-pill">{proposalContacts.length} ativos</span></div>
          <div className="dashboard-table-scroll"><table className="dashboard-proposals-table"><thead><tr><th>Lead</th><th>Canal</th><th>Valor</th><th><span className="sr-only">Ação</span></th></tr></thead><tbody>
            {proposalContacts.map((contact) => <tr key={contact.id}><td><span className="dashboard-contact-avatar" style={{ background: contact.avatarColor }}>{getInitials(contact.name)}</span><strong>{contact.name}</strong></td><td><span className={`dashboard-channel-mark ${contact.channel}`} aria-label={`Canal ${contact.channel}`}>{contact.channel === 'whatsapp' ? 'W' : contact.channel === 'telegram' ? 'I' : 'T'}</span></td><td>{contact.value > 0 ? currencyFormatter.format(contact.value) : 'R$ —'}</td><td><button type="button" onClick={() => handleStartChat(contact.id)}>Negociar <ChevronRight size={14} aria-hidden="true" /></button></td></tr>)}
            {proposalContacts.length === 0 && <tr><td className="dashboard-table-empty" colSpan="4">Nenhum lead na fase de Tem Interesse no momento.</td></tr>}
          </tbody></table></div>
        </article>

        <article className="dashboard-card dashboard-footer-card dashboard-pending-card">
          <div className="dashboard-card-heading dashboard-card-heading--compact"><div><span className="dashboard-card-kicker">Prioridade</span><h2><MessagesSquare size={18} aria-hidden="true" />Respostas Pendentes</h2><p>Clientes aguardando atendimento humano.</p></div></div>
          <div className="dashboard-pending-list">
            {unreadContacts.slice(0, 3).map((contact) => <button type="button" key={contact.id} className="dashboard-pending-item" onClick={() => handleStartChat(contact.id)}><span className="dashboard-contact-avatar" style={{ background: contact.avatarColor }}>{getInitials(contact.name)}</span><span className="dashboard-pending-copy"><strong>{contact.name}</strong><small>{contact.messages[contact.messages.length - 1]?.text || 'Nova mensagem aguardando leitura'}</small></span><span className="dashboard-pending-action">Responder <ChevronRight size={14} aria-hidden="true" /></span></button>)}
            {unreadContacts.length === 0 && <div className="dashboard-empty-state dashboard-empty-state--pending"><CheckCircle2 size={22} aria-hidden="true" /><span>Nenhuma mensagem pendente.</span></div>}
          </div>
        </article>
      </section>
    </main>
  );
}
