import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { AlertCircle, Bot, Check, Clock3, Layers3, MessageSquareText, Save, Sparkles, X } from 'lucide-react';
import * as followUpService from '../services/followUpService';

const KANBAN_STAGES = [
  { value: 'new', label: 'Novo Lead' },
  { value: 'contacted', label: 'Em Contato' },
  { value: 'proposal', label: 'Tem Interesse' },
  { value: 'won', label: 'Venda Ganha' },
  { value: 'lost', label: 'Perdido' },
];

const initialRuleState = (rule) => {
  const totalHours = Number(rule?.delay_hours) || 0;
  const hours = rule ? Math.floor(totalHours) : 24;
  const minutes = rule ? Math.round((totalHours - hours) * 60) : 0;
  return {
    name: rule?.name || '',
    triggerEvent: rule?.trigger_event || 'last_message_in',
    delayHours: hours,
    delayMinutes: minutes,
    useMinutes: minutes > 0,
    message: rule?.message || '',
    selectedChannels: rule?.channel_ids || [],
    selectedStages: rule?.pipeline_stages || [],
    stopOnReply: rule?.stop_on_reply ?? true,
    maxAttempts: rule?.max_attempts || 1,
  };
};

export default function FollowUpRuleModal({ rule, channels = [], onClose, onSaveSuccess }) {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const messageRef = useRef(null);
  const initial = initialRuleState(rule);
  const [name, setName] = useState(initial.name);
  const [triggerEvent, setTriggerEvent] = useState(initial.triggerEvent);
  const [delayHoursInput, setDelayHoursInput] = useState(initial.delayHours);
  const [delayMinutesInput, setDelayMinutesInput] = useState(initial.delayMinutes);
  const [useMinutes, setUseMinutes] = useState(initial.useMinutes);
  const [message, setMessage] = useState(initial.message);
  const [selectedChannels, setSelectedChannels] = useState(initial.selectedChannels);
  const [selectedStages, setSelectedStages] = useState(initial.selectedStages);
  const [stopOnReply, setStopOnReply] = useState(initial.stopOnReply);
  const [maxAttempts, setMaxAttempts] = useState(initial.maxAttempts);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleToggleChannel = (channelId) => setSelectedChannels((current) => current.includes(channelId)
    ? current.filter((id) => id !== channelId)
    : [...current, channelId]);

  const handleToggleStage = (stage) => setSelectedStages((current) => current.includes(stage)
    ? current.filter((value) => value !== stage)
    : [...current, stage]);

  const insertVariable = (variable) => {
    const textarea = messageRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setMessage((current) => `${current.substring(0, start)}${variable}${current.substring(end)}`);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('Informe um nome para identificar a regra.');
      return;
    }
    if (!message.trim()) {
      setErrorMsg('Escreva a mensagem que será enviada pelo Follow-Up.');
      return;
    }
    let totalDelay = Number(delayHoursInput) || 0;
    if (useMinutes) totalDelay += (Number(delayMinutesInput) || 0) / 60;
    if (totalDelay <= 0) {
      setErrorMsg('Defina um tempo de espera maior que 0 para continuar.');
      return;
    }

    setIsSaving(true);
    const payload = {
      name: name.trim(),
      trigger_event: triggerEvent,
      delay_hours: Number(totalDelay.toFixed(4)),
      message: message.trim(),
      channel_ids: selectedChannels,
      pipeline_stages: selectedStages,
      stop_on_reply: stopOnReply,
      max_attempts: Number(maxAttempts) || 1,
    };
    try {
      const result = rule
        ? await followUpService.updateRule(rule.id, payload)
        : await followUpService.createRule(payload);
      if (!result) throw new Error('Rule write was not persisted');
      await onSaveSuccess(result);
    } catch (error) {
      console.error('[FollowUpRuleModal] Save failed:', error);
      setErrorMsg('Não foi possível salvar a regra. Verifique a conexão e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, onClose]);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const dialog = dialogRef.current;
    if (!overlay || !dialog) return undefined;
    const context = gsap.context(() => {
      gsap.fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.22, ease: 'power2.out' });
      gsap.fromTo(dialog, { autoAlpha: 0, y: 26, scale: 0.955 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.42, ease: 'back.out(1.55)' });
      gsap.fromTo('.followup-modal-reveal', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.32, stagger: 0.035, delay: 0.12, ease: 'power3.out' });
    }, overlay);
    return () => context.revert();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const buttons = [...dialog.querySelectorAll('.followup-modal-action')];
    const cleanups = buttons.map((button) => {
      const enter = () => gsap.to(button, { y: -2, scale: 1.025, duration: 0.2, ease: 'back.out(2)', overwrite: 'auto' });
      const leave = () => gsap.to(button, { y: 0, scale: 1, duration: 0.24, ease: 'power3.out', overwrite: 'auto' });
      const down = () => gsap.to(button, { y: 0, scale: 0.96, duration: 0.1, overwrite: 'auto' });
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
  }, []);

  return (
    <div ref={overlayRef} className="followup-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && !isSaving && onClose()}>
      <section ref={dialogRef} className="followup-modal-container" role="dialog" aria-modal="true" aria-labelledby="followup-rule-modal-title">
        <header className="followup-modal-header">
          <span className="followup-modal-symbol"><Bot size={19} aria-hidden="true" /></span>
          <div><small>{rule ? 'Atualizar Automação' : 'Nova Automação'}</small><h2 id="followup-rule-modal-title">{rule ? 'Editar Regra de Follow-Up' : 'Criar Regra de Follow-Up'}</h2></div>
          <button type="button" className="followup-modal-close followup-modal-action" onClick={onClose} disabled={isSaving} aria-label="Fechar editor de regra"><X size={18} aria-hidden="true" /></button>
        </header>

        <form onSubmit={handleSave}>
          <section className="followup-modal-section followup-modal-reveal">
            <header><span><Sparkles size={14} aria-hidden="true" /></span><div><h3>Identidade & Gatilho</h3><p>Defina o evento que inicia esta jornada.</p></div></header>
            <div className="followup-modal-grid">
              <div className="followup-form-field is-wide"><label htmlFor="followup-rule-name">Nome da Regra</label><input id="followup-rule-name" name="followup_rule_name" type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Reengajamento após 24h…" autoComplete="off" required /></div>
              <div className="followup-form-field"><label htmlFor="followup-trigger-event">Gatilho de Ativação</label><select id="followup-trigger-event" name="followup_trigger_event" value={triggerEvent} onChange={(event) => setTriggerEvent(event.target.value)}><option value="last_message_in">Última mensagem recebida</option><option value="stage_entered">Entrada em uma etapa do funil</option><option value="contact_created">Novo contato criado</option></select></div>
              <div className="followup-form-field"><label htmlFor="followup-max-attempts">Máximo de Tentativas</label><input id="followup-max-attempts" name="followup_max_attempts" type="number" inputMode="numeric" min="1" max="5" value={maxAttempts} onChange={(event) => setMaxAttempts(event.target.value)} required /></div>
            </div>
          </section>

          <section className="followup-modal-section followup-modal-reveal">
            <header><span><Clock3 size={14} aria-hidden="true" /></span><div><h3>Tempo de Espera</h3><p>Escolha quanto tempo o contato ficará aguardando.</p></div></header>
            <div className="followup-delay-grid">
              <div className="followup-form-field"><label htmlFor="followup-delay-hours">Horas</label><input id="followup-delay-hours" name="followup_delay_hours" type="number" inputMode="numeric" min="0" value={delayHoursInput} onChange={(event) => setDelayHoursInput(Math.max(0, Number.parseInt(event.target.value, 10) || 0))} /></div>
              <label className="followup-check-option"><input type="checkbox" checked={useMinutes} onChange={(event) => setUseMinutes(event.target.checked)} /><span><Check size={12} aria-hidden="true" /></span><div><strong>Usar Minutos</strong><small>Ajuste mais preciso</small></div></label>
              {useMinutes && <div className="followup-form-field"><label htmlFor="followup-delay-minutes">Minutos</label><input id="followup-delay-minutes" name="followup_delay_minutes" type="number" inputMode="numeric" min="0" max="59" value={delayMinutesInput} onChange={(event) => setDelayMinutesInput(Math.min(59, Math.max(0, Number.parseInt(event.target.value, 10) || 0)))} /></div>}
            </div>
          </section>

          <section className="followup-modal-section followup-modal-reveal">
            <header><span><Layers3 size={14} aria-hidden="true" /></span><div><h3>Público da Regra</h3><p>Sem seleção, a regra vale para todos os canais e etapas.</p></div></header>
            <fieldset className="followup-choice-group"><legend>Canais Vinculados</legend><div className="followup-multiselect">{channels.map((channel) => { const selected = selectedChannels.includes(channel.id); return <button key={channel.id} type="button" className={`followup-multiselect-item followup-modal-action ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={() => handleToggleChannel(channel.id)}><span>{channel.name}</span><small>{channel.provider}</small>{selected && <Check size={13} aria-hidden="true" />}</button>; })}{channels.length === 0 && <p>Nenhum canal conectado. A regra será aplicada a todos.</p>}</div></fieldset>
            <fieldset className="followup-choice-group"><legend>Etapas do Funil</legend><div className="followup-multiselect">{KANBAN_STAGES.map((stage) => { const selected = selectedStages.includes(stage.value); return <button key={stage.value} type="button" className={`followup-multiselect-item followup-modal-action ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={() => handleToggleStage(stage.value)}><span>{stage.label}</span>{selected && <Check size={13} aria-hidden="true" />}</button>; })}</div></fieldset>
          </section>

          <section className="followup-modal-section followup-modal-reveal">
            <header><span><MessageSquareText size={14} aria-hidden="true" /></span><div><h3>Mensagem do Follow-Up</h3><p>Personalize o texto com variáveis dinâmicas.</p></div><small className="followup-character-count">{message.length.toLocaleString('pt-BR')} caracteres</small></header>
            <div className="followup-form-field"><label htmlFor="rule-message-textarea">Mensagem</label><textarea ref={messageRef} id="rule-message-textarea" name="followup_rule_message" rows="5" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva a mensagem que será enviada…" autoComplete="off" required /></div>
            <div className="followup-chips-container"><span>Inserir Variável</span><button type="button" className="followup-chip followup-modal-action" onClick={() => insertVariable('{{contact_name}}')}>Nome do Contato</button><button type="button" className="followup-chip followup-modal-action" onClick={() => insertVariable('{{agent_name}}')}>Nome do Operador</button><button type="button" className="followup-chip followup-modal-action" onClick={() => insertVariable('{{company_name}}')}>Nome da Empresa</button></div>
          </section>

          <label className="followup-stop-option followup-modal-reveal"><div><strong>Parar Quando o Contato Responder</strong><small>Cancela disparos pendentes assim que uma resposta for recebida.</small></div><span className="followup-switch"><input type="checkbox" checked={stopOnReply} onChange={(event) => setStopOnReply(event.target.checked)} aria-label="Cancelar disparos quando o contato responder" /><span className="followup-switch-slider" aria-hidden="true" /></span></label>

          {errorMsg && <div className="followup-modal-error followup-modal-reveal" role="alert"><AlertCircle size={17} aria-hidden="true" /><span>{errorMsg}</span></div>}

          <footer className="followup-modal-footer followup-modal-reveal"><button type="button" className="followup-secondary-action followup-modal-action" onClick={onClose} disabled={isSaving}>Cancelar</button><button type="submit" className="followup-primary-action followup-modal-action" disabled={isSaving}><Save size={15} aria-hidden="true" />{isSaving ? 'Salvando…' : rule ? 'Salvar Alterações' : 'Criar Regra'}</button></footer>
        </form>
      </section>
    </div>
  );
}
