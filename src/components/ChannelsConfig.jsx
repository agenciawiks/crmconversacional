import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import {
  Activity,
  AlertCircle,
  Camera,
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Link2,
  MessageCircle,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Webhook,
  X,
  Zap,
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import {
  connectEvolutionChannel,
  DEFAULT_EVOLUTION_URL,
  EVOLUTION_WEBHOOK_URL,
} from '../services/evolutionService';
import {
  INSTAGRAM_WEBHOOK_URL,
  META_WEBHOOK_URL,
  testMetaChannelConnection,
} from '../services/metaChannelService';

const PROVIDERS = {
  evolution: {
    label: 'Evolution API',
    shortLabel: 'Evolution',
    description: 'WhatsApp conectado por instância',
    icon: MessageCircle,
    webhook: EVOLUTION_WEBHOOK_URL,
    accent: 'mint',
  },
  meta_cloud: {
    label: 'WhatsApp Oficial',
    shortLabel: 'API Oficial',
    description: 'Meta Cloud API oficial',
    icon: Smartphone,
    webhook: META_WEBHOOK_URL,
    accent: 'blue',
  },
  instagram: {
    label: 'Instagram',
    shortLabel: 'Instagram',
    description: 'Mensagens da conta profissional',
    icon: Camera,
    webhook: INSTAGRAM_WEBHOOK_URL,
    accent: 'cyan',
  },
};

const STATUS_LABELS = {
  connected: 'Conectado',
  disconnected: 'Desconectado',
  active: 'Ativo',
  expired: 'Credencial Expirada',
};

const getProvider = (provider) => PROVIDERS[provider] || PROVIDERS.evolution;

export default function ChannelsConfig() {
  const rootRef = useRef(null);
  const formRef = useRef(null);
  const resultRef = useRef(null);
  const statusTimerRef = useRef(null);
  const firstEntranceFinished = useRef(false);
  const {
    tenantId,
    channels = [],
    initialDataLoaded,
    addChannel,
    refreshChannels,
    toggleChannelStatus,
    deleteChannel,
  } = useCrm();

  const [showAddForm, setShowAddForm] = useState(false);
  const [providerType, setProviderType] = useState('evolution');
  const [channelName, setChannelName] = useState('');
  const [evoInstance, setEvoInstance] = useState('');
  const [evoApiKey, setEvoApiKey] = useState('');
  const [metaResourceId, setMetaResourceId] = useState('');
  const [metaToken, setMetaToken] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyChannelIds, setBusyChannelIds] = useState(() => new Set());
  const [connectionResult, setConnectionResult] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  const providerCounts = useMemo(() => ({
    connected: channels.filter((channel) => channel.status === 'connected' || channel.status === 'active').length,
    evolution: channels.filter((channel) => channel.provider === 'evolution').length,
    meta_cloud: channels.filter((channel) => channel.provider === 'meta_cloud').length,
    instagram: channels.filter((channel) => channel.provider === 'instagram').length,
  }), [channels]);

  const showStatus = (message) => {
    window.clearTimeout(statusTimerRef.current);
    setStatusMsg(message);
    statusTimerRef.current = window.setTimeout(() => setStatusMsg(''), 3800);
  };

  const clearForm = () => {
    setChannelName('');
    setEvoInstance('');
    setEvoApiKey('');
    setMetaResourceId('');
    setMetaToken('');
    setShowSecret(false);
    setConnectionResult(null);
  };

  const closeForm = () => {
    setShowAddForm(false);
    clearForm();
  };

  const openForm = (provider = 'evolution') => {
    clearForm();
    setProviderType(provider);
    setShowAddForm(true);
    window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  const selectProvider = (provider) => {
    setProviderType(provider);
    setEvoInstance('');
    setEvoApiKey('');
    setMetaResourceId('');
    setMetaToken('');
    setShowSecret(false);
    setConnectionResult(null);
  };

  const handleConnect = async (event) => {
    event.preventDefault();
    if (!channelName.trim() || submitting) return;
    setSubmitting(true);
    setConnectionResult(null);
    try {
      if (providerType === 'evolution') {
        const result = await connectEvolutionChannel({
          name: channelName.trim(),
          url: DEFAULT_EVOLUTION_URL,
          instance: evoInstance.trim(),
          apiKey: evoApiKey,
          tenantId,
        });
        const refreshedChannels = await refreshChannels();
        const persistedChannel = refreshedChannels.find((channel) => result.channelId
          ? channel.id === result.channelId
          : channel.provider === 'evolution' && channel.instance === evoInstance.trim());
        if (!persistedChannel) {
          throw new Error('A Evolution foi validada, mas o canal não ficou salvo. Tente novamente.');
        }
        setEvoApiKey('');
        setConnectionResult({
          type: result.connected ? 'success' : 'warning',
          title: result.connected ? 'Evolution Conectada' : 'Instância sem WhatsApp',
          message: result.message,
          detail: result.state ? `Estado retornado: ${result.state}` : '',
          webhookUrl: result.webhookUrl || EVOLUTION_WEBHOOK_URL,
        });
      } else {
        const testResult = await testMetaChannelConnection({
          provider: providerType,
          resourceId: metaResourceId,
          accessToken: metaToken,
        });
        const webhookUrl = getProvider(providerType).webhook;
        const saved = await addChannel(channelName.trim(), providerType, {
          phoneId: metaResourceId.trim(),
          accessToken: metaToken,
          webhookUrl,
        });
        if (!saved) throw new Error('As credenciais foram validadas, mas o canal não ficou salvo. Tente novamente.');
        setMetaToken('');
        setConnectionResult({
          type: 'success',
          title: `${getProvider(providerType).label} Conectado`,
          message: `${testResult.displayName} foi validado e salvo para este cliente.`,
          detail: testResult.detail,
          webhookUrl,
        });
      }
    } catch (error) {
      setConnectionResult({
        type: 'error',
        title: 'Não Foi Possível Conectar',
        message: error?.message || 'O provedor recusou a conexão. Revise as credenciais e tente novamente.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshChannels();
      showStatus('Lista de canais atualizada.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopyWebhook = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      showStatus('Webhook copiado para a área de transferência.');
    } catch {
      showStatus('Não foi possível copiar. Selecione o endereço manualmente.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmation) return;
    setConfirmation((current) => ({ ...current, busy: true }));
    try {
      const deleted = await deleteChannel(confirmation.id);
      if (!deleted) throw new Error('Channel deletion was not persisted');
      setConfirmation(null);
      showStatus('Canal removido deste cliente.');
    } catch (error) {
      console.error('[ChannelsConfig] Channel deletion failed:', error);
      setConfirmation((current) => current ? { ...current, busy: false } : null);
      showStatus('Não foi possível remover o canal. Tente novamente.');
    }
  };

  const handleToggleChannel = async (channel) => {
    setBusyChannelIds((current) => new Set(current).add(channel.id));
    try {
      const updated = await toggleChannelStatus(channel.id);
      if (!updated) throw new Error('Channel status update was not persisted');
      showStatus(`Canal ${channel.status === 'connected' ? 'desativado' : 'ativado'}.`);
    } catch (error) {
      console.error('[ChannelsConfig] Channel status update failed:', error);
      showStatus('Não foi possível alterar o canal. Tente novamente.');
    } finally {
      setBusyChannelIds((current) => {
        const next = new Set(current);
        next.delete(channel.id);
        return next;
      });
    }
  };

  useEffect(() => () => window.clearTimeout(statusTimerRef.current), []);

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
    if (!root || !initialDataLoaded) return undefined;
    const context = gsap.context(() => {
      const cards = gsap.utils.toArray('.channels-provider-card, .channels-channel-card');
      const targets = [
        root.querySelector('.channels-page-header'),
        ...gsap.utils.toArray('.channels-metric-card'),
        root.querySelector('.channels-provider-section'),
        root.querySelector('.channels-list-section'),
        root.querySelector('.channels-webhooks-section'),
        ...cards,
      ].filter(Boolean);
      gsap.set(targets, { willChange: 'transform,opacity' });
      gsap.timeline({
        delay: 0.06,
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          firstEntranceFinished.current = true;
          gsap.set(targets, { clearProps: 'transform,opacity,visibility,willChange' });
        },
      })
        .fromTo('.channels-page-header', { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.55 }, 0)
        .fromTo('.channels-metric-card', { autoAlpha: 0, y: 25, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.48, stagger: 0.075 }, 0.14)
        .fromTo('.channels-provider-section', { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.48 }, 0.34)
        .fromTo('.channels-provider-card', { autoAlpha: 0, y: 17, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.36, stagger: 0.06 }, 0.47)
        .fromTo('.channels-list-section, .channels-webhooks-section', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.48, stagger: 0.08 }, 0.63)
        .fromTo('.channels-channel-card', { autoAlpha: 0, y: 16, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.34, stagger: 0.05 }, 0.76);
      gsap.to('.channels-ambient-orbit', { rotation: 360, duration: 34, repeat: -1, ease: 'none', transformOrigin: 'center' });
      gsap.to('.channels-metric-icon', { y: -3, rotation: (index) => index % 2 ? 4 : -4, duration: 1.9, repeat: -1, yoyo: true, stagger: 0.15, ease: 'sine.inOut' });
    }, root);
    return () => context.revert();
  }, [initialDataLoaded]);

  useLayoutEffect(() => {
    const panel = formRef.current;
    if (!showAddForm || !panel) return undefined;
    const context = gsap.context(() => {
      gsap.fromTo(panel, { autoAlpha: 0, y: 22, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.46, ease: 'back.out(1.4)' });
      gsap.fromTo('.channels-form-reveal', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.32, stagger: 0.04, delay: 0.12, ease: 'power3.out' });
    }, panel);
    return () => context.revert();
  }, [showAddForm]);

  useLayoutEffect(() => {
    const result = resultRef.current;
    if (!connectionResult || !result) return undefined;
    const tween = gsap.fromTo(result, { autoAlpha: 0, y: 12, scale: 0.98 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.38, ease: 'back.out(1.5)' });
    return () => tween.kill();
  }, [connectionResult]);

  useLayoutEffect(() => {
    if (!confirmation?.id) return undefined;
    const backdrop = rootRef.current?.querySelector('.channels-confirm-backdrop');
    const dialog = backdrop?.querySelector('.channels-confirm-dialog');
    if (!backdrop || !dialog) return undefined;
    const context = gsap.context(() => {
      gsap.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power2.out' });
      gsap.fromTo(dialog, { autoAlpha: 0, y: 20, scale: 0.95 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.36, ease: 'back.out(1.55)' });
    }, backdrop);
    return () => context.revert();
  }, [confirmation?.id]);

  useEffect(() => {
    const root = rootRef.current;
    const glow = root?.querySelector('.channels-cursor-glow');
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
    if (!root || !initialDataLoaded) return undefined;
    const buttons = [...root.querySelectorAll('.channels-animated-action')];
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
    return () => { cleanups.forEach((cleanup) => cleanup()); gsap.killTweensOf(buttons); };
  }, [channels.length, initialDataLoaded, providerType, showAddForm]);

  useEffect(() => {
    const root = rootRef.current;
    const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!root || !initialDataLoaded || !supportsHover) return undefined;
    const cards = [...root.querySelectorAll('.channels-metric-card')];
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
    return () => { cleanups.forEach((cleanup) => cleanup()); gsap.killTweensOf(cards); gsap.set(cards, { clearProps: 'transform,transformPerspective' }); };
  }, [initialDataLoaded]);

  useLayoutEffect(() => {
    if (!initialDataLoaded) return undefined;
    const counters = [...(rootRef.current?.querySelectorAll('[data-channels-kpi]') || [])];
    const tweens = counters.map((element) => {
      const target = Number(element.dataset.channelsKpi) || 0;
      const counter = { value: 0 };
      const render = () => { element.textContent = Math.round(counter.value).toLocaleString('pt-BR'); };
      render();
      return gsap.to(counter, { value: target, duration: 1, delay: 0.48, ease: 'power3.out', onUpdate: render, onComplete: render });
    });
    return () => tweens.forEach((tween) => tween.kill());
  }, [initialDataLoaded, providerCounts.connected, providerCounts.evolution, providerCounts.instagram, providerCounts.meta_cloud]);

  return (
    <div ref={rootRef} className={`content-wrapper channels-page ${initialDataLoaded ? 'is-ready' : 'is-loading'}`} aria-busy={!initialDataLoaded}>
      <div className="channels-cursor-glow" aria-hidden="true" />
      <div className="channels-ambient-orbit channels-ambient-orbit--one" aria-hidden="true" />
      <div className="channels-ambient-orbit channels-ambient-orbit--two" aria-hidden="true" />
      {!initialDataLoaded && <div className="channels-loading-overlay" role="status" aria-live="polite"><span><Link2 size={20} aria-hidden="true" /></span><strong>Sincronizando canais…</strong><small>Carregando conexões e estados reais.</small></div>}

      {statusMsg && <div className="channels-toast" role="status" aria-live="polite"><Check size={16} aria-hidden="true" /><span>{statusMsg}</span><button type="button" onClick={() => setStatusMsg('')} aria-label="Fechar aviso"><X size={14} aria-hidden="true" /></button></div>}

      <header className="channels-page-header"><div><span className="channels-overline"><Sparkles size={13} aria-hidden="true" /> Central de Integrações</span><h1>Conectar Canais</h1><p>Valide credenciais, configure webhooks e acompanhe a saúde das conexões.</p></div><button type="button" className="channels-primary-action channels-animated-action" onClick={() => showAddForm ? closeForm() : openForm()}>{showAddForm ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}{showAddForm ? 'Fechar Configuração' : 'Conectar Canal'}</button></header>

      <section className="channels-metrics" aria-label="Resumo dos canais">
        <article className="channels-metric-card is-mint"><span><small>Conexões Ativas</small><strong data-channels-kpi={providerCounts.connected}>{providerCounts.connected}</strong><p>de {channels.length.toLocaleString('pt-BR')} canais cadastrados</p></span><i className="channels-metric-icon"><Activity size={18} aria-hidden="true" /></i></article>
        <article className="channels-metric-card is-blue"><span><small>Evolution API</small><strong data-channels-kpi={providerCounts.evolution}>{providerCounts.evolution}</strong><p>instâncias de WhatsApp</p></span><i className="channels-metric-icon"><MessageCircle size={18} aria-hidden="true" /></i></article>
        <article className="channels-metric-card is-cyan"><span><small>WhatsApp Oficial</small><strong data-channels-kpi={providerCounts.meta_cloud}>{providerCounts.meta_cloud}</strong><p>números pela Cloud API</p></span><i className="channels-metric-icon"><Smartphone size={18} aria-hidden="true" /></i></article>
        <article className="channels-metric-card is-lime"><span><small>Instagram</small><strong data-channels-kpi={providerCounts.instagram}>{providerCounts.instagram}</strong><p>contas profissionais</p></span><i className="channels-metric-icon"><Camera size={18} aria-hidden="true" /></i></article>
      </section>

      <section className="channels-provider-section"><header className="channels-section-header"><div><span>Escolha o Provedor</span><h2>Integrações Disponíveis</h2><p>O teste acontece antes de qualquer credencial ser salva.</p></div></header><div className="channels-provider-grid">{Object.entries(PROVIDERS).map(([id, provider]) => { const Icon = provider.icon; return <button key={id} type="button" className={`channels-provider-card is-${provider.accent} channels-animated-action`} onClick={() => openForm(id)}><span className="channels-provider-icon"><Icon size={20} aria-hidden="true" /></span><div><small>{provider.shortLabel}</small><strong>{provider.label}</strong><p>{provider.description}</p></div><span className="channels-provider-availability"><i /> Disponível</span></button>; })}</div></section>

      {showAddForm && (
        <section ref={formRef} className="channels-config-panel" aria-labelledby="channels-config-title">
          <header className="channels-form-reveal"><span className="channels-config-icon">{(() => { const Icon = getProvider(providerType).icon; return <Icon size={20} aria-hidden="true" />; })()}</span><div><small>Configuração Segura</small><h2 id="channels-config-title">Conectar {getProvider(providerType).label}</h2><p>As credenciais serão validadas antes de salvar o canal.</p></div><button type="button" onClick={closeForm} aria-label="Fechar configuração"><X size={17} aria-hidden="true" /></button></header>
          <div className="channels-provider-switch channels-form-reveal" role="radiogroup" aria-label="Tipo de conexão">{Object.entries(PROVIDERS).map(([id, provider]) => { const Icon = provider.icon; return <button key={id} type="button" role="radio" aria-checked={providerType === id} className={`channels-animated-action ${providerType === id ? 'is-active' : ''}`} onClick={() => selectProvider(id)}><Icon size={15} aria-hidden="true" />{provider.label}</button>; })}</div>
          <form onSubmit={handleConnect}>
            <div className="channels-form-field channels-form-reveal"><label htmlFor="channel-name">Nome da Conexão</label><input id="channel-name" name="channel_name" type="text" value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="Ex.: WhatsApp Comercial…" autoComplete="off" required /></div>

            {providerType === 'evolution' ? <>
              <div className="channels-form-field channels-form-reveal"><label htmlFor="evolution-server">Servidor Evolution API</label><div className="channels-readonly-field"><Server size={15} aria-hidden="true" /><input id="evolution-server" name="evolution_server" type="url" readOnly value={DEFAULT_EVOLUTION_URL} /><span>Gerenciado</span></div></div>
              <div className="channels-form-grid channels-form-reveal"><div className="channels-form-field"><label htmlFor="evolution-instance">Nome da Instância</label><input id="evolution-instance" name="evolution_instance" type="text" value={evoInstance} onChange={(event) => setEvoInstance(event.target.value)} placeholder="Ex.: comercial01…" autoComplete="off" spellCheck={false} required /></div><div className="channels-form-field"><label htmlFor="evolution-key">Global API Key</label><div className="channels-secret-field"><KeyRound size={15} aria-hidden="true" /><input id="evolution-key" name="evolution_api_key" type={showSecret ? 'text' : 'password'} value={evoApiKey} onChange={(event) => setEvoApiKey(event.target.value)} placeholder="Cole a API key…" autoComplete="new-password" spellCheck={false} required /><button type="button" onClick={() => setShowSecret((current) => !current)} aria-label={showSecret ? 'Ocultar API key' : 'Mostrar API key'}>{showSecret ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}</button></div></div></div>
            </> : <>
              <div className="channels-form-grid channels-form-reveal"><div className="channels-form-field"><label htmlFor="meta-resource-id">{providerType === 'instagram' ? 'Instagram Account ID' : 'Phone Number ID'}</label><input id="meta-resource-id" name="meta_resource_id" type="text" inputMode="numeric" value={metaResourceId} onChange={(event) => setMetaResourceId(event.target.value)} placeholder={providerType === 'instagram' ? 'Ex.: 17841400000000000…' : 'Ex.: 123456789012345…'} autoComplete="off" spellCheck={false} required /></div><div className="channels-form-field"><label htmlFor="meta-access-token">{providerType === 'instagram' ? 'Page Access Token' : 'Token Permanente da Meta'}</label><div className="channels-secret-field"><KeyRound size={15} aria-hidden="true" /><input id="meta-access-token" name="meta_access_token" type={showSecret ? 'text' : 'password'} value={metaToken} onChange={(event) => setMetaToken(event.target.value)} placeholder="Cole o token de acesso…" autoComplete="new-password" spellCheck={false} required /><button type="button" onClick={() => setShowSecret((current) => !current)} aria-label={showSecret ? 'Ocultar token' : 'Mostrar token'}>{showSecret ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}</button></div></div></div>
            </>}

            <div className="channels-form-field channels-form-reveal"><label htmlFor="channel-webhook">Webhook de Entrada</label><div className="channels-readonly-field"><Webhook size={15} aria-hidden="true" /><input id="channel-webhook" name="channel_webhook" type="url" readOnly value={getProvider(providerType).webhook} /><button type="button" onClick={() => handleCopyWebhook(getProvider(providerType).webhook)} aria-label="Copiar webhook"><Copy size={14} aria-hidden="true" /></button></div><small>{providerType === 'evolution' ? 'Configurado automaticamente após a validação.' : 'Cadastre este endereço no painel de desenvolvedores da Meta.'}</small></div>

            <div className="channels-security-note channels-form-reveal"><ShieldCheck size={17} aria-hidden="true" /><div><strong>Teste Antes de Salvar</strong><p>O CRM consulta o provedor, confirma o identificador e só então registra o canal.</p></div></div>
            <footer className="channels-form-reveal"><button type="button" className="channels-secondary-action channels-animated-action" onClick={closeForm} disabled={submitting}>Cancelar</button><button type="submit" className="channels-primary-action channels-animated-action" disabled={submitting}><Zap size={15} aria-hidden="true" />{submitting ? 'Testando Conexão…' : 'Testar & Conectar'}</button></footer>
          </form>

          {connectionResult && <div ref={resultRef} className={`channels-connection-result is-${connectionResult.type}`} role="status" aria-live="polite"><span>{connectionResult.type === 'success' ? <Check size={18} aria-hidden="true" /> : <AlertCircle size={18} aria-hidden="true" />}</span><div><strong>{connectionResult.title}</strong><p>{connectionResult.message}</p>{connectionResult.detail && <small>{connectionResult.detail}</small>}{connectionResult.webhookUrl && <code translate="no">{connectionResult.webhookUrl}</code>}</div></div>}
        </section>
      )}

      <section className="channels-list-section"><header className="channels-section-header"><div><span>Ambiente Atual</span><h2>Canais Cadastrados</h2><p>Conexões isoladas para o cliente em visualização.</p></div><button type="button" className="channels-secondary-action channels-animated-action" onClick={handleRefresh} disabled={isRefreshing}><RefreshCw size={14} aria-hidden="true" />{isRefreshing ? 'Atualizando…' : 'Atualizar Estados'}</button></header>
        {channels.length > 0 ? <div className="channels-list-grid">{channels.map((channel) => { const provider = getProvider(channel.provider); const Icon = provider.icon; const connected = channel.status === 'connected' || channel.status === 'active'; const webhookUrl = channel.webhookUrl || provider.webhook; const channelBusy = busyChannelIds.has(channel.id); return <article key={channel.id} className={`channels-channel-card is-${provider.accent} ${connected ? 'is-connected' : 'is-disconnected'}`}><header><span className="channels-channel-icon"><Icon size={19} aria-hidden="true" /></span><div><small>{provider.label}</small><h3>{channel.name || 'Canal sem nome'}</h3></div><span className={`channels-status-pill ${connected ? 'is-connected' : 'is-disconnected'}`}><i />{STATUS_LABELS[channel.status] || channel.status || 'Sem estado'}</span></header><dl>{channel.provider === 'evolution' ? <><div><dt>Instância</dt><dd><code translate="no">{channel.instance || 'Não informada'}</code></dd></div><div><dt>Servidor</dt><dd>{channel.url || DEFAULT_EVOLUTION_URL}</dd></div></> : <div><dt>{channel.provider === 'instagram' ? 'Instagram Account ID' : 'Phone Number ID'}</dt><dd><code translate="no">{channel.phoneId || 'Não informado'}</code></dd></div>}<div><dt>Webhook</dt><dd>{webhookUrl || 'Não configurado'}</dd></div></dl><footer>{channel.provider !== 'evolution' && <button type="button" className="channels-card-action channels-animated-action" onClick={() => handleToggleChannel(channel)} disabled={channelBusy}>{channelBusy ? 'Atualizando…' : connected ? 'Desativar' : 'Ativar'}</button>}<button type="button" className="channels-icon-action channels-animated-action" onClick={() => handleCopyWebhook(webhookUrl)} aria-label={`Copiar webhook de ${channel.name}`}><Copy size={14} aria-hidden="true" /></button><button type="button" className="channels-icon-action is-danger channels-animated-action" onClick={() => setConfirmation({ id: channel.id, name: channel.name, busy: false })} aria-label={`Excluir canal ${channel.name}`}><Trash2 size={14} aria-hidden="true" /></button></footer></article>; })}</div> : <div className="channels-empty-state"><span><Globe2 size={26} aria-hidden="true" /></span><h3>Nenhum canal conectado</h3><p>Escolha um provedor e valide as credenciais para começar.</p><button type="button" className="channels-primary-action channels-animated-action" onClick={() => openForm()}><Plus size={15} aria-hidden="true" /> Conectar Primeiro Canal</button></div>}
      </section>

      <section className="channels-webhooks-section"><header className="channels-section-header"><div><span>Roteamento de Mensagens</span><h2>Webhooks de Entrada</h2><p>Use o endereço correspondente ao provedor configurado.</p></div></header><div className="channels-webhook-grid">{Object.entries(PROVIDERS).map(([id, provider]) => { const Icon = provider.icon; return <article key={id}><span><Icon size={16} aria-hidden="true" /></span><div><small>{provider.label}</small><code translate="no">{provider.webhook || 'Não configurado neste ambiente'}</code></div><button type="button" className="channels-icon-action channels-animated-action" onClick={() => handleCopyWebhook(provider.webhook)} aria-label={`Copiar webhook de ${provider.label}`} disabled={!provider.webhook}><Copy size={14} aria-hidden="true" /></button></article>; })}</div></section>

      {confirmation && <div className="channels-confirm-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !confirmation.busy && setConfirmation(null)}><section className="channels-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="channels-confirm-title" aria-describedby="channels-confirm-description"><span><Trash2 size={20} aria-hidden="true" /></span><h2 id="channels-confirm-title">Excluir Este Canal?</h2><p id="channels-confirm-description">A conexão “{confirmation.name || 'sem nome'}” será removida deste cliente. Novas mensagens desse canal deixarão de aparecer.</p><div><button type="button" className="channels-secondary-action" onClick={() => setConfirmation(null)} disabled={confirmation.busy}>Manter Canal</button><button type="button" className="channels-danger-action" onClick={handleConfirmDelete} disabled={confirmation.busy}>{confirmation.busy ? 'Excluindo…' : 'Excluir Canal'}</button></div></section></div>}
    </div>
  );
}
