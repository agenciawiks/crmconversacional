import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import * as followUpService from '../services/followUpService';

export default function FollowUpRuleModal({ rule, channels, onClose, onSaveSuccess }) {
  const [name, setName] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('last_message_in');
  
  // Delay State
  const [delayHoursInput, setDelayHoursInput] = useState(24);
  const [delayMinutesInput, setDelayMinutesInput] = useState(0);
  const [useMinutes, setUseMinutes] = useState(false);

  const [message, setMessage] = useState('');
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [selectedStages, setSelectedStages] = useState([]);
  const [stopOnReply, setStopOnReply] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const KANBAN_STAGES = [
    { value: 'new', label: 'Novo' },
    { value: 'contacted', label: 'Contatado' },
    { value: 'proposal', label: 'Tem Interesse' },
    { value: 'won', label: 'Ganho' },
    { value: 'lost', label: 'Perdido' }
  ];

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setTriggerEvent(rule.trigger_event);
      
      // Convert delay_hours back to hours and minutes
      const totalHours = Number(rule.delay_hours) || 0;
      const hours = Math.floor(totalHours);
      const minutes = Math.round((totalHours - hours) * 60);
      setDelayHoursInput(hours);
      setDelayMinutesInput(minutes);
      setUseMinutes(minutes > 0);

      setMessage(rule.message);
      setSelectedChannels(rule.channel_ids || []);
      setSelectedStages(rule.pipeline_stages || []);
      setStopOnReply(rule.stop_on_reply);
      setMaxAttempts(rule.max_attempts || 1);
    } else {
      // Default values for new rule
      setName('');
      setTriggerEvent('last_message_in');
      setDelayHoursInput(24);
      setDelayMinutesInput(0);
      setUseMinutes(false);
      setMessage('');
      setSelectedChannels([]);
      setSelectedStages([]);
      setStopOnReply(true);
      setMaxAttempts(1);
    }
  }, [rule]);

  const handleToggleChannel = (channelId) => {
    setSelectedChannels(prev => 
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleToggleStage = (stageVal) => {
    setSelectedStages(prev => 
      prev.includes(stageVal)
        ? prev.filter(s => s !== stageVal)
        : [...prev, stageVal]
    );
  };

  const insertVariable = (variable) => {
    const textarea = document.getElementById('rule-message-textarea');
    if (!textarea) return;
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const before = message.substring(0, startPos);
    const after = message.substring(endPos, message.length);
    setMessage(before + variable + after);
    
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = startPos + variable.length;
    }, 50);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('O nome da regra é obrigatório.');
      return;
    }
    if (!message.trim()) {
      setErrorMsg('A mensagem do follow-up é obrigatória.');
      return;
    }

    // Compute delay hours decimal
    let totalDelay = Number(delayHoursInput) || 0;
    if (useMinutes) {
      totalDelay += (Number(delayMinutesInput) || 0) / 60;
    }
    if (totalDelay <= 0) {
      setErrorMsg('O delay de envio deve ser maior do que zero.');
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
      max_attempts: Number(maxAttempts) || 1
    };

    try {
      let result;
      if (rule) {
        result = await followUpService.updateRule(rule.id, payload);
      } else {
        result = await followUpService.createRule(payload);
      }

      if (result) {
        onSaveSuccess();
      } else {
        setErrorMsg('Erro ao salvar no banco. Verifique os dados ou a conexão.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro de comunicação com o Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="followup-modal-overlay">
      <div className="followup-modal-container">
        
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
            {rule ? 'Editar Regra de Follow-Up' : 'Criar Nova Regra de Follow-Up'}
          </h2>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-status-lost)', padding: '12px', borderRadius: 'var(--radius-md)', color: 'var(--color-status-lost)', fontSize: '13px' }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Rule Name */}
          <div className="followup-form-group">
            <label className="followup-form-label">Nome da Regra</label>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="Ex: Reengajamento 24h Pós-Mensagem"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Trigger Event & Max Attempts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="followup-form-group">
              <label className="followup-form-label">Gatilho de Ativação</label>
              <select 
                className="glass-input"
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
              >
                <option value="last_message_in">Última mensagem recebida</option>
                <option value="stage_entered">Entrou no estágio do Kanban</option>
                <option value="contact_created">Novo contato criado</option>
              </select>
            </div>
            
            <div className="followup-form-group">
              <label className="followup-form-label">Máx. Tentativas de Envio</label>
              <input 
                type="number" 
                className="glass-input"
                min="1"
                max="5"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Delay Settings */}
          <div className="followup-form-group">
            <label className="followup-form-label">Delay de Espera</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="number" 
                  className="glass-input"
                  style={{ width: '80px' }}
                  min="0"
                  value={delayHoursInput}
                  onChange={(e) => setDelayHoursInput(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Horas</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox"
                  id="checkbox-use-minutes"
                  checked={useMinutes}
                  onChange={(e) => setUseMinutes(e.target.checked)}
                />
                <label htmlFor="checkbox-use-minutes" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  incluir minutos
                </label>
              </div>

              {useMinutes && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="number" 
                    className="glass-input"
                    style={{ width: '80px' }}
                    min="0"
                    max="59"
                    value={delayMinutesInput}
                    onChange={(e) => setDelayMinutesInput(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Minutos</span>
                </div>
              )}
            </div>
          </div>

          {/* Channels Filter */}
          <div className="followup-form-group">
            <label className="followup-form-label">Canais Vinculados (Opcional - Vazio = Todos)</label>
            <div className="followup-multiselect">
              {channels.map(ch => {
                const isSelected = selectedChannels.includes(ch.id);
                return (
                  <div 
                    key={ch.id} 
                    className={`followup-multiselect-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleChannel(ch.id)}
                  >
                    <span>{ch.name}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      ({ch.provider})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kanban Stages Filter */}
          <div className="followup-form-group">
            <label className="followup-form-label">Filtrar por Estágios do Kanban (Opcional - Vazio = Todos)</label>
            <div className="followup-multiselect">
              {KANBAN_STAGES.map(stg => {
                const isSelected = selectedStages.includes(stg.value);
                return (
                  <div 
                    key={stg.value} 
                    className={`followup-multiselect-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleStage(stg.value)}
                  >
                    <span>{stg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Text message template */}
          <div className="followup-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="followup-form-label">Mensagem do Follow-Up</label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{message.length} caracteres</span>
            </div>
            <textarea 
              id="rule-message-textarea"
              className="node-textarea"
              style={{ minHeight: '120px', padding: '12px', fontSize: '13px', lineHeight: '1.5' }}
              placeholder="Digite o texto da mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            {/* Variables Chips */}
            <div className="followup-chips-container">
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '6px' }}>Inserir Variável:</span>
              <button type="button" className="followup-chip" onClick={() => insertVariable('{{contact_name}}')}>Nome do Contato</button>
              <button type="button" className="followup-chip" onClick={() => insertVariable('{{agent_name}}')}>Nome do Operador</button>
              <button type="button" className="followup-chip" onClick={() => insertVariable('{{company_name}}')}>Nome da Empresa</button>
            </div>
          </div>

          {/* Stop on reply Toggle Switch */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '12px 16px', 
            background: 'var(--bg-surface-hover)', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-glass)' 
          }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: '600', display: 'block', color: 'var(--text-primary)' }}>Parar ao Responder</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cancelar follow-ups agendados se o contato responder antes</span>
            </div>
            <label className="followup-switch">
              <input 
                type="checkbox" 
                checked={stopOnReply}
                onChange={(e) => setStopOnReply(e.target.checked)}
              />
              <span className="followup-switch-slider"></span>
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px', marginTop: '10px' }}>
            <button 
              type="button" 
              className="glass-btn" 
              onClick={onClose}
              style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', background: 'none', color: 'var(--text-secondary)', border: '1px solid var(--border-glass)', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="glass-btn"
              style={{
                padding: '10px 24px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-primary)',
                color: '#fff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                opacity: isSaving ? 0.7 : 1,
                boxShadow: '0 4px 12px var(--accent-glow)'
              }}
            >
              <Save size={16} />
              {isSaving ? 'Salvando...' : 'Salvar Regra'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
