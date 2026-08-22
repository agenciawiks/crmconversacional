import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useCrm } from '../context/CrmContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FilterX,
  GripVertical,
  KanbanSquare,
  Layers3,
  MessageSquare,
  MoveRight,
  Search,
  Sparkles,
  Tag,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import TagBadge from './TagBadge';
import PipelineAnalytics from './PipelineAnalytics';

const PIPELINE_COLUMNS = [
  { id: 'new', title: 'Novos Leads', class: 'new', accent: '#32d9aa', short: 'NL' },
  { id: 'no_answer', title: 'Sem Resposta', class: 'no-answer', accent: '#ff9d4d', short: 'SR' },
  { id: 'contacted', title: 'Em Contato', class: 'contacted', accent: '#36bff3', short: 'EC' },
  { id: 'proposal', title: 'Tem Interesse', class: 'proposal', accent: '#c7f36b', short: 'TI' },
  { id: 'won', title: 'Vendas Ganhas', class: 'won', accent: '#37d98f', short: 'VG' },
  { id: 'lost', title: 'Perdidos', class: 'lost', accent: '#ff6b78', short: 'PD' },
];

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todo o período' },
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: '7days', label: 'Últimos 7 dias' },
  { value: 'custom', label: 'Personalizado' },
];

const CHANNEL_OPTIONS = [
  { value: 'all', label: 'Todos os canais' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Instagram' },
  { value: 'webchat', label: 'TikTok' },
];

const STAGE_OPTIONS = [
  { value: 'all', label: 'Todas as etapas' },
  ...PIPELINE_COLUMNS.map((column) => ({ value: column.id, label: column.title })),
];

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

function PipelineSelect({ id, label, icon: Icon, value, options, isOpen, onToggle, onChange, compact = false }) {
  const menuRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return undefined;
    const tween = gsap.fromTo(
      menuRef.current,
      { autoAlpha: 0, y: -8, scale: 0.96 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.7)', transformOrigin: 'top center' },
    );
    return () => tween.kill();
  }, [isOpen]);

  return (
    <div className={`pipeline-filter-select ${compact ? 'is-compact' : ''} ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="pipeline-filter-trigger pipeline-animated-action"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-options`}
      >
        {Icon && <span className="pipeline-filter-trigger-icon"><Icon size={15} aria-hidden="true" /></span>}
        <span className="pipeline-filter-trigger-copy"><small>{label}</small><strong>{selectedOption.label}</strong></span>
        <ChevronDown className="pipeline-filter-chevron" size={15} aria-hidden="true" />
      </button>
      {isOpen && (
        <div ref={menuRef} id={`${id}-options`} className="pipeline-filter-drawer" role="listbox" aria-label={label}>
          <div className="pipeline-filter-drawer-heading"><span>{label}</span><small>{options.length} opções</small></div>
          <div className="pipeline-filter-options">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={option.value === value ? 'is-selected' : ''}
                onClick={() => {
                  onChange(option.value);
                  onToggle(false);
                }}
              >
                <span>{option.label}</span>
                {option.value === value && <Check size={14} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function KanbanBoard() {
  const rootRef = useRef(null);
  const filtersRef = useRef(null);
  const previousViewRef = useRef('board');
  const { 
    contacts, 
    initialDataLoaded,
    changeContactStatus, 
    bulkChangeContactStatus,
    setActiveContactId, 
    setActiveScreen, 
    globalTags,
    dateFilter,
    setDateFilter,
    customDateRange,
    setCustomDateRange,
    getFilteredContacts
  } = useCrm();
  const dateFilteredContacts = getFilteredContacts();
  const [activeDropCol, setActiveDropCol] = useState(null);
  const [draggingContactId, setDraggingContactId] = useState(null);
  const [viewMode, setViewMode] = useState('board');
  const [hoveredSegmentIdx, setHoveredSegmentIdx] = useState(null);
  const [hoveredFunnelStage, setHoveredFunnelStage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [openFilter, setOpenFilter] = useState(null);
  const [moveMenuContactId, setMoveMenuContactId] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [bulkStage, setBulkStage] = useState('contacted');
  const [bulkActionPending, setBulkActionPending] = useState(false);
  const [bulkNotice, setBulkNotice] = useState('');

  const tagOptions = useMemo(() => {
    const names = new Set((globalTags || []).map((tag) => tag.name).filter(Boolean));
    (contacts || []).forEach((contact) => (contact.tags || []).forEach((tag) => names.add(tag)));
    return [
      { value: 'all', label: 'Todas as etiquetas' },
      ...[...names].sort((first, second) => first.localeCompare(second, 'pt-BR')).map((name) => ({ value: name, label: name })),
    ];
  }, [contacts, globalTags]);

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('pt-BR');
  const filteredContacts = dateFilteredContacts.filter((contact) => {
    const matchesSearch = !normalizedSearch || [contact.name, contact.phone, contact.email, ...(contact.tags || [])]
      .some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(normalizedSearch));
    const matchesStage = stageFilter === 'all' || contact.status === stageFilter;
    const matchesChannel = channelFilter === 'all' || contact.channel === channelFilter;
    const matchesTag = tagFilter === 'all' || (contact.tags || []).includes(tagFilter);
    return matchesSearch && matchesStage && matchesChannel && matchesTag;
  });

  const visibleColumns = stageFilter === 'all'
    ? PIPELINE_COLUMNS
    : PIPELINE_COLUMNS.filter((column) => column.id === stageFilter);
  const selectedIds = useMemo(() => new Set(selectedContactIds.map(String)), [selectedContactIds]);
  const activeFilterCount = [stageFilter, channelFilter, tagFilter].filter((value) => value !== 'all').length
    + (dateFilter !== 'all' ? 1 : 0)
    + (normalizedSearch ? 1 : 0);
  const totalPipelineValue = filteredContacts
    .filter((contact) => !['lost', 'won'].includes(contact.status))
    .reduce((sum, contact) => sum + (Number(contact.value) || 0), 0);
  const wonRevenue = filteredContacts
    .filter((contact) => contact.status === 'won')
    .reduce((sum, contact) => sum + (Number(contact.value) || 0), 0);
  const wonCount = filteredContacts.filter((contact) => contact.status === 'won').length;
  const conversionRate = filteredContacts.length > 0 ? Math.round((wonCount / filteredContacts.length) * 100) : 0;

  // Drag Handlers
  const handleDragStart = (e, contactId) => {
    e.dataTransfer.setData('text/plain', contactId.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDraggingContactId(String(contactId));
  };

  const handleDragEnd = () => {
    setDraggingContactId(null);
    setActiveDropCol(null);
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
      setBulkNotice(`Contato movido para ${PIPELINE_COLUMNS.find((column) => column.id === statusId)?.title || 'a nova etapa'}.`);
    }
    setDraggingContactId(null);
  };

  const handleOpenChat = (contactId) => {
    setActiveContactId(contactId);
    setActiveScreen('chat');
  };

  const handleMoveContact = async (contactId, statusId) => {
    setMoveMenuContactId(null);
    await changeContactStatus(contactId, statusId);
    setBulkNotice(`Contato movido para ${PIPELINE_COLUMNS.find((column) => column.id === statusId)?.title || 'a nova etapa'}.`);
  };

  const toggleContactSelection = (contactId) => {
    const normalizedId = String(contactId);
    setSelectedContactIds((current) => current.includes(normalizedId)
      ? current.filter((id) => id !== normalizedId)
      : [...current, normalizedId]);
  };

  const toggleAllVisibleContacts = () => {
    const visibleIds = filteredContacts.map((contact) => String(contact.id));
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    setSelectedContactIds(allSelected ? [] : visibleIds);
  };

  const closeSelectionMode = () => {
    setSelectionMode(false);
    setSelectedContactIds([]);
    setBulkNotice('');
  };

  const handleBulkMove = async () => {
    if (selectedContactIds.length === 0 || bulkActionPending) return;
    setBulkActionPending(true);
    setBulkNotice('');
    try {
      const result = await bulkChangeContactStatus(selectedContactIds, bulkStage);
      const stageLabel = PIPELINE_COLUMNS.find((column) => column.id === bulkStage)?.title || 'nova etapa';
      setBulkNotice(`${result.count} ${result.count === 1 ? 'contato movido' : 'contatos movidos'} para ${stageLabel}.${result.warning ? ` ${result.warning}` : ''}`);
      setSelectedContactIds([]);
    } catch (error) {
      console.error('[Kanban] Não foi possível mover os contatos selecionados:', error);
      setBulkNotice('Não foi possível mover os contatos. Tente novamente.');
    } finally {
      setBulkActionPending(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStageFilter('all');
    setChannelFilter('all');
    setTagFilter('all');
    setDateFilter('all');
    setOpenFilter(null);
  };

  useEffect(() => {
    if (!openFilter && !moveMenuContactId) return undefined;
    const handlePointerDown = (event) => {
      if (filtersRef.current?.contains(event.target)) return;
      if (event.target.closest('.pipeline-card-move-wrap')) return;
      setOpenFilter(null);
      setMoveMenuContactId(null);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpenFilter(null);
        setMoveMenuContactId(null);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [moveMenuContactId, openFilter]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !initialDataLoaded) return undefined;
    const context = gsap.context(() => {
      const header = root.querySelector('.pipeline-page-header');
      const metrics = gsap.utils.toArray('.pipeline-metric-card');
      const controls = root.querySelector('.pipeline-controls');
      const columns = gsap.utils.toArray('.kanban-column');
      const cards = gsap.utils.toArray('.kanban-card').slice(0, 20);
      const entranceTargets = [header, ...metrics, controls, ...columns, ...cards].filter(Boolean);

      gsap.killTweensOf(entranceTargets);
      gsap.set(entranceTargets, { willChange: 'transform,opacity' });
      const timeline = gsap.timeline({
        delay: 0.06,
        defaults: { ease: 'power3.out' },
        onComplete: () => gsap.set(entranceTargets, { clearProps: 'transform,opacity,visibility,willChange' }),
      });
      timeline
        .fromTo(header, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, duration: 0.56 }, 0)
        .fromTo(metrics, { autoAlpha: 0, y: 28, scale: 0.93 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.54, stagger: 0.085 }, 0.16)
        .fromTo(controls, { autoAlpha: 0, y: 24, scale: 0.975 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5 }, 0.38)
        .fromTo(columns, { autoAlpha: 0, x: 30, scale: 0.97 }, { autoAlpha: 1, x: 0, scale: 1, duration: 0.55, stagger: 0.065 }, 0.52)
        .fromTo(cards, { autoAlpha: 0, y: 18, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.36, stagger: 0.025 }, 0.7);

      gsap.to('.pipeline-ambient-ring', { rotation: 360, duration: 26, repeat: -1, ease: 'none', transformOrigin: 'center' });
      gsap.to('.pipeline-metric-icon', { y: -3, rotation: (index) => index % 2 ? 4 : -4, duration: 1.8, repeat: -1, yoyo: true, stagger: 0.18, ease: 'sine.inOut' });
    }, root);
    return () => context.revert();
  }, [initialDataLoaded]);

  useLayoutEffect(() => {
    if (!initialDataLoaded || previousViewRef.current === viewMode) return undefined;
    previousViewRef.current = viewMode;
    const root = rootRef.current;
    if (!root) return undefined;
    const target = viewMode === 'board' ? root.querySelector('.kanban-board-container') : root.querySelector('.pipeline-analytics-grid');
    if (!target) return undefined;
    const tween = gsap.fromTo(target, { autoAlpha: 0, y: 18, scale: 0.992 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.46, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
    return () => tween.kill();
  }, [initialDataLoaded, viewMode]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !initialDataLoaded) return undefined;
    const counters = [...root.querySelectorAll('[data-pipeline-kpi]')];
    const tweens = counters.map((element) => {
      const target = Number(element.dataset.pipelineKpi) || 0;
      const format = element.dataset.kpiFormat || 'number';
      const counter = { value: 0 };
      const render = () => {
        const value = Math.round(counter.value);
        element.textContent = format === 'currency' ? currencyFormatter.format(value) : format === 'percent' ? `${value}%` : value.toLocaleString('pt-BR');
      };
      render();
      return gsap.to(counter, { value: target, duration: 1.08, delay: 0.78, ease: 'power3.out', onUpdate: render, onComplete: render });
    });
    return () => tweens.forEach((tween) => tween.kill());
  }, [conversionRate, filteredContacts.length, initialDataLoaded, totalPipelineValue, wonRevenue]);

  useEffect(() => {
    const root = rootRef.current;
    const glow = root?.querySelector('.pipeline-cursor-glow');
    if (!root || !glow) return undefined;
    gsap.set(glow, { xPercent: -50, yPercent: -50 });
    const moveX = gsap.quickTo(glow, 'x', { duration: 0.55, ease: 'power3.out' });
    const moveY = gsap.quickTo(glow, 'y', { duration: 0.55, ease: 'power3.out' });
    const handlePointerMove = (event) => { moveX(event.clientX); moveY(event.clientY); };
    root.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => root.removeEventListener('pointermove', handlePointerMove);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !initialDataLoaded) return undefined;
    const cleanups = [];
    const buttons = [...root.querySelectorAll('.pipeline-animated-action, .kanban-card-action-btn')];
    buttons.forEach((button) => {
      const enter = () => gsap.to(button, { y: -3, scale: 1.04, duration: 0.24, ease: 'back.out(2)', overwrite: 'auto' });
      const leave = () => gsap.to(button, { y: 0, scale: 1, duration: 0.28, ease: 'power3.out', overwrite: 'auto' });
      const down = () => gsap.to(button, { y: 0, scale: 0.94, duration: 0.12, ease: 'power2.out', overwrite: 'auto' });
      button.addEventListener('pointerenter', enter);
      button.addEventListener('pointerleave', leave);
      button.addEventListener('pointerdown', down);
      cleanups.push(() => {
        button.removeEventListener('pointerenter', enter);
        button.removeEventListener('pointerleave', leave);
        button.removeEventListener('pointerdown', down);
      });
    });
    const metricCards = window.matchMedia('(pointer: fine)').matches
      ? [...root.querySelectorAll('.pipeline-metric-card')]
      : [];
    metricCards.forEach((card) => {
      let bounds = null;
      const rotateX = gsap.quickTo(card, 'rotationX', { duration: 0.35, ease: 'power3.out' });
      const rotateY = gsap.quickTo(card, 'rotationY', { duration: 0.35, ease: 'power3.out' });
      const moveY = gsap.quickTo(card, 'y', { duration: 0.32, ease: 'power3.out' });
      const enter = () => { bounds = card.getBoundingClientRect(); moveY(-6); };
      const move = (event) => {
        if (!bounds) return;
        const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
        const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
        rotateY(horizontal * 7);
        rotateX(vertical * -6);
      };
      const leave = () => { bounds = null; rotateX(0); rotateY(0); moveY(0); };
      card.addEventListener('pointerenter', enter);
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerleave', leave);
      cleanups.push(() => {
        card.removeEventListener('pointerenter', enter);
        card.removeEventListener('pointermove', move);
        card.removeEventListener('pointerleave', leave);
      });
    });
    return () => {
      cleanups.forEach((cleanup) => cleanup());
      gsap.killTweensOf([...buttons, ...metricCards]);
    };
  }, [filteredContacts.length, initialDataLoaded, selectionMode, viewMode]);

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
                        transition: 'opacity 0.3s ease, filter 0.3s ease, stroke-width 0.3s ease',
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
                        transition: 'opacity 0.3s ease',
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
                    transition: 'color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
                    transition: 'box-shadow 0.2s ease'
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
                            transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
                                transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
                            transition: 'opacity 0.3s ease, filter 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
                            transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
                    transition: 'color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
                    transition: 'box-shadow 0.2s ease'
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
                  transition: 'stroke-dashoffset 1s ease, filter 1s ease'
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
    <div ref={rootRef} className={`content-wrapper pipeline-page ${initialDataLoaded ? 'is-ready' : 'is-loading'}`} aria-busy={!initialDataLoaded}>
      <div className="pipeline-cursor-glow" aria-hidden="true" />
      <div className="pipeline-ambient-ring pipeline-ambient-ring--one" aria-hidden="true" />
      <div className="pipeline-ambient-ring pipeline-ambient-ring--two" aria-hidden="true" />
      {!initialDataLoaded && (
        <div className="pipeline-loading-overlay" role="status" aria-live="polite">
          <span className="pipeline-loading-mark"><Sparkles size={19} aria-hidden="true" /></span>
          <strong>Preparando seu funil…</strong>
          <small>Organizando etapas, KPIs e oportunidades.</small>
          <span className="pipeline-loading-bars" aria-hidden="true"><i /><i /><i /></span>
        </div>
      )}

      <header className="pipeline-page-header">
        <div>
          <span className="pipeline-overline"><Sparkles size={13} aria-hidden="true" /> Pipeline inteligente</span>
          <h1>Funil Comercial</h1>
          <p>Acompanhe oportunidades, mova negociações e mantenha o time no ritmo certo.</p>
        </div>
        <div className="pipeline-view-switch" aria-label="Visualização do funil">
          <button type="button" className={`pipeline-animated-action ${viewMode === 'board' ? 'is-active' : ''}`} onClick={() => setViewMode('board')} aria-pressed={viewMode === 'board'}>
            <KanbanSquare size={16} aria-hidden="true" /> Quadro
          </button>
          <button type="button" className={`pipeline-animated-action ${viewMode === 'charts' ? 'is-active' : ''}`} onClick={() => setViewMode('charts')} aria-pressed={viewMode === 'charts'}>
            <BarChart3 size={16} aria-hidden="true" /> Análises
          </button>
        </div>
      </header>

      <section className="pipeline-metrics" aria-label="Resumo do funil">
        <article className="pipeline-metric-card pipeline-metric-card--blue">
          <span><small>Leads no período</small><strong data-pipeline-kpi={filteredContacts.length}>{filteredContacts.length.toLocaleString('pt-BR')}</strong></span>
          <span className="pipeline-metric-icon"><Users size={20} aria-hidden="true" /></span>
          <p>{activeFilterCount ? 'Resultado dos filtros atuais' : 'Base completa do período'}</p>
        </article>
        <article className="pipeline-metric-card pipeline-metric-card--mint">
          <span><small>Em negociação</small><strong data-pipeline-kpi={totalPipelineValue} data-kpi-format="currency">{currencyFormatter.format(totalPipelineValue)}</strong></span>
          <span className="pipeline-metric-icon"><CircleDollarSign size={20} aria-hidden="true" /></span>
          <p>Valor nas etapas comerciais ativas</p>
        </article>
        <article className="pipeline-metric-card pipeline-metric-card--lime">
          <span><small>Receita ganha</small><strong data-pipeline-kpi={wonRevenue} data-kpi-format="currency">{currencyFormatter.format(wonRevenue)}</strong></span>
          <span className="pipeline-metric-icon"><CheckCircle2 size={20} aria-hidden="true" /></span>
          <p>{wonCount} {wonCount === 1 ? 'venda concluída' : 'vendas concluídas'}</p>
        </article>
        <article className="pipeline-metric-card pipeline-metric-card--cyan">
          <span><small>Conversão</small><strong data-pipeline-kpi={conversionRate} data-kpi-format="percent">{conversionRate}%</strong></span>
          <span className="pipeline-metric-icon"><TrendingUp size={20} aria-hidden="true" /></span>
          <p>Vendas ganhas sobre os leads filtrados</p>
        </article>
      </section>

      <section ref={filtersRef} className="pipeline-controls" aria-label="Filtros e ações do funil">
        <label className="pipeline-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar no funil</span>
          <input
            type="search"
            name="pipeline-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Busque por nome, telefone ou etiqueta…"
            autoComplete="off"
          />
          {searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="Limpar busca"><X size={15} aria-hidden="true" /></button>}
        </label>
        <div className="pipeline-filter-row">
          <PipelineSelect id="pipeline-period" label="Período" icon={CalendarDays} value={dateFilter} options={PERIOD_OPTIONS} isOpen={openFilter === 'period'} onToggle={(force) => setOpenFilter(force === false ? null : openFilter === 'period' ? null : 'period')} onChange={setDateFilter} />
          <PipelineSelect id="pipeline-stage" label="Etapa" icon={Layers3} value={stageFilter} options={STAGE_OPTIONS} isOpen={openFilter === 'stage'} onToggle={(force) => setOpenFilter(force === false ? null : openFilter === 'stage' ? null : 'stage')} onChange={setStageFilter} />
          <PipelineSelect id="pipeline-channel" label="Canal" icon={MessageSquare} value={channelFilter} options={CHANNEL_OPTIONS} isOpen={openFilter === 'channel'} onToggle={(force) => setOpenFilter(force === false ? null : openFilter === 'channel' ? null : 'channel')} onChange={setChannelFilter} />
          <PipelineSelect id="pipeline-tag" label="Etiqueta" icon={Tag} value={tagFilter} options={tagOptions} isOpen={openFilter === 'tag'} onToggle={(force) => setOpenFilter(force === false ? null : openFilter === 'tag' ? null : 'tag')} onChange={setTagFilter} />
        </div>
        <div className="pipeline-control-actions">
          {activeFilterCount > 0 && <button type="button" className="pipeline-clear-filters pipeline-animated-action" onClick={clearFilters}><FilterX size={15} aria-hidden="true" /> Limpar <span>{activeFilterCount}</span></button>}
          {viewMode === 'board' && (
            <button type="button" className={`pipeline-select-mode pipeline-animated-action ${selectionMode ? 'is-active' : ''}`} onClick={() => selectionMode ? closeSelectionMode() : setSelectionMode(true)} aria-pressed={selectionMode}>
              <Check size={15} aria-hidden="true" /> {selectionMode ? 'Sair da seleção' : 'Selecionar em massa'}
            </button>
          )}
        </div>
        {dateFilter === 'custom' && (
          <div className="pipeline-date-range">
            <label>Data inicial<input type="date" name="pipeline-start-date" value={customDateRange.start} onChange={(event) => setCustomDateRange({ ...customDateRange, start: event.target.value })} /></label>
            <span aria-hidden="true">até</span>
            <label>Data final<input type="date" name="pipeline-end-date" value={customDateRange.end} onChange={(event) => setCustomDateRange({ ...customDateRange, end: event.target.value })} /></label>
          </div>
        )}
      </section>

      {selectionMode && viewMode === 'board' && (
        <section className="pipeline-bulk-toolbar" aria-label="Atualização em massa">
          <div className="pipeline-bulk-summary">
            <button type="button" className="pipeline-bulk-check pipeline-animated-action" onClick={toggleAllVisibleContacts} aria-label={selectedContactIds.length === filteredContacts.length && filteredContacts.length > 0 ? 'Desmarcar todos os contatos visíveis' : 'Selecionar todos os contatos visíveis'}>
              <Check size={15} aria-hidden="true" />
            </button>
            <span><strong>{selectedContactIds.length}</strong> {selectedContactIds.length === 1 ? 'contato selecionado' : 'contatos selecionados'}</span>
            <small>{filteredContacts.length} visíveis</small>
          </div>
          <div className="pipeline-bulk-actions">
            <PipelineSelect id="pipeline-bulk-stage" label="Mover selecionados para" icon={MoveRight} value={bulkStage} options={STAGE_OPTIONS.slice(1)} isOpen={openFilter === 'bulk'} onToggle={(force) => setOpenFilter(force === false ? null : openFilter === 'bulk' ? null : 'bulk')} onChange={setBulkStage} compact />
            <button type="button" className="pipeline-bulk-move pipeline-animated-action" onClick={handleBulkMove} disabled={selectedContactIds.length === 0 || bulkActionPending}>
              {bulkActionPending ? 'Movendo…' : 'Mover contatos'} <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      <div className="pipeline-live-region" aria-live="polite">{bulkNotice}</div>

      {viewMode === 'board' ? (
        <section className={`kanban-board-container ${visibleColumns.length === 1 ? 'is-single-column' : ''}`} aria-label="Quadro do funil comercial">
          {visibleColumns.map((col) => {
            const colContacts = filteredContacts.filter((contact) => contact.status === col.id);
            const colSum = colContacts.reduce((sum, contact) => sum + (Number(contact.value) || 0), 0);
            const isDropTarget = activeDropCol === col.id;
            return (
              <article
                key={col.id}
                className={`kanban-column ${col.class} ${isDropTarget ? 'drag-over' : ''}`}
                style={{ '--stage-accent': col.accent }}
                onDragOver={(event) => handleDragOver(event, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(event) => handleDrop(event, col.id)}
              >
                <header className="kanban-column-header">
                  <span className="kanban-column-mark" aria-hidden="true">{col.short}</span>
                  <span className="kanban-column-heading"><strong>{col.title}</strong><small>{currencyFormatter.format(colSum)}</small></span>
                  <span className="kanban-count-pill">{colContacts.length}</span>
                </header>
                <div className="kanban-column-progress" aria-hidden="true"><i style={{ width: `${filteredContacts.length ? Math.max(8, (colContacts.length / filteredContacts.length) * 100) : 0}%` }} /></div>
                <div className="kanban-cards-stack">
                  {colContacts.map((contact) => {
                    const contactId = String(contact.id);
                    const isSelected = selectedIds.has(contactId);
                    const channelLabel = contact.channel === 'whatsapp' ? 'WhatsApp' : contact.channel === 'telegram' ? 'Instagram' : contact.channel === 'webchat' ? 'TikTok' : contact.channel || 'Canal';
                    return (
                      <article
                        key={contact.id}
                        className={`kanban-card ${isSelected ? 'is-selected' : ''} ${draggingContactId === contactId ? 'is-dragging' : ''}`}
                        draggable={!selectionMode}
                        onDragStart={(event) => handleDragStart(event, contact.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="kanban-card-topline">
                          {selectionMode ? (
                            <button type="button" className="kanban-card-selector" onClick={() => toggleContactSelection(contact.id)} aria-label={`${isSelected ? 'Desmarcar' : 'Selecionar'} ${contact.name || 'contato'}`} aria-pressed={isSelected}>
                              {isSelected && <Check size={13} aria-hidden="true" />}
                            </button>
                          ) : <GripVertical className="kanban-card-grip" size={16} aria-hidden="true" />}
                          <span className={`kanban-card-channel-icon ${contact.channel}`} title={`Canal: ${channelLabel}`} aria-label={`Canal: ${channelLabel}`}>
                            {contact.channel === 'whatsapp' ? 'W' : contact.channel === 'telegram' ? 'I' : contact.channel === 'webchat' ? 'T' : '•'}
                          </span>
                        </div>
                        <div className="kanban-card-header">
                          <span className="kanban-card-avatar" style={{ '--avatar-color': contact.avatarColor || col.accent }} aria-hidden="true">{(contact.name || 'SN').substring(0, 2).toUpperCase()}</span>
                          <span className="kanban-card-identity"><strong className="kanban-card-name">{contact.name || 'Contato sem nome'}</strong><small>{contact.phone || 'Telefone não informado'}</small></span>
                        </div>
                        <div className="kanban-card-tags">
                          {(contact.tags || []).slice(0, 3).map((tag) => {
                            const tagColor = globalTags?.find((item) => item.name.toLocaleLowerCase('pt-BR') === tag.toLocaleLowerCase('pt-BR'))?.color || '#9ca3af';
                            return <TagBadge key={tag} name={tag} color={tagColor} />;
                          })}
                          {(contact.tags || []).length > 3 && <span className="kanban-more-tags">+{contact.tags.length - 3}</span>}
                          {!(contact.tags || []).length && <span className="kanban-no-tags">Sem etiquetas</span>}
                        </div>
                        <div className="kanban-card-footer">
                          <span className="kanban-card-value"><small>Valor</small><strong>{currencyFormatter.format(Number(contact.value) || 0)}</strong></span>
                          <div className="kanban-card-actions">
                            <div className="pipeline-card-move-wrap">
                              <button type="button" className="kanban-card-action-btn kanban-card-move-btn" onClick={() => setMoveMenuContactId(moveMenuContactId === contactId ? null : contactId)} aria-haspopup="menu" aria-expanded={moveMenuContactId === contactId} aria-label={`Mover ${contact.name || 'contato'} para outra etapa`}>
                                <MoveRight size={14} aria-hidden="true" /> Mover
                              </button>
                              {moveMenuContactId === contactId && (
                                <div className="kanban-card-move-menu" role="menu" aria-label="Mover para etapa">
                                  {PIPELINE_COLUMNS.filter((stage) => stage.id !== contact.status).map((stage) => (
                                    <button key={stage.id} type="button" role="menuitem" onClick={() => handleMoveContact(contact.id, stage.id)}><i style={{ background: stage.accent }} aria-hidden="true" />{stage.title}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button type="button" onClick={() => handleOpenChat(contact.id)} className="kanban-card-action-btn kanban-chat-btn">
                              Chat <ArrowRight size={13} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {colContacts.length === 0 && (
                    <div className="kanban-empty-column-placeholder">
                      <span><MoveRight size={19} aria-hidden="true" /></span>
                      <strong>Nenhuma oportunidade</strong>
                      <small>Arraste um cartão para esta etapa ou altere seus filtros.</small>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : import.meta.env.VITE_PIPELINE_LEGACY_ANALYTICS === 'true' ? (
        <section className="pipeline-analytics-grid" aria-label="Análises legadas do funil">
          {RenderFunnelChart()}
          {RenderDonutChart()}
          {RenderChannelPerformance()}
          {RenderBotPerformance()}
        </section>
      ) : (
        <PipelineAnalytics contacts={filteredContacts} initialDataLoaded={initialDataLoaded} />
      )}
    </div>
  );
}
