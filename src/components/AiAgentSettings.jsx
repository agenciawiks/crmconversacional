import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import {
  Activity, AlertCircle, AlertOctagon, Bot, BrainCircuit, Check, CheckCircle2,
  ChevronDown, ChevronRight, Eye, EyeOff, FileText, Gauge, KeyRound, MessageSquareText,
  PauseCircle, Radio, Save, ShieldCheck, SlidersHorizontal, Sparkles,
  TestTube2, WandSparkles, X, Zap,
} from 'lucide-react';
import SupabaseService from '../services/supabaseService';
import OpenAIStatusCard from './OpenAIStatusCard';
import { useAuth } from '../context/AuthContext';

const DEFAULT_SETTINGS = {
  id: null, tenantId: null, isEnabled: false, agentName: 'Atendente IA',
  model: 'gpt-4o-mini', apiKeyConfigured: false, temperature: 0.7,
  systemPrompt: '', negativePrompt: '', welcomeMessage: '', pausePhrases: [],
};

const PROVIDER_LABELS = {
  evolution: 'Evolution API', meta: 'WhatsApp Oficial',
  meta_cloud: 'WhatsApp Oficial', instagram: 'Instagram',
};

const TABS = [
  { id: 'prompt', label: 'Prompt', description: 'Identidade & contexto', icon: FileText },
  { id: 'guidelines', label: 'Diretrizes', description: 'Limites da conversa', icon: ShieldCheck },
  { id: 'rules', label: 'Regras', description: 'Pausa & handoff', icon: PauseCircle },
  { id: 'model', label: 'Modelo & Teste', description: 'OpenAI & conexão', icon: TestTube2 },
];

const getTemperatureLabel = (value) => {
  if (Number(value) <= 0.3) return 'Preciso & factual';
  if (Number(value) >= 0.8) return 'Criativo & variado';
  return 'Equilibrado';
};

export default function AiAgentSettings() {
  const { effectiveTenantId } = useAuth();
  const rootRef = useRef(null);
  const channelPickerRef = useRef(null);
  const channelDrawerRef = useRef(null);
  const statusTimerRef = useRef(null);
  const firstEntranceFinished = useRef(false);
  const [channels, setChannels] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [newPhrase, setNewPhrase] = useState('');
  const [activeTab, setActiveTab] = useState('prompt');
  const [channelDrawerOpen, setChannelDrawerOpen] = useState(false);
  const [channelsLoaded, setChannelsLoaded] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [loadedChannelId, setLoadedChannelId] = useState('');
  const [settingsRevision, setSettingsRevision] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const isLoading = !channelsLoaded || settingsLoading || Boolean(selectedChannelId && loadedChannelId !== selectedChannelId);
  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) || null,
    [channels, selectedChannelId],
  );
  const promptCharacters = settings.systemPrompt.trim().length;
  const completedSections = [
    Boolean(settings.agentName.trim() && settings.systemPrompt.trim()),
    Boolean(settings.negativePrompt.trim()),
    settings.pausePhrases.length > 0,
    settings.apiKeyConfigured || Boolean(apiKey.trim()),
  ].filter(Boolean).length;

  const updateSetting = (key, value) => setSettings((current) => ({ ...current, [key]: value }));

  const showStatus = (type, text) => {
    window.clearTimeout(statusTimerRef.current);
    setStatusMsg({ type, text });
    statusTimerRef.current = window.setTimeout(() => setStatusMsg({ type: '', text: '' }), 4300);
  };

  useEffect(() => {
    let active = true;
    async function loadChannels() {
      setChannelsLoaded(false);
      setLoadedChannelId('');
      try {
        const result = await SupabaseService.fetchChannels(effectiveTenantId);
        if (!active) return;
        const nextChannels = result || [];
        setChannels(nextChannels);
        setSelectedChannelId((current) => (
          nextChannels.some((channel) => channel.id === current) ? current : nextChannels[0]?.id || ''
        ));
      } catch (error) {
        console.error('[AiAgentSettings] Failed to load channels:', error);
        if (active) showStatus('error', 'Não foi possível carregar os canais. Atualize a página e tente novamente.');
      } finally {
        if (active) setChannelsLoaded(true);
      }
    }
    loadChannels();
    return () => { active = false; };
  }, [effectiveTenantId]);

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      if (!selectedChannelId) {
        setSettings({ ...DEFAULT_SETTINGS, tenantId: effectiveTenantId || null });
        setSettingsLoading(false);
        setLoadedChannelId('');
        setSettingsRevision((revision) => revision + 1);
        return;
      }
      setSettingsLoading(true);
      try {
        const config = await SupabaseService.fetchAiSettings(selectedChannelId);
        if (!active) return;
        const channel = channels.find((item) => item.id === selectedChannelId);
        setSettings(config ? {
          id: config.id,
          tenantId: config.tenant_id,
          isEnabled: config.is_enabled === true,
          agentName: config.agent_name || 'Atendente IA',
          model: config.model || 'gpt-4o-mini',
          apiKeyConfigured: config.api_key_configured === true,
          temperature: Number(config.temperature ?? 0.7),
          systemPrompt: config.system_prompt || '',
          negativePrompt: config.negative_prompt || '',
          welcomeMessage: config.welcome_message || '',
          pausePhrases: Array.isArray(config.pause_trigger_phrases) ? config.pause_trigger_phrases : [],
        } : { ...DEFAULT_SETTINGS, tenantId: channel?.tenantId || effectiveTenantId || null });
        setApiKey('');
        setShowApiKey(false);
      } catch (error) {
        console.error('[AiAgentSettings] Failed to load settings:', error);
        if (active) showStatus('error', 'Não foi possível carregar a configuração deste canal. Tente novamente.');
      } finally {
        if (active) {
          setSettingsLoading(false);
          setLoadedChannelId(selectedChannelId);
          setSettingsRevision((revision) => revision + 1);
        }
      }
    }
    loadSettings();
    return () => { active = false; };
  }, [channels, effectiveTenantId, selectedChannelId]);

  useEffect(() => () => window.clearTimeout(statusTimerRef.current), []);

  useEffect(() => {
    if (!channelDrawerOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!channelPickerRef.current?.contains(event.target)) setChannelDrawerOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setChannelDrawerOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [channelDrawerOpen]);

  useLayoutEffect(() => {
    const drawer = channelDrawerRef.current;
    if (!channelDrawerOpen || !drawer) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const context = gsap.context(() => {
      gsap.fromTo(drawer, { autoAlpha: 0, y: reduceMotion ? -4 : -9, scale: reduceMotion ? 0.99 : 0.955 }, { autoAlpha: 1, y: 0, scale: 1, duration: reduceMotion ? 0.22 : 0.34, ease: 'back.out(1.7)', transformOrigin: 'top center' });
      gsap.fromTo('.ai-channel-option', { autoAlpha: 0, x: reduceMotion ? -2 : -8 }, { autoAlpha: 1, x: 0, duration: reduceMotion ? 0.18 : 0.28, stagger: reduceMotion ? 0.02 : 0.045, ease: 'power3.out', delay: reduceMotion ? 0.03 : 0.08 });
    }, drawer);
    return () => context.revert();
  }, [channelDrawerOpen]);

  const addPhrase = () => {
    const phrase = newPhrase.trim().toLocaleLowerCase('pt-BR');
    if (!phrase || settings.pausePhrases.includes(phrase)) return;
    updateSetting('pausePhrases', [...settings.pausePhrases, phrase]);
    setNewPhrase('');
  };

  const removePhrase = (phraseToRemove) => {
    updateSetting('pausePhrases', settings.pausePhrases.filter((phrase) => phrase !== phraseToRemove));
  };

  const handlePhraseKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addPhrase();
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!settings.agentName.trim()) {
      setActiveTab('prompt');
      showStatus('error', 'Informe o nome do agente antes de salvar.');
      window.setTimeout(() => rootRef.current?.querySelector('#ai-agent-name')?.focus(), 0);
      return;
    }
    if (!settings.systemPrompt.trim()) {
      setActiveTab('prompt');
      showStatus('error', 'Escreva o prompt principal antes de salvar.');
      window.setTimeout(() => rootRef.current?.querySelector('#ai-system-prompt')?.focus(), 0);
      return;
    }
    setIsSaving(true);
    try {
      const result = await SupabaseService.saveAiSettings({
        id: settings.id,
        tenant_id: settings.tenantId,
        channel_id: selectedChannelId,
        is_enabled: settings.isEnabled,
        agent_name: settings.agentName.trim(),
        model: settings.model,
        ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
        temperature: Number(settings.temperature),
        system_prompt: settings.systemPrompt,
        negative_prompt: settings.negativePrompt,
        welcome_message: settings.welcomeMessage,
        pause_trigger_phrases: settings.pausePhrases,
      });
      if (!result) throw new Error('AI settings were not persisted');
      setSettings((current) => ({
        ...current,
        id: result.id || current.id,
        tenantId: result.tenant_id || current.tenantId,
        apiKeyConfigured: result.api_key_configured === true || current.apiKeyConfigured || Boolean(apiKey.trim()),
      }));
      setApiKey('');
      setShowApiKey(false);
      showStatus('success', 'Configurações salvas com segurança para este canal.');
    } catch (error) {
      console.error('[AiAgentSettings] Save failed:', error);
      showStatus('error', 'Não foi possível salvar. Verifique a conexão e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || isLoading) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const distance = reduceMotion ? 0.45 : 1;
    const speed = reduceMotion ? 0.72 : 1;
    firstEntranceFinished.current = false;
    const context = gsap.context(() => {
      const targets = [root.querySelector('.ai-page-header'), ...gsap.utils.toArray('.ai-metric-card'), root.querySelector('.ai-channel-strip'), root.querySelector('.ai-workspace')].filter(Boolean);
      gsap.set(targets, { willChange: 'transform,opacity' });
      gsap.timeline({
        delay: 0.05,
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          firstEntranceFinished.current = true;
          gsap.set(targets, { clearProps: 'transform,opacity,visibility,willChange' });
        },
      })
        .fromTo('.ai-page-header', { autoAlpha: 0, y: 32 * distance }, { autoAlpha: 1, y: 0, duration: 0.56 * speed }, 0)
        .fromTo('.ai-metric-card', { autoAlpha: 0, y: 24 * distance, scale: reduceMotion ? 0.98 : 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.48 * speed, stagger: 0.075 * speed }, 0.14 * speed)
        .fromTo('.ai-channel-strip', { autoAlpha: 0, y: 20 * distance }, { autoAlpha: 1, y: 0, duration: 0.45 * speed }, 0.35 * speed)
        .fromTo('.ai-workspace', { autoAlpha: 0, y: 25 * distance, scale: reduceMotion ? 0.998 : 0.992 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5 * speed }, 0.48 * speed)
        .fromTo('.ai-tab-button', { autoAlpha: 0, x: -14 * distance }, { autoAlpha: 1, x: 0, duration: 0.34 * speed, stagger: 0.055 * speed }, 0.58 * speed)
        .fromTo('.ai-tab-panel > *', { autoAlpha: 0, y: 14 * distance }, { autoAlpha: 1, y: 0, duration: 0.35 * speed, stagger: 0.045 * speed }, 0.7 * speed);
      if (!reduceMotion) {
        gsap.to('.ai-ambient-orbit', { rotation: 360, duration: 34, repeat: -1, ease: 'none', transformOrigin: 'center' });
        gsap.to('.ai-metric-icon', { y: -3, rotation: (index) => index % 2 ? 4 : -4, duration: 1.9, repeat: -1, yoyo: true, stagger: 0.14, ease: 'sine.inOut' });
      }
    }, root);
    return () => context.revert();
  }, [isLoading, settingsRevision]);

  useLayoutEffect(() => {
    const panel = rootRef.current?.querySelector('.ai-tab-panel');
    if (!panel || isLoading || !firstEntranceFinished.current) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const context = gsap.context(() => {
      gsap.fromTo(panel, { autoAlpha: 0, y: reduceMotion ? 7 : 17, scale: reduceMotion ? 0.999 : 0.994 }, { autoAlpha: 1, y: 0, scale: 1, duration: reduceMotion ? 0.28 : 0.4, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
      gsap.fromTo(panel.children, { autoAlpha: 0, y: reduceMotion ? 5 : 12 }, { autoAlpha: 1, y: 0, duration: reduceMotion ? 0.22 : 0.33, stagger: reduceMotion ? 0.025 : 0.045, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
    }, panel);
    return () => context.revert();
  }, [activeTab, isLoading]);

  useEffect(() => {
    const root = rootRef.current;
    const glow = root?.querySelector('.ai-cursor-glow');
    if (!root || !glow) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
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
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const buttons = [...root.querySelectorAll('.ai-animated-action')];
    const cleanups = buttons.map((button) => {
      const enter = () => gsap.to(button, { y: reduceMotion ? -1 : -3, scale: reduceMotion ? 1.012 : 1.035, duration: reduceMotion ? 0.13 : 0.22, ease: 'back.out(2)', overwrite: 'auto' });
      const leave = () => gsap.to(button, { y: 0, scale: 1, duration: reduceMotion ? 0.14 : 0.26, ease: 'power3.out', overwrite: 'auto' });
      const down = () => gsap.to(button, { y: 0, scale: reduceMotion ? 0.985 : 0.95, duration: 0.11, ease: 'power2.out', overwrite: 'auto' });
      button.addEventListener('pointerenter', enter);
      button.addEventListener('pointerleave', leave);
      button.addEventListener('pointerdown', down);
      return () => { button.removeEventListener('pointerenter', enter); button.removeEventListener('pointerleave', leave); button.removeEventListener('pointerdown', down); };
    });
    return () => { cleanups.forEach((cleanup) => cleanup()); gsap.killTweensOf(buttons); };
  }, [activeTab, channelDrawerOpen, isLoading, settings.pausePhrases.length]);

  useEffect(() => {
    const root = rootRef.current;
    const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!root || isLoading || !supportsHover) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cards = [...root.querySelectorAll('.ai-metric-card')];
    const cleanups = cards.map((card) => {
      let bounds;
      const icon = card.querySelector('.ai-metric-icon');
      const shine = card.querySelector('.ai-metric-shine');
      const rotateX = gsap.quickTo(card, 'rotationX', { duration: 0.32, ease: 'power3.out' });
      const rotateY = gsap.quickTo(card, 'rotationY', { duration: 0.32, ease: 'power3.out' });
      const lift = gsap.quickTo(card, 'y', { duration: 0.28, ease: 'power3.out' });
      const scale = gsap.quickTo(card, 'scale', { duration: 0.28, ease: 'power3.out' });
      const enter = () => {
        bounds = card.getBoundingClientRect();
        gsap.set(card, { transformPerspective: 850 });
        lift(reduceMotion ? -3 : -8);
        scale(reduceMotion ? 1.008 : 1.025);
        if (icon) gsap.to(icon, { scale: reduceMotion ? 1.03 : 1.13, rotation: reduceMotion ? 2 : 7, duration: 0.28, ease: 'back.out(2)', overwrite: 'auto' });
        if (shine) gsap.fromTo(shine, { xPercent: -145, autoAlpha: 0 }, { xPercent: 245, autoAlpha: reduceMotion ? 0.3 : 0.68, duration: reduceMotion ? 0.5 : 0.78, ease: 'power2.out', overwrite: 'auto' });
      };
      const move = (event) => {
        if (!bounds) return;
        rotateX((((event.clientY - bounds.top) / bounds.height) - 0.5) * -7);
        rotateY((((event.clientX - bounds.left) / bounds.width) - 0.5) * 8);
      };
      const leave = () => {
        bounds = undefined;
        rotateX(0);
        rotateY(0);
        lift(0);
        scale(1);
        if (icon) gsap.to(icon, { scale: 1, rotation: 0, duration: 0.3, ease: 'power3.out', overwrite: 'auto' });
        if (shine) gsap.to(shine, { autoAlpha: 0, duration: 0.18, overwrite: 'auto' });
      };
      card.addEventListener('pointerenter', enter); card.addEventListener('pointermove', move); card.addEventListener('pointerleave', leave);
      return () => { card.removeEventListener('pointerenter', enter); card.removeEventListener('pointermove', move); card.removeEventListener('pointerleave', leave); };
    });
    return () => {
      cleanups.forEach((cleanup) => cleanup());
      gsap.killTweensOf(cards);
      gsap.killTweensOf(root.querySelectorAll('.ai-metric-icon, .ai-metric-shine'));
      gsap.set(cards, { clearProps: 'transform,transformPerspective' });
    };
  }, [isLoading]);

  useLayoutEffect(() => {
    if (isLoading) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const counters = [...(rootRef.current?.querySelectorAll('[data-ai-kpi]') || [])];
    const tweens = counters.map((element) => {
      const target = Number(element.dataset.aiKpi) || 0;
      const counter = { value: 0 };
      const render = () => { element.textContent = Math.round(counter.value).toLocaleString('pt-BR'); };
      render();
      return gsap.to(counter, { value: target, duration: reduceMotion ? 0.38 : 1, delay: reduceMotion ? 0.2 : 0.47, ease: 'power3.out', onUpdate: render, onComplete: render });
    });
    return () => tweens.forEach((tween) => tween.kill());
  }, [completedSections, isLoading, promptCharacters, settings.pausePhrases.length]);

  const renderPromptPanel = () => (
    <div className="ai-tab-panel" id="ai-panel-prompt" role="tabpanel" aria-labelledby="ai-tab-prompt">
      <section className="ai-editor-card ai-editor-card--identity">
        <header className="ai-card-heading"><span><Bot size={18} aria-hidden="true" /></span><div><small>Identidade</small><h2>Quem fala com o cliente?</h2><p>Defina o nome e a primeira mensagem da experiência.</p></div></header>
        <div className="ai-field-grid">
          <div className="ai-field"><label htmlFor="ai-agent-name">Nome do Agente</label><input id="ai-agent-name" name="agent_name" type="text" autoComplete="off" value={settings.agentName} onChange={(event) => updateSetting('agentName', event.target.value)} placeholder="Ex.: Assistente Mess…" aria-required="true" /></div>
          <div className="ai-field"><label htmlFor="ai-welcome-message">Mensagem de Boas-Vindas <em>Opcional</em></label><textarea id="ai-welcome-message" name="welcome_message" autoComplete="off" value={settings.welcomeMessage} onChange={(event) => updateSetting('welcomeMessage', event.target.value)} placeholder="Ex.: Olá! Como posso ajudar você hoje?…" rows="3" /><small>Se ficar em branco, a IA responde diretamente desde a primeira mensagem.</small></div>
        </div>
      </section>
      <section className="ai-editor-card ai-editor-card--prompt">
        <header className="ai-card-heading"><span><BrainCircuit size={18} aria-hidden="true" /></span><div><small>Prompt Principal</small><h2>Contexto, personalidade & objetivo</h2><p>Escreva livremente quem o agente representa, o que ele sabe e como deve conduzir a conversa.</p></div><b>{promptCharacters.toLocaleString('pt-BR')} caracteres</b></header>
        <div className="ai-field"><label htmlFor="ai-system-prompt">Prompt do Sistema</label><textarea id="ai-system-prompt" name="system_prompt" autoComplete="off" value={settings.systemPrompt} onChange={(event) => updateSetting('systemPrompt', event.target.value)} placeholder="Você é o assistente virtual da empresa. Seu objetivo é acolher, entender a necessidade e orientar o próximo passo…" rows="12" aria-required="true" /><small>Quanto mais claros forem contexto, objetivo, tom e informações do negócio, mais consistente será a resposta.</small></div>
      </section>
    </div>
  );

  const renderGuidelinesPanel = () => (
    <div className="ai-tab-panel" id="ai-panel-guidelines" role="tabpanel" aria-labelledby="ai-tab-guidelines">
      <section className="ai-editor-card ai-editor-card--guardrail">
        <header className="ai-card-heading"><span><AlertOctagon size={18} aria-hidden="true" /></span><div><small>Diretrizes</small><h2>O que o agente não pode fazer?</h2><p>Cadastre manualmente limites comerciais, éticos e operacionais.</p></div></header>
        <div className="ai-guideline-layout">
          <div className="ai-field"><label htmlFor="ai-negative-prompt">Instruções Negativas</label><textarea id="ai-negative-prompt" name="negative_prompt" autoComplete="off" value={settings.negativePrompt} onChange={(event) => updateSetting('negativePrompt', event.target.value)} placeholder={'Ex.:\n- Nunca ofereça descontos sem autorização.\n- Não invente preços ou prazos.\n- Encaminhe assuntos sensíveis para um humano…'} rows="12" /><small>Use uma regra por linha e descreva também o comportamento esperado quando a regra for acionada.</small></div>
          <aside className="ai-guideline-tips" aria-label="Sugestões de diretrizes"><span><WandSparkles size={17} aria-hidden="true" /></span><h3>Checklist de Segurança</h3><p>Você controla todo o conteúdo. Considere registrar:</p><ul><li>Limites de preço e desconto</li><li>Assuntos que exigem especialista</li><li>Dados que nunca devem ser solicitados</li><li>Quando admitir que não sabe</li><li>Quando transferir para atendimento humano</li></ul></aside>
        </div>
      </section>
    </div>
  );

  const renderRulesPanel = () => (
    <div className="ai-tab-panel" id="ai-panel-rules" role="tabpanel" aria-labelledby="ai-tab-rules">
      <section className={`ai-activation-card ${settings.isEnabled ? 'is-active' : ''}`}>
        <span className="ai-activation-icon"><Radio size={20} aria-hidden="true" /></span><div><small>Estado da Automação</small><h2>{settings.isEnabled ? 'Agente ativo neste canal' : 'Agente pausado neste canal'}</h2><p>{settings.isEnabled ? 'Novas mensagens podem ser respondidas automaticamente conforme as regras.' : 'As configurações ficam salvas, mas nenhuma resposta automática será iniciada.'}</p></div>
        <label className="ai-switch"><input name="is_enabled" type="checkbox" checked={settings.isEnabled} onChange={(event) => updateSetting('isEnabled', event.target.checked)} /><span aria-hidden="true"><i /></span><b>{settings.isEnabled ? 'Ativo' : 'Pausado'}</b></label>
      </section>
      <section className="ai-editor-card ai-editor-card--rules">
        <header className="ai-card-heading"><span><PauseCircle size={18} aria-hidden="true" /></span><div><small>Handoff Humano</small><h2>Gatilhos de pausa</h2><p>Ao identificar uma dessas frases, o robô pausa e o contato recebe a etiqueta “IA Inativa”.</p></div><b>{settings.pausePhrases.length.toLocaleString('pt-BR')} regras</b></header>
        <div className="ai-rule-composer"><label htmlFor="ai-pause-phrase">Nova Frase de Pausa</label><div><input id="ai-pause-phrase" name="pause_phrase" type="text" autoComplete="off" value={newPhrase} onChange={(event) => setNewPhrase(event.target.value)} onKeyDown={handlePhraseKeyDown} placeholder="Ex.: quero falar com um atendente…" /><button type="button" className="ai-secondary-action ai-animated-action" onClick={addPhrase}><Zap size={15} aria-hidden="true" /> Adicionar Gatilho</button></div><small>Pressione Enter ou use o botão para adicionar.</small></div>
        <div className="ai-rule-list" aria-label="Gatilhos configurados">{settings.pausePhrases.length > 0 ? settings.pausePhrases.map((phrase, index) => <div className="ai-rule-chip" key={phrase}><span>{String(index + 1).padStart(2, '0')}</span><p>{phrase}</p><button type="button" className="ai-animated-action" onClick={() => removePhrase(phrase)} aria-label={`Remover gatilho ${phrase}`}><X size={14} aria-hidden="true" /></button></div>) : <div className="ai-empty-rules"><PauseCircle size={23} aria-hidden="true" /><strong>Nenhum gatilho cadastrado</strong><p>Adicione frases que devem interromper a automação e chamar o time.</p></div>}</div>
      </section>
    </div>
  );

  const renderModelPanel = () => (
    <div className="ai-tab-panel" id="ai-panel-model" role="tabpanel" aria-labelledby="ai-tab-model">
      <div className="ai-model-grid">
        <section className="ai-editor-card ai-editor-card--model">
          <header className="ai-card-heading"><span><SlidersHorizontal size={18} aria-hidden="true" /></span><div><small>Provedor & Modelo</small><h2>OpenAI</h2><p>Escolha o modelo e o equilíbrio ideal para este canal.</p></div><i className="ai-provider-badge"><CheckCircle2 size={13} aria-hidden="true" /> API Oficial</i></header>
          <div className="ai-field"><label htmlFor="ai-model">Modelo de IA</label><select id="ai-model" name="model" value={settings.model} onChange={(event) => updateSetting('model', event.target.value)}><option value="gpt-4o-mini">GPT-4o Mini — rápido & econômico</option><option value="gpt-4o">GPT-4o — raciocínio avançado</option></select></div>
          <div className="ai-temperature-field"><div><label htmlFor="ai-temperature">Temperatura</label><span>{Number(settings.temperature).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span></div><input id="ai-temperature" name="temperature" type="range" min="0" max="1.2" step="0.1" value={settings.temperature} onChange={(event) => updateSetting('temperature', Number(event.target.value))} aria-describedby="ai-temperature-hint" /><div className="ai-temperature-scale"><span>Preciso</span><strong id="ai-temperature-hint">{getTemperatureLabel(settings.temperature)}</strong><span>Criativo</span></div></div>
          <div className="ai-field"><label htmlFor="ai-api-key">Atualizar Chave da API <em>Write-only</em></label><div className="ai-secret-field"><KeyRound size={16} aria-hidden="true" /><input id="ai-api-key" name="openai_api_key" type={showApiKey ? 'text' : 'password'} autoComplete="new-password" spellCheck="false" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={settings.apiKeyConfigured ? 'Cole somente se quiser trocar a chave…' : 'Cole sua chave sk-proj-…'} /><button type="button" className="ai-animated-action" onClick={() => setShowApiKey((visible) => !visible)} aria-label={showApiKey ? 'Ocultar chave da API' : 'Mostrar chave da API'}>{showApiKey ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button></div><small>A chave salva nunca retorna ao navegador. Este campo serve apenas para cadastrar ou substituir.</small></div>
        </section>
        <OpenAIStatusCard channelId={selectedChannelId} model={settings.model} apiKeyConfigured={settings.apiKeyConfigured} />
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className={`content-wrapper ai-agent-page ${isLoading ? 'is-loading' : 'is-ready'}`} aria-busy={isLoading}>
      <div className="ai-cursor-glow" aria-hidden="true" />
      <div className="ai-ambient-orbit ai-ambient-orbit--one" aria-hidden="true" />
      <div className="ai-ambient-orbit ai-ambient-orbit--two" aria-hidden="true" />
      {isLoading && <div className="ai-loading-overlay" role="status" aria-live="polite"><span><BrainCircuit size={21} aria-hidden="true" /></span><strong>Preparando o agente…</strong><small>Carregando canal, prompt e regras reais.</small></div>}
      {statusMsg.text && <div className={`ai-toast is-${statusMsg.type}`} role="status" aria-live="polite"><span>{statusMsg.type === 'success' ? <Check size={17} aria-hidden="true" /> : <AlertCircle size={17} aria-hidden="true" />}</span><p>{statusMsg.text}</p><button type="button" onClick={() => setStatusMsg({ type: '', text: '' })} aria-label="Fechar aviso"><X size={15} aria-hidden="true" /></button></div>}
      <header className="ai-page-header"><div><span className="ai-overline"><Sparkles size={13} aria-hidden="true" /> Inteligência Conversacional</span><h1>Agente de IA</h1><p>Configure a personalidade, as regras e o modelo que atende cada canal.</p></div><button type="button" className="ai-primary-action ai-animated-action" disabled={!selectedChannelId || isSaving} onClick={handleSave}><Save size={16} aria-hidden="true" />{isSaving ? 'Salvando…' : 'Salvar Configuração'}</button></header>
      <section className="ai-metrics" aria-label="Resumo do Agente de IA">
        <article className="ai-metric-card is-mint"><span className="ai-metric-shine" aria-hidden="true" /><span><small>Estado do Agente</small><strong className="ai-kpi-label">{settings.isEnabled ? 'Ativo' : 'Pausado'}</strong><p>{settings.isEnabled ? 'Respondendo automaticamente' : 'Automação desativada'}</p></span><i className="ai-metric-icon"><Activity size={18} aria-hidden="true" /></i></article>
        <article className="ai-metric-card is-blue"><span className="ai-metric-shine" aria-hidden="true" /><span><small>Prompt Configurado</small><strong data-ai-kpi={promptCharacters}>{promptCharacters}</strong><p>caracteres de contexto</p></span><i className="ai-metric-icon"><MessageSquareText size={18} aria-hidden="true" /></i></article>
        <article className="ai-metric-card is-cyan"><span className="ai-metric-shine" aria-hidden="true" /><span><small>Regras de Handoff</small><strong data-ai-kpi={settings.pausePhrases.length}>{settings.pausePhrases.length}</strong><p>gatilhos de pausa ativos</p></span><i className="ai-metric-icon"><PauseCircle size={18} aria-hidden="true" /></i></article>
        <article className="ai-metric-card is-lime"><span className="ai-metric-shine" aria-hidden="true" /><span><small>Configuração</small><strong data-ai-kpi={completedSections}>{completedSections}</strong><p>de 4 áreas preenchidas</p></span><i className="ai-metric-icon"><Gauge size={18} aria-hidden="true" /></i></article>
      </section>
      <section className="ai-channel-strip"><span className="ai-channel-icon"><Radio size={18} aria-hidden="true" /></span><div><small>Canal em Configuração</small><strong>{selectedChannel?.name || 'Nenhum canal conectado'}</strong><p>{selectedChannel ? `${PROVIDER_LABELS[selectedChannel.provider] || selectedChannel.provider} · configurações isoladas neste canal` : 'Conecte um canal para liberar as configurações do agente.'}</p></div><div ref={channelPickerRef} className={`ai-channel-picker ${channelDrawerOpen ? 'is-open' : ''}`}><button type="button" className="ai-channel-trigger ai-animated-action" onClick={() => setChannelDrawerOpen((open) => !open)} aria-haspopup="listbox" aria-expanded={channelDrawerOpen} aria-controls="ai-channel-options" disabled={channels.length === 0}><span className="ai-channel-trigger-icon"><Radio size={15} aria-hidden="true" /></span><span className="ai-channel-trigger-copy"><small>Trocar Canal</small><strong>{selectedChannel ? `${selectedChannel.name} · ${PROVIDER_LABELS[selectedChannel.provider] || selectedChannel.provider}` : 'Nenhum canal conectado'}</strong></span><ChevronDown className="ai-channel-trigger-chevron" size={15} aria-hidden="true" /></button>{channelDrawerOpen && <div ref={channelDrawerRef} id="ai-channel-options" className="ai-channel-drawer" role="listbox" aria-label="Trocar Canal"><div className="ai-channel-drawer-heading"><span>Escolha o Canal</span><small>{channels.length.toLocaleString('pt-BR')} {channels.length === 1 ? 'opção' : 'opções'}</small></div><div className="ai-channel-options">{channels.map((channel) => { const selected = channel.id === selectedChannelId; return <button key={channel.id} type="button" role="option" aria-selected={selected} className={`ai-channel-option ai-animated-action ${selected ? 'is-selected' : ''}`} onClick={() => { setSelectedChannelId(channel.id); setChannelDrawerOpen(false); }}><span><Radio size={14} aria-hidden="true" /></span><div><strong>{channel.name}</strong><small>{PROVIDER_LABELS[channel.provider] || channel.provider}</small></div>{selected && <Check size={14} aria-hidden="true" />}</button>; })}</div></div>}</div></section>
      {!selectedChannelId ? <section className="ai-no-channel"><span><Bot size={25} aria-hidden="true" /></span><h2>Conecte um canal primeiro</h2><p>O agente é configurado individualmente por canal para manter prompts, credenciais e regras isolados.</p></section> : (
        <form className="ai-workspace" onSubmit={handleSave}>
          <nav className="ai-tabs" aria-label="Áreas de configuração do agente" role="tablist">{TABS.map((tab) => { const Icon = tab.icon; const selected = activeTab === tab.id; return <button key={tab.id} id={`ai-tab-${tab.id}`} type="button" role="tab" aria-selected={selected} aria-controls={`ai-panel-${tab.id}`} className={`ai-tab-button ai-animated-action ${selected ? 'is-active' : ''}`} onClick={() => setActiveTab(tab.id)}><span><Icon size={17} aria-hidden="true" /></span><div><strong>{tab.label}</strong><small>{tab.description}</small></div><ChevronRight size={15} aria-hidden="true" /></button>; })}</nav>
          <div className="ai-workspace-content">{activeTab === 'prompt' && renderPromptPanel()}{activeTab === 'guidelines' && renderGuidelinesPanel()}{activeTab === 'rules' && renderRulesPanel()}{activeTab === 'model' && renderModelPanel()}<footer className="ai-save-bar"><div><span><ShieldCheck size={15} aria-hidden="true" /></span><p><strong>Configuração por canal</strong><small>Alterações são aplicadas somente após salvar.</small></p></div><button type="submit" className="ai-primary-action ai-animated-action" disabled={isSaving}>{isSaving ? <span className="ai-button-spinner" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}{isSaving ? 'Salvando…' : 'Salvar Configuração'}</button></footer></div>
        </form>
      )}
    </div>
  );
}
