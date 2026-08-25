import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import {
  Activity,
  AlertCircle,
  Bot,
  CalendarClock,
  Check,
  CircleSlash2,
  Clock3,
  Edit3,
  History,
  Layers3,
  MessageSquareText,
  Pause,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import FollowUpRuleModal from './FollowUpRuleModal';
import * as followUpService from '../services/followUpService';

const STATUS_META = {
  pending: { label: 'Pendente', className: 'is-pending' },
  sent: { label: 'Enviado', className: 'is-sent' },
  cancelled: { label: 'Cancelado', className: 'is-cancelled' },
  failed: { label: 'Falhou', className: 'is-failed' },
};

const TRIGGER_LABELS = {
  last_message_in: 'Última mensagem recebida',
  stage_entered: 'Entrada em uma etapa do funil',
  contact_created: 'Novo contato criado',
};

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const formatDateTime = (isoString) => {
  if (!isoString) return 'Data não informada';
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? 'Data inválida' : dateTimeFormatter.format(date);
};

const formatDelay = (delayHours) => {
  const parsedDelay = Number(delayHours) || 0;
  const hours = Math.floor(parsedDelay);
  const minutes = Math.round((parsedDelay - hours) * 60);
  return [hours > 0 ? `${hours}h` : '', minutes > 0 ? `${minutes}min` : ''].filter(Boolean).join(' e ') || '0min';
};

const getCancelReason = (reason) => ({
  replied_before_send: 'O contato respondeu antes do disparo',
  manual_cancel: 'Cancelado por um operador',
  rule_disabled: 'A regra foi desativada',
}[reason] || reason || 'Motivo não informado');

export default function FollowUpSettings() {
  const rootRef = useRef(null);
  const statusTimerRef = useRef(null);
  const firstEntranceFinished = useRef(false);
  const { channels = [] } = useCrm();
  const [activeTab, setActiveTab] = useState('rules');
  const [rules, setRules] = useState([]);
  const [queue, setQueue] = useState([]);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [companyName, setCompanyName] = useState('Minha Empresa');
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingSetting, setIsSavingSetting] = useState(false);
  const [isUpdatingGlobal, setIsUpdatingGlobal] = useState(false);
  const [busyRuleIds, setBusyRuleIds] = useState(() => new Set());
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [queueSearch, setQueueSearch] = useState('');
  const [queueStatus, setQueueStatus] = useState('all');
  const [confirmation, setConfirmation] = useState(null);

  const showStatus = useCallback((type, text) => {
    window.clearTimeout(statusTimerRef.current);
    setStatusMsg({ type, text });
    statusTimerRef.current = window.setTimeout(() => setStatusMsg({ type: '', text: '' }), 4200);
  }, []);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const [fetchedRules, fetchedQueue, fetchedSettings] = await Promise.all([
        followUpService.fetchRules(),
        followUpService.fetchQueue(),
        followUpService.fetchSettings(),
      ]);
      setRules(fetchedRules);
      setQueue(fetchedQueue);
      const globalSetting = fetchedSettings.find((setting) => setting.key === 'followup_global_enabled');
      const companySetting = fetchedSettings.find((setting) => setting.key === 'company_name');
      if (globalSetting) setGlobalEnabled(globalSetting.value === 'true');
      if (companySetting) setCompanyName(companySetting.value || 'Minha Empresa');
    } catch (error) {
      console.error('[FollowUpSettings] Error loading data:', error);
      showStatus('error', 'Não foi possível carregar o Follow-Up. Atualize a página e tente novamente.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showStatus]);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => loadData(), 0);
    return () => {
      window.clearTimeout(initialLoadTimer);
      window.clearTimeout(statusTimerRef.current);
    };
  }, [loadData]);

  const counts = useMemo(() => queue.reduce((summary, item) => {
    if (Object.hasOwn(summary, item.status)) summary[item.status] += 1;
    return summary;
  }, { pending: 0, sent: 0, cancelled: 0, failed: 0 }), [queue]);

  const activeRules = rules.filter((rule) => rule.is_active).length;
  const filteredQueue = useMemo(() => {
    const normalizedSearch = queueSearch.trim().toLocaleLowerCase('pt-BR');
    return queue.filter((item) => {
      const matchesStatus = queueStatus === 'all' || item.status === queueStatus;
      const searchable = [
        item.contacts?.name,
        item.contacts?.phone,
        item.channels?.name,
        rules.find((rule) => rule.id === item.rule_id)?.name,
      ].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
      return matchesStatus && (!normalizedSearch || searchable.includes(normalizedSearch));
    });
  }, [queue, queueSearch, queueStatus, rules]);

  const handleToggleGlobal = async () => {
    const nextValue = !globalEnabled;
    setIsUpdatingGlobal(true);
    setGlobalEnabled(nextValue);
    try {
      const updated = await followUpService.updateSetting('followup_global_enabled', String(nextValue));
      if (!updated) throw new Error('Setting update was not persisted');
      showStatus('success', `Follow-Up ${nextValue ? 'ativado' : 'pausado'} para este ambiente.`);
    } catch (error) {
      console.error('[FollowUpSettings] Global status update failed:', error);
      setGlobalEnabled(!nextValue);
      showStatus('error', 'Não foi possível alterar o status. Verifique a conexão e tente novamente.');
    } finally {
      setIsUpdatingGlobal(false);
    }
  };

  const handleToggleRuleActive = async (rule) => {
    setBusyRuleIds((current) => new Set(current).add(rule.id));
    try {
      const updated = await followUpService.updateRule(rule.id, { is_active: !rule.is_active });
      if (!updated) throw new Error('Rule update was not persisted');
      setRules((current) => current.map((item) => item.id === rule.id ? { ...item, is_active: !rule.is_active } : item));
      showStatus('success', `Regra ${!rule.is_active ? 'ativada' : 'pausada'} com sucesso.`);
    } catch (error) {
      console.error('[FollowUpSettings] Rule status update failed:', error);
      showStatus('error', 'Não foi possível alterar esta regra. Tente novamente.');
    } finally {
      setBusyRuleIds((current) => {
        const next = new Set(current);
        next.delete(rule.id);
        return next;
      });
    }
  };

  const executeConfirmation = async () => {
    const action = confirmation;
    if (!action) return;
    setConfirmation((current) => ({ ...current, busy: true }));
    try {
      if (action.type === 'delete-rule') {
        const success = await followUpService.deleteRule(action.id);
        if (!success) throw new Error('Rule deletion was not persisted');
        setRules((current) => current.filter((rule) => rule.id !== action.id));
        setQueue((current) => current.filter((item) => item.rule_id !== action.id));
        showStatus('success', 'Regra e disparos pendentes removidos.');
      } else {
        const updated = await followUpService.cancelQueueItem(action.id, 'manual_cancel');
        if (!updated) throw new Error('Queue cancellation was not persisted');
        setQueue((current) => current.map((item) => item.id === action.id
          ? { ...item, status: 'cancelled', cancel_reason: 'manual_cancel' }
          : item));
        showStatus('success', 'Disparo cancelado com sucesso.');
      }
      setConfirmation(null);
    } catch (error) {
      console.error('[FollowUpSettings] Destructive action failed:', error);
      setConfirmation((current) => current ? { ...current, busy: false } : null);
      showStatus('error', 'A alteração não foi concluída. Verifique a conexão e tente novamente.');
    }
  };

  const handleSaveSettings = async (event) => {
    event.preventDefault();
    setIsSavingSetting(true);
    try {
      const updated = await followUpService.updateSetting('company_name', companyName.trim());
      if (!updated) throw new Error('Company setting was not persisted');
      showStatus('success', 'Variáveis do sistema atualizadas.');
    } catch (error) {
      console.error('[FollowUpSettings] Settings update failed:', error);
      showStatus('error', 'Não foi possível salvar as variáveis. Tente novamente.');
    } finally {
      setIsSavingSetting(false);
    }
  };

  useEffect(() => {
    if (!confirmation) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !confirmation.busy) setConfirmation(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmation]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || isLoading) return undefined;
    const context = gsap.context(() => {
      const pageHeader = root.querySelector('.followup-page-header');
      const metricCards = [...root.querySelectorAll('.followup-metric-card')];
      const globalStatus = root.querySelector('.followup-global-status');
      const tabs = root.querySelector('.followup-tabs');
      const tabPanel = root.querySelector('.followup-tab-panel');
      const contentRows = [...root.querySelectorAll('.followup-rule-card, .followup-history-row')];
      const targets = [
        pageHeader,
        ...metricCards,
        globalStatus,
        tabs,
        tabPanel,
        ...contentRows,
      ].filter(Boolean);
      gsap.set(targets, { willChange: 'transform,opacity' });
      const timeline = gsap.timeline({
        delay: 0.06,
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          firstEntranceFinished.current = true;
          gsap.set(targets, { clearProps: 'transform,opacity,visibility,willChange' });
        },
      });
      if (pageHeader) timeline.fromTo(pageHeader, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.55 }, 0);
      if (metricCards.length) timeline.fromTo(metricCards, { autoAlpha: 0, y: 24, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.48, stagger: 0.075 }, 0.14);
      if (globalStatus) timeline.fromTo(globalStatus, { autoAlpha: 0, x: 24, scale: 0.97 }, { autoAlpha: 1, x: 0, scale: 1, duration: 0.48 }, 0.28);
      if (tabs) timeline.fromTo(tabs, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.42 }, 0.38);
      if (tabPanel) timeline.fromTo(tabPanel, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.5);
      if (contentRows.length) timeline.fromTo(contentRows, { autoAlpha: 0, y: 16, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, stagger: 0.045 }, 0.63);

      const ambientOrbit = root.querySelector('.followup-ambient-orbit');
      const metricIcons = [...root.querySelectorAll('.followup-metric-icon')];
      if (ambientOrbit) gsap.to(ambientOrbit, { rotation: 360, duration: 32, repeat: -1, ease: 'none', transformOrigin: 'center' });
      if (metricIcons.length) gsap.to(metricIcons, { y: -3, rotation: (index) => index % 2 ? 4 : -4, duration: 1.9, repeat: -1, yoyo: true, stagger: 0.14, ease: 'sine.inOut' });
    }, root);
    return () => context.revert();
  }, [isLoading]);

  useLayoutEffect(() => {
    const panel = rootRef.current?.querySelector('.followup-tab-panel');
    if (!panel || isLoading || !firstEntranceFinished.current) return undefined;
    const context = gsap.context(() => {
      gsap.fromTo(panel, { autoAlpha: 0, y: 16, scale: 0.995 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
      const panelItems = panel.querySelectorAll('.followup-rule-card, .followup-history-row, .followup-settings-card');
      if (panelItems.length) gsap.fromTo(panelItems, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.32, stagger: 0.045, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
    }, panel);
    return () => context.revert();
  }, [activeTab, isLoading]);

  useLayoutEffect(() => {
    if (!statusMsg.text) return undefined;
    const toast = rootRef.current?.querySelector('.followup-toast');
    if (!toast) return undefined;
    const tween = gsap.fromTo(toast, { autoAlpha: 0, x: 32, scale: 0.94 }, { autoAlpha: 1, x: 0, scale: 1, duration: 0.38, ease: 'back.out(1.6)' });
    return () => tween.kill();
  }, [statusMsg]);

  useLayoutEffect(() => {
    if (!confirmation?.type) return undefined;
    const backdrop = rootRef.current?.querySelector('.followup-confirm-backdrop');
    const dialog = backdrop?.querySelector('.followup-confirm-dialog');
    if (!backdrop || !dialog) return undefined;
    const context = gsap.context(() => {
      gsap.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power2.out' });
      gsap.fromTo(dialog, { autoAlpha: 0, y: 20, scale: 0.95 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.36, ease: 'back.out(1.55)' });
    }, backdrop);
    return () => context.revert();
  }, [confirmation?.type]);

  useLayoutEffect(() => {
    const statusCard = rootRef.current?.querySelector('.followup-global-status');
    if (!statusCard || isLoading || !firstEntranceFinished.current) return undefined;
    const tween = gsap.fromTo(statusCard, { scale: 0.985, y: 3 }, { scale: 1, y: 0, duration: 0.36, ease: 'back.out(1.7)', clearProps: 'transform' });
    return () => tween.kill();
  }, [globalEnabled, isLoading]);

  useEffect(() => {
    const root = rootRef.current;
    const glow = root?.querySelector('.followup-cursor-glow');
    if (!root || !glow) return undefined;
    gsap.set(glow, { xPercent: -50, yPercent: -50 });
    const moveX = gsap.quickTo(glow, 'x', { duration: 0.55, ease: 'power3.out' });
    const moveY = gsap.quickTo(glow, 'y', { duration: 0.55, ease: 'power3.out' });
    const move = (event) => { moveX(event.clientX); moveY(event.clientY); };
    root.addEventListener('pointermove', move, { passive: true });
    return () => root.removeEventListener('pointermove', move);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || isLoading) return undefined;
    const buttons = [...root.querySelectorAll('.followup-animated-action')];
    const cleanups = buttons.map((button) => {
      const enter = () => gsap.to(button, { y: -3, scale: 1.035, duration: 0.22, ease: 'back.out(2)', overwrite: 'auto' });
      const leave = () => gsap.to(button, { y: 0, scale: 1, duration: 0.26, ease: 'power3.out', overwrite: 'auto' });
      const down = () => gsap.to(button, { y: 0, scale: 0.95, duration: 0.11, ease: 'power2.out', overwrite: 'auto' });
      button.addEventListener('pointerenter', enter);
      button.addEventListener('pointerleave', leave);
      button.addEventListener('pointerdown', down);
      return () => {
        button.removeEventListener('pointerenter', enter);
        button.removeEventListener('pointerleave', leave);
        button.removeEventListener('pointerdown', down);
      };
    });
    return () => {
      cleanups.forEach((cleanup) => cleanup());
      gsap.killTweensOf(buttons);
    };
  }, [activeTab, filteredQueue.length, isLoading, rules.length]);

  useEffect(() => {
    const root = rootRef.current;
    const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!root || isLoading || !supportsHover) return undefined;
    const cards = [...root.querySelectorAll('.followup-metric-card')];
    const cleanups = cards.map((card) => {
      let bounds;
      const rotateX = gsap.quickTo(card, 'rotationX', { duration: 0.32, ease: 'power3.out' });
      const rotateY = gsap.quickTo(card, 'rotationY', { duration: 0.32, ease: 'power3.out' });
      const lift = gsap.quickTo(card, 'y', { duration: 0.28, ease: 'power3.out' });
      const enter = () => { bounds = card.getBoundingClientRect(); gsap.set(card, { transformPerspective: 850 }); lift(-5); };
      const move = (event) => {
        if (!bounds) return;
        rotateX((((event.clientY - bounds.top) / bounds.height) - 0.5) * -7);
        rotateY((((event.clientX - bounds.left) / bounds.width) - 0.5) * 8);
      };
      const leave = () => { bounds = undefined; rotateX(0); rotateY(0); lift(0); };
      card.addEventListener('pointerenter', enter);
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerleave', leave);
      return () => {
        card.removeEventListener('pointerenter', enter);
        card.removeEventListener('pointermove', move);
        card.removeEventListener('pointerleave', leave);
      };
    });
    return () => {
      cleanups.forEach((cleanup) => cleanup());
      gsap.killTweensOf(cards);
      gsap.set(cards, { clearProps: 'transform,transformPerspective' });
    };
  }, [isLoading]);

  useLayoutEffect(() => {
    if (isLoading) return undefined;
    const counters = [...(rootRef.current?.querySelectorAll('[data-followup-kpi]') || [])];
    const tweens = counters.map((element) => {
      const target = Number(element.dataset.followupKpi) || 0;
      const counter = { value: 0 };
      const render = () => { element.textContent = Math.round(counter.value).toLocaleString('pt-BR'); };
      render();
      return gsap.to(counter, { value: target, duration: 1, delay: 0.48, ease: 'power3.out', onUpdate: render, onComplete: render });
    });
    return () => tweens.forEach((tween) => tween.kill());
  }, [activeRules, counts.cancelled, counts.failed, counts.pending, counts.sent, isLoading]);

  const tabs = [
    { id: 'rules', label: 'Regras', icon: Layers3, count: rules.length },
    { id: 'queue', label: 'Histórico & Fila', icon: History, count: queue.length },
    { id: 'settings', label: 'Variáveis', icon: Settings2 },
  ];

  return (
    <div ref={rootRef} className={`content-wrapper followup-page ${isLoading ? 'is-loading' : 'is-ready'}`} aria-busy={isLoading}>
      <div className="followup-cursor-glow" aria-hidden="true" />
      <div className="followup-ambient-orbit followup-ambient-orbit--one" aria-hidden="true" />
      <div className="followup-ambient-orbit followup-ambient-orbit--two" aria-hidden="true" />

      {isLoading && (
        <div className="followup-loading-overlay" role="status" aria-live="polite">
          <span><Clock3 size={20} aria-hidden="true" /></span>
          <strong>Organizando automações…</strong>
          <small>Carregando regras, disparos e configurações.</small>
        </div>
      )}

      {statusMsg.text && (
        <div className={`followup-toast is-${statusMsg.type}`} role="status" aria-live="polite">
          <span>{statusMsg.type === 'success' ? <Check size={17} aria-hidden="true" /> : <AlertCircle size={17} aria-hidden="true" />}</span>
          <p>{statusMsg.text}</p>
          <button type="button" onClick={() => setStatusMsg({ type: '', text: '' })} aria-label="Fechar aviso"><X size={15} aria-hidden="true" /></button>
        </div>
      )}

      <header className="followup-page-header">
        <div>
          <span className="followup-overline"><Sparkles size={13} aria-hidden="true" /> Automação de Relacionamento</span>
          <h1>Follow-Up Inteligente</h1>
          <p>Crie jornadas de reengajamento e acompanhe cada disparo em tempo real.</p>
        </div>
        <button type="button" className="followup-primary-action followup-animated-action" onClick={() => { setEditingRule(null); setShowModal(true); }}>
          <Plus size={17} aria-hidden="true" /> Nova Regra
        </button>
      </header>

      <section className="followup-overview" aria-label="Resumo do Follow-Up">
        <div className="followup-metrics">
          <article className="followup-metric-card is-mint"><span><small>Regras Ativas</small><strong data-followup-kpi={activeRules}>{activeRules}</strong><p>de {rules.length.toLocaleString('pt-BR')} regras configuradas</p></span><i className="followup-metric-icon"><Zap size={18} aria-hidden="true" /></i></article>
          <article className="followup-metric-card is-blue"><span><small>Na Fila</small><strong data-followup-kpi={counts.pending}>{counts.pending}</strong><p>disparos aguardando envio</p></span><i className="followup-metric-icon"><CalendarClock size={18} aria-hidden="true" /></i></article>
          <article className="followup-metric-card is-cyan"><span><small>Enviados</small><strong data-followup-kpi={counts.sent}>{counts.sent}</strong><p>mensagens processadas</p></span><i className="followup-metric-icon"><Send size={18} aria-hidden="true" /></i></article>
          <article className="followup-metric-card is-lime"><span><small>Interrompidos</small><strong data-followup-kpi={counts.cancelled + counts.failed}>{counts.cancelled + counts.failed}</strong><p>cancelados ou com falha</p></span><i className="followup-metric-icon"><CircleSlash2 size={18} aria-hidden="true" /></i></article>
        </div>

        <article className={`followup-global-status ${globalEnabled ? 'is-active' : 'is-paused'}`}>
          <span className="followup-global-icon">{globalEnabled ? <Activity size={20} aria-hidden="true" /> : <Pause size={20} aria-hidden="true" />}</span>
          <div><small>Status Global</small><strong>{globalEnabled ? 'Automações Ativas' : 'Automações Pausadas'}</strong><p>{globalEnabled ? 'Monitorando gatilhos e processando a fila.' : 'Novos disparos estão temporariamente suspensos.'}</p></div>
          <label className="followup-switch">
            <input type="checkbox" checked={globalEnabled} onChange={handleToggleGlobal} disabled={isUpdatingGlobal} aria-label={globalEnabled ? 'Pausar todas as automações' : 'Ativar todas as automações'} />
            <span className="followup-switch-slider" aria-hidden="true" />
          </label>
        </article>
      </section>

      <nav className="followup-tabs" role="tablist" aria-label="Áreas do Follow-Up">
        <div>{tabs.map(({ id, label, icon: Icon, count }) => (
          <button key={id} type="button" role="tab" aria-selected={activeTab === id} aria-controls={`followup-panel-${id}`} className={`followup-tab followup-animated-action ${activeTab === id ? 'is-active' : ''}`} onClick={() => setActiveTab(id)}>
            <Icon size={15} aria-hidden="true" /> {label}{typeof count === 'number' && <span>{count.toLocaleString('pt-BR')}</span>}
          </button>
        ))}</div>
        <button type="button" className="followup-refresh followup-animated-action" onClick={() => loadData({ silent: true })} disabled={isRefreshing}>
          <RefreshCw size={15} aria-hidden="true" /> {isRefreshing ? 'Atualizando…' : 'Atualizar Dados'}
        </button>
      </nav>

      {activeTab === 'rules' && (
        <section id="followup-panel-rules" className="followup-tab-panel" role="tabpanel">
          <header className="followup-section-header"><div><span>Jornadas Configuradas</span><h2>Regras de Envio</h2><p>Defina quando, para quem e como cada mensagem será enviada.</p></div><button type="button" className="followup-secondary-action followup-animated-action" onClick={() => { setEditingRule(null); setShowModal(true); }}><Plus size={15} aria-hidden="true" /> Criar Regra</button></header>
          {rules.length === 0 ? (
            <div className="followup-empty-state"><span><Bot size={26} aria-hidden="true" /></span><h3>Nenhuma regra configurada</h3><p>Crie a primeira jornada automática para reengajar seus contatos.</p><button type="button" className="followup-primary-action followup-animated-action" onClick={() => setShowModal(true)}><Plus size={15} aria-hidden="true" /> Criar Primeira Regra</button></div>
          ) : (
            <div className="followup-rules-grid">
              {rules.map((rule) => (
                <article key={rule.id} className={`followup-rule-card ${rule.is_active ? 'is-active' : 'is-paused'}`}>
                  <header><span className="followup-rule-sequence"><Zap size={14} aria-hidden="true" /></span><div><small>{TRIGGER_LABELS[rule.trigger_event] || rule.trigger_event}</small><h3>{rule.name}</h3></div><span className={`followup-state-pill ${rule.is_active ? 'is-active' : 'is-paused'}`}><i />{rule.is_active ? 'Ativa' : 'Pausada'}</span></header>
                  <div className="followup-rule-timing"><span><Clock3 size={14} aria-hidden="true" /><small>Espera</small><strong>{formatDelay(rule.delay_hours)}</strong></span><span><Send size={14} aria-hidden="true" /><small>Tentativas</small><strong>{rule.max_attempts || 1}</strong></span><span><Layers3 size={14} aria-hidden="true" /><small>Filtros</small><strong>{(rule.channel_ids?.length || 0) + (rule.pipeline_stages?.length || 0)}</strong></span></div>
                  <blockquote><MessageSquareText size={14} aria-hidden="true" /><p>{rule.message || 'Mensagem não configurada.'}</p></blockquote>
                  <footer>
                    <label className="followup-rule-toggle"><input type="checkbox" checked={Boolean(rule.is_active)} onChange={() => handleToggleRuleActive(rule)} disabled={busyRuleIds.has(rule.id)} /><span aria-hidden="true" /><small>{busyRuleIds.has(rule.id) ? 'Atualizando…' : rule.is_active ? 'Ativada' : 'Pausada'}</small></label>
                    <div><button type="button" className="followup-icon-action followup-animated-action" onClick={() => { setEditingRule(rule); setShowModal(true); }} aria-label={`Editar regra ${rule.name}`}><Edit3 size={15} aria-hidden="true" /></button><button type="button" className="followup-icon-action is-danger followup-animated-action" onClick={() => setConfirmation({ type: 'delete-rule', id: rule.id, name: rule.name, busy: false })} aria-label={`Excluir regra ${rule.name}`}><Trash2 size={15} aria-hidden="true" /></button></div>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'queue' && (
        <section id="followup-panel-queue" className="followup-tab-panel" role="tabpanel">
          <header className="followup-section-header"><div><span>Rastreamento Operacional</span><h2>Histórico & Fila</h2><p>Acompanhe disparos pendentes, enviados, cancelados e com falha.</p></div></header>
          <div className="followup-history-filters">
            <label className="followup-search" htmlFor="followup-queue-search"><Search size={16} aria-hidden="true" /><input id="followup-queue-search" name="followup_queue_search" type="search" value={queueSearch} onChange={(event) => setQueueSearch(event.target.value)} placeholder="Buscar contato, regra ou canal…" autoComplete="off" /></label>
            <div role="group" aria-label="Filtrar histórico por status">{[
              ['all', 'Todos', queue.length],
              ['pending', 'Pendentes', counts.pending],
              ['sent', 'Enviados', counts.sent],
              ['cancelled', 'Cancelados', counts.cancelled],
              ['failed', 'Falhas', counts.failed],
            ].map(([id, label, count]) => <button key={id} type="button" className={`followup-filter-chip followup-animated-action ${queueStatus === id ? 'is-active' : ''}`} aria-pressed={queueStatus === id} onClick={() => setQueueStatus(id)}>{label}<span>{count.toLocaleString('pt-BR')}</span></button>)}</div>
          </div>
          <div className="followup-history-table-wrap">
            <table className="followup-history-table">
              <thead><tr><th>Regra & Contato</th><th>Canal</th><th>Agendamento</th><th>Tentativa</th><th>Estado</th><th><span className="sr-only">Ações</span></th></tr></thead>
              <tbody>
                {filteredQueue.map((item) => {
                  const rule = rules.find((currentRule) => currentRule.id === item.rule_id);
                  const status = STATUS_META[item.status] || { label: item.status || 'Desconhecido', className: 'is-unknown' };
                  return (
                    <tr key={item.id} className="followup-history-row">
                      <td data-label="Regra & Contato"><div className="followup-history-person"><span>{(item.contacts?.name || 'C').substring(0, 2).toUpperCase()}</span><div><strong>{item.contacts?.name || 'Contato não identificado'}</strong><small>{rule?.name || 'Regra excluída'} · {item.contacts?.phone || 'Sem telefone'}</small></div></div></td>
                      <td data-label="Canal"><span className="followup-channel-pill">{item.channels?.name || 'Canal padrão'}</span></td>
                      <td data-label="Agendamento"><strong className="followup-date-value">{formatDateTime(item.scheduled_at)}</strong>{item.sent_at && <small className="followup-sent-at">Enviado em {formatDateTime(item.sent_at)}</small>}</td>
                      <td data-label="Tentativa"><span className="followup-attempt">{Number(item.attempt_number) || 1}</span></td>
                      <td data-label="Estado"><span className={`followup-state-pill ${status.className}`}><i />{status.label}</span>{item.status === 'cancelled' && <small className="followup-cancel-reason">{getCancelReason(item.cancel_reason)}</small>}</td>
                      <td>{item.status === 'pending' && <button type="button" className="followup-cancel-action followup-animated-action" onClick={() => setConfirmation({ type: 'cancel-queue', id: item.id, name: item.contacts?.name || 'este contato', busy: false })}>Cancelar Disparo</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredQueue.length === 0 && <div className="followup-table-empty"><History size={23} aria-hidden="true" /><strong>Nenhum registro encontrado</strong><p>Ajuste a busca ou os filtros para visualizar outros disparos.</p></div>}
          </div>
        </section>
      )}

      {activeTab === 'settings' && (
        <section id="followup-panel-settings" className="followup-tab-panel" role="tabpanel">
          <header className="followup-section-header"><div><span>Personalização</span><h2>Variáveis do Sistema</h2><p>Configure os dados usados automaticamente nos textos das mensagens.</p></div></header>
          <div className="followup-settings-layout">
            <form onSubmit={handleSaveSettings} className="followup-settings-card">
              <header><span><Settings2 size={18} aria-hidden="true" /></span><div><h3>Identidade da Empresa</h3><p>O valor será aplicado à variável <code>{'{{company_name}}'}</code>.</p></div></header>
              <div className="followup-form-field"><label htmlFor="followup-company-name">Nome da Empresa</label><input id="followup-company-name" name="followup_company_name" type="text" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Ex.: Clínica Mess…" autoComplete="organization" required /></div>
              <div className="followup-variable-preview"><small>Prévia da Substituição</small><p>Olá, <strong>{'{{contact_name}}'}</strong>! Aqui é da <strong>{companyName.trim() || 'sua empresa'}</strong>. Podemos continuar?</p></div>
              <footer><button type="submit" className="followup-primary-action followup-animated-action" disabled={isSavingSetting}><Check size={15} aria-hidden="true" />{isSavingSetting ? 'Salvando…' : 'Salvar Variáveis'}</button></footer>
            </form>
            <aside className="followup-variables-guide followup-settings-card"><span className="followup-guide-icon"><MessageSquareText size={19} aria-hidden="true" /></span><small>Variáveis Disponíveis</small><h3>Mensagens mais humanas, sem trabalho manual.</h3><p>Use os atalhos no editor de regras. O CRM substitui cada variável no momento do envio.</p><ul><li><code>{'{{contact_name}}'}</code><span>Nome do contato</span></li><li><code>{'{{agent_name}}'}</code><span>Nome do operador</span></li><li><code>{'{{company_name}}'}</code><span>Nome da empresa</span></li></ul></aside>
          </div>
        </section>
      )}

      {showModal && <FollowUpRuleModal rule={editingRule} channels={channels} onClose={() => setShowModal(false)} onSaveSuccess={async () => { setShowModal(false); await loadData({ silent: true }); showStatus('success', 'Regra salva e pronta para uso.'); }} />}

      {confirmation && (
        <div className="followup-confirm-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !confirmation.busy && setConfirmation(null)}>
          <section className="followup-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="followup-confirm-title" aria-describedby="followup-confirm-description">
            <span className="followup-confirm-icon"><Trash2 size={20} aria-hidden="true" /></span>
            <h2 id="followup-confirm-title">{confirmation.type === 'delete-rule' ? 'Excluir esta regra?' : 'Cancelar este disparo?'}</h2>
            <p id="followup-confirm-description">{confirmation.type === 'delete-rule' ? `A regra “${confirmation.name}” e seus disparos pendentes serão removidos.` : `O disparo agendado para ${confirmation.name} não será enviado.`}</p>
            <div><button type="button" className="followup-secondary-action" onClick={() => setConfirmation(null)} disabled={confirmation.busy}>Manter</button><button type="button" className="followup-danger-action" onClick={executeConfirmation} disabled={confirmation.busy}>{confirmation.busy ? 'Processando…' : confirmation.type === 'delete-rule' ? 'Excluir Regra' : 'Cancelar Disparo'}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
