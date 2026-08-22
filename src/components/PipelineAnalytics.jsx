import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import {
  Activity,
  Bot,
  Camera,
  ChevronRight,
  CircleGauge,
  GitBranch,
  MessageCircle,
  Radio,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

const STAGES = [
  { id: 'new', label: 'Novos Leads', short: 'NL', color: '#32d9aa' },
  { id: 'no_answer', label: 'Sem Resposta', short: 'SR', color: '#ff9d4d' },
  { id: 'contacted', label: 'Em Contato', short: 'EC', color: '#36bff3' },
  { id: 'proposal', label: 'Tem Interesse', short: 'TI', color: '#c7f36b' },
  { id: 'won', label: 'Vendas Ganhas', short: 'VG', color: '#55dfa2' },
  { id: 'lost', label: 'Perdidos', short: 'PD', color: '#ff6b78' },
];

const integerFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

function AnalyticsHeader({ overline, title, description, icon: Icon, badge }) {
  return (
    <header className="pipeline-analytics-card-header">
      <span className="pipeline-analytics-card-icon"><Icon size={17} aria-hidden="true" /></span>
      <span className="pipeline-analytics-card-title">
        <small>{overline}</small>
        <strong>{title}</strong>
        <p>{description}</p>
      </span>
      {badge && <span className="pipeline-analytics-badge"><i aria-hidden="true" />{badge}</span>}
    </header>
  );
}

export default function PipelineAnalytics({ contacts = [], initialDataLoaded }) {
  const rootRef = useRef(null);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [activeDonutIndex, setActiveDonutIndex] = useState(0);

  const stageData = useMemo(() => {
    const total = contacts.length;
    const maxCount = Math.max(1, ...STAGES.map((stage) => contacts.filter((contact) => contact.status === stage.id).length));
    return STAGES.map((stage, index) => {
      const count = contacts.filter((contact) => contact.status === stage.id).length;
      return {
        ...stage,
        count,
        share: total > 0 ? Math.round((count / total) * 100) : 0,
        fill: (count / maxCount) * 100,
        shape: Math.max(44, 100 - index * 8.5),
      };
    });
  }, [contacts]);

  const totalContacts = contacts.length;
  const activeLeads = contacts.filter((contact) => !['won', 'lost'].includes(contact.status)).length;

  const donutSegments = useMemo(() => {
    const circumference = 2 * Math.PI * 42;
    return stageData.reduce((segments, stage) => {
      const length = totalContacts > 0 ? (stage.count / totalContacts) * circumference : 0;
      const previous = segments[segments.length - 1];
      const offset = previous ? previous.offset + previous.length : 0;
      const segment = { ...stage, length, offset, circumference };
      return [...segments, segment];
    }, []);
  }, [stageData, totalContacts]);

  const channelData = useMemo(() => {
    const channels = [
      { id: 'whatsapp', label: 'WhatsApp', color: '#32d9aa', icon: MessageCircle },
      { id: 'telegram', label: 'Instagram', color: '#e55ca8', icon: Camera },
      { id: 'webchat', label: 'TikTok', color: '#36bff3', icon: Radio },
    ];
    return channels.map((channel) => {
      const count = contacts.filter((contact) => contact.channel === channel.id || (channel.id === 'webchat' && contact.channel === 'web')).length;
      return { ...channel, count, share: totalContacts > 0 ? Math.round((count / totalContacts) * 100) : 0 };
    });
  }, [contacts, totalContacts]);

  const aiStats = useMemo(() => {
    let botMessages = 0;
    let humanMessages = 0;
    let totalLatency = 0;
    let latencySamples = 0;
    contacts.forEach((contact) => {
      const messages = contact.messages || [];
      messages.forEach((message) => {
        if (message.sender === 'bot') botMessages += 1;
        if (message.sender === 'agent') humanMessages += 1;
      });
      if ((contact.tags || []).includes('IA Inativa')) return;
      for (let index = 0; index < messages.length - 1; index += 1) {
        const current = messages[index];
        const next = messages[index + 1];
        if (current.sender !== 'client' || next.sender !== 'bot') continue;
        const latency = new Date(next.timestamp) - new Date(current.timestamp);
        if (latency > 0 && latency < 30000) {
          totalLatency += latency;
          latencySamples += 1;
        }
      }
    });
    const totalOutbound = botMessages + humanMessages;
    return {
      botMessages,
      humanMessages,
      automationRate: totalOutbound > 0 ? Math.round((botMessages / totalOutbound) * 100) : 0,
      latency: latencySamples > 0 ? `${(totalLatency / latencySamples / 1000).toFixed(1)}s` : '—',
    };
  }, [contacts]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !initialDataLoaded) return undefined;
    const context = gsap.context(() => {
      const cards = gsap.utils.toArray('.pipeline-analytics-card');
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
      timeline
        .fromTo(cards, { autoAlpha: 0, y: 24, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.52, stagger: 0.08, clearProps: 'transform,opacity,visibility' })
        .fromTo('.pipeline-funnel-fill', { scaleX: 0 }, { scaleX: 1, duration: 0.58, stagger: 0.055, transformOrigin: 'left center' }, '-=0.3')
        .fromTo('.pipeline-donut-motion', { autoAlpha: 0, scale: 0.78, rotation: -12 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.72, ease: 'back.out(1.5)', transformOrigin: 'center', clearProps: 'transform,opacity,visibility' }, '-=0.5')
        .fromTo('.pipeline-channel-fill', { scaleX: 0 }, { scaleX: 1, duration: 0.54, stagger: 0.1, transformOrigin: 'left center' }, '-=0.44')
        .fromTo('.pipeline-ai-ring-motion', { autoAlpha: 0, scale: 0.78, rotation: -18 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.65, ease: 'back.out(1.6)', transformOrigin: 'center', clearProps: 'transform,opacity,visibility' }, '-=0.48');
    }, root);
    return () => context.revert();
  }, [initialDataLoaded]);

  const activeStage = stageData[activeStageIndex] || stageData[0];
  const activeDonut = donutSegments[activeDonutIndex] || donutSegments[0];
  const aiCircumference = 2 * Math.PI * 42;
  const handleDonutKeyDown = (event, index) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setActiveDonutIndex(index);
  };

  return (
    <section ref={rootRef} className="pipeline-analytics-grid" aria-label="Análises do funil">
      <article className="pipeline-analytics-card pipeline-funnel-card">
        <AnalyticsHeader overline="Jornada Comercial" title="Conversão do Funil" description="Volume e retenção entre as etapas do CRM." icon={GitBranch} badge={`${activeLeads} ativos`} />
        <div className="pipeline-funnel-summary">
          <span><small>Etapa em análise</small><strong style={{ color: activeStage.color }}>{activeStage.label}</strong></span>
          <span><small>Participação</small><strong>{activeStage.share}%</strong></span>
          <span><small>Leads</small><strong>{integerFormatter.format(activeStage.count)}</strong></span>
        </div>
        <div className="pipeline-funnel-modern" aria-label="Etapas do funil">
          {stageData.map((stage, index) => (
            <button
              key={stage.id}
              type="button"
              className={activeStageIndex === index ? 'is-active' : ''}
              style={{ '--stage-color': stage.color, '--stage-shape': `${stage.shape}%`, '--stage-fill': `${stage.fill}%` }}
              onPointerEnter={() => setActiveStageIndex(index)}
              onFocus={() => setActiveStageIndex(index)}
              onClick={() => setActiveStageIndex(index)}
              aria-label={`${stage.label}: ${stage.count} leads, ${stage.share}% do total`}
            >
              <span className="pipeline-funnel-code">{stage.short}</span>
              <span className="pipeline-funnel-track"><i className="pipeline-funnel-fill" /><strong>{stage.label}</strong></span>
              <span className="pipeline-funnel-value">{stage.count}<ChevronRight size={13} aria-hidden="true" /></span>
            </button>
          ))}
        </div>
      </article>

      <article className="pipeline-analytics-card pipeline-donut-card">
        <AnalyticsHeader overline="Distribuição" title="Pizza de Leads" description="Participação de cada etapa na base filtrada." icon={CircleGauge} badge={`${totalContacts} leads`} />
        <div className="pipeline-donut-layout">
          <div className="pipeline-donut-chart">
            <svg className="pipeline-donut-motion" viewBox="0 0 110 110" role="img" aria-label={`Distribuição do funil. ${activeDonut.label}: ${activeDonut.share}%`}>
              <circle className="pipeline-donut-track" cx="55" cy="55" r="42" />
              {donutSegments.map((segment, index) => (
                <circle
                  key={segment.id}
                  className={`pipeline-donut-segment ${activeDonutIndex === index ? 'is-active' : ''}`}
                  cx="55"
                  cy="55"
                  r="42"
                  stroke={segment.color}
                  strokeDasharray={`${segment.length} ${segment.circumference - segment.length}`}
                  strokeDashoffset={-segment.offset}
                  role="button"
                  tabIndex="0"
                  aria-label={`${segment.label}: ${segment.count} leads, ${segment.share}% do total`}
                  onPointerEnter={() => setActiveDonutIndex(index)}
                  onFocus={() => setActiveDonutIndex(index)}
                  onClick={() => setActiveDonutIndex(index)}
                  onKeyDown={(event) => handleDonutKeyDown(event, index)}
                />
              ))}
            </svg>
            <span className="pipeline-donut-center"><small>{activeDonut.label}</small><strong>{activeDonut.share}%</strong><em>{activeDonut.count} leads</em></span>
          </div>
          <div className="pipeline-donut-legend" aria-label="Legenda da distribuição">
            {donutSegments.map((segment, index) => (
              <button key={segment.id} type="button" className={activeDonutIndex === index ? 'is-active' : ''} onPointerEnter={() => setActiveDonutIndex(index)} onFocus={() => setActiveDonutIndex(index)} onClick={() => setActiveDonutIndex(index)}>
                <i style={{ background: segment.color }} aria-hidden="true" />
                <span><strong>{segment.label}</strong><small>{segment.share}% do total</small></span>
                <b>{segment.count}</b>
              </button>
            ))}
          </div>
        </div>
      </article>

      <article className="pipeline-analytics-card pipeline-channel-card">
        <AnalyticsHeader overline="Aquisição" title="Desempenho dos Canais" description="Origem das oportunidades no período selecionado." icon={Radio} badge="Tempo real" />
        <div className="pipeline-channel-list">
          {channelData.map((channel) => {
            const Icon = channel.icon;
            return (
              <div key={channel.id} className="pipeline-channel-row" style={{ '--channel-color': channel.color }}>
                <span className="pipeline-channel-icon"><Icon size={17} aria-hidden="true" /></span>
                <span className="pipeline-channel-copy"><strong>{channel.label}</strong><small>{channel.count} {channel.count === 1 ? 'lead identificado' : 'leads identificados'}</small></span>
                <span className="pipeline-channel-share">{channel.share}%</span>
                <span className="pipeline-channel-track" aria-hidden="true"><i className="pipeline-channel-fill" style={{ width: `${channel.share}%` }} /></span>
              </div>
            );
          })}
        </div>
        <div className="pipeline-channel-insight"><TrendingUp size={17} aria-hidden="true" /><span><strong>{[...channelData].sort((first, second) => second.count - first.count)[0]?.label || 'Sem canal principal'}</strong> concentra o maior volume da base atual.</span></div>
      </article>

      <article className="pipeline-analytics-card pipeline-ai-card">
        <AnalyticsHeader overline="Eficiência Operacional" title="Automação & IA" description="Participação do agente e transbordos humanos." icon={Bot} badge={aiStats.botMessages > 0 ? 'IA operando' : 'Sem interações'} />
        <div className="pipeline-ai-layout">
          <div className="pipeline-ai-ring">
            <svg className="pipeline-ai-ring-motion" viewBox="0 0 110 110" role="img" aria-label={`${aiStats.automationRate}% das respostas automatizadas`}>
              <circle className="pipeline-ai-ring-track" cx="55" cy="55" r="42" />
              <circle className="pipeline-ai-ring-value" cx="55" cy="55" r="42" strokeDasharray={`${(aiStats.automationRate / 100) * aiCircumference} ${aiCircumference}`} />
            </svg>
            <span><Sparkles size={15} aria-hidden="true" /><strong>{aiStats.automationRate}%</strong><small>automatizado</small></span>
          </div>
          <div className="pipeline-ai-stats">
            <div><span className="is-mint"><Bot size={16} aria-hidden="true" /></span><small>Interações da IA</small><strong>{integerFormatter.format(aiStats.botMessages)}</strong></div>
            <div><span className="is-blue"><Activity size={16} aria-hidden="true" /></span><small>Respostas humanas</small><strong>{integerFormatter.format(aiStats.humanMessages)}</strong></div>
            <div><span className="is-lime"><TrendingUp size={16} aria-hidden="true" /></span><small>Resposta média</small><strong>{aiStats.latency}</strong></div>
          </div>
        </div>
      </article>
    </section>
  );
}
