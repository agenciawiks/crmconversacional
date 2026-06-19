import React, { useState, useEffect } from 'react';
import { useCrm } from '../context/CrmContext';
import { 
  Clock, 
  Plus, 
  Trash2, 
  Edit2, 
  Settings, 
  Layers, 
  Send, 
  AlertCircle, 
  Check, 
  X, 
  Calendar,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import FollowUpRuleModal from './FollowUpRuleModal';
import * as followUpService from '../services/followUpService';

export default function FollowUpSettings() {
  const { 
    channels, 
    contacts
  } = useCrm();

  // Tab State
  const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'queue' | 'settings'

  // Rules and Queue State
  const [rules, setRules] = useState([]);
  const [queue, setQueue] = useState([]);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [companyName, setCompanyName] = useState('Minha Empresa');

  // UI States
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSetting, setIsSavingSetting] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedRules, fetchedQueue, fetchedSettings] = await Promise.all([
        followUpService.fetchRules(),
        followUpService.fetchQueue(),
        followUpService.fetchSettings()
      ]);

      setRules(fetchedRules);
      setQueue(fetchedQueue);

      const globalEnabledSetting = fetchedSettings.find(s => s.key === 'followup_global_enabled');
      const companyNameSetting = fetchedSettings.find(s => s.key === 'company_name');

      if (globalEnabledSetting) {
        setGlobalEnabled(globalEnabledSetting.value === 'true');
      }
      if (companyNameSetting) {
        setCompanyName(companyNameSetting.value || 'Minha Empresa');
      }
    } catch (err) {
      console.error('[FollowUpSettings] Error loading data:', err);
      showStatus('error', 'Erro ao carregar dados do módulo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg({ type: '', text: '' });
    }, 4000);
  };

  const handleToggleGlobal = async () => {
    const newValue = !globalEnabled;
    setGlobalEnabled(newValue);
    try {
      await followUpService.updateSetting('followup_global_enabled', String(newValue));
      showStatus('success', `Módulo de Follow-Up ${newValue ? 'ativado' : 'pausado'} globalmente!`);
    } catch (err) {
      console.error(err);
      setGlobalEnabled(!newValue);
      showStatus('error', 'Falha ao atualizar status global.');
    }
  };

  const handleToggleRuleActive = async (ruleId, currentActive) => {
    try {
      const updated = await followUpService.updateRule(ruleId, { is_active: !currentActive });
      if (updated) {
        setRules(prev => prev.map(r => r.id === ruleId ? { ...r, is_active: !currentActive } : r));
        showStatus('success', `Regra ${!currentActive ? 'ativada' : 'pausada'} com sucesso.`);
      }
    } catch (err) {
      console.error(err);
      showStatus('error', 'Erro ao alterar status da regra.');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta regra de follow-up? Isso também removerá os agendamentos pendentes dela.')) {
      return;
    }

    try {
      const success = await followUpService.deleteRule(ruleId);
      if (success) {
        setRules(prev => prev.filter(r => r.id !== ruleId));
        // Remove from queue in local state as well
        setQueue(prev => prev.filter(q => q.rule_id !== ruleId));
        showStatus('success', 'Regra de follow-up excluída com sucesso.');
      } else {
        showStatus('error', 'Falha ao excluir a regra.');
      }
    } catch (err) {
      console.error(err);
      showStatus('error', 'Erro ao deletar regra.');
    }
  };

  const handleCancelQueueItem = async (itemId) => {
    if (!window.confirm('Deseja realmente cancelar este agendamento na fila?')) {
      return;
    }

    try {
      const updated = await followUpService.cancelQueueItem(itemId, 'manual_cancel');
      if (updated) {
        setQueue(prev => prev.map(q => q.id === itemId ? { ...q, status: 'cancelled', cancel_reason: 'manual_cancel' } : q));
        showStatus('success', 'Agendamento cancelado com sucesso.');
      }
    } catch (err) {
      console.error(err);
      showStatus('error', 'Erro ao cancelar o agendamento.');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSetting(true);
    try {
      await followUpService.updateSetting('company_name', companyName.trim());
      showStatus('success', 'Configurações de variáveis salvas com sucesso!');
    } catch (err) {
      console.error(err);
      showStatus('error', 'Falha ao salvar as configurações.');
    } finally {
      setIsSavingSetting(false);
    }
  };

  const formatDelay = (delayHours) => {
    const hours = Math.floor(delayHours);
    const minutes = Math.round((delayHours - hours) * 60);
    
    let parts = [];
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (minutes > 0) {
      parts.push(`${minutes}min`);
    }
    return parts.join(' e ') || '0min';
  };

  const getTriggerLabel = (event) => {
    switch (event) {
      case 'last_message_in':
        return 'Última mensagem recebida';
      case 'stage_entered':
        return 'Entrou no estágio do Kanban';
      case 'contact_created':
        return 'Novo contato criado';
      default:
        return event;
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="content-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="pulsing-dot" style={{ width: '12px', height: '12px' }}></div>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Carregando módulo de Follow-Up...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="content-wrapper animated-fade-in" style={{ height: '100%', overflowY: 'auto', padding: '24px 32px' }}>
      
      {/* Status Bar Notification */}
      {statusMsg.text && (
        <div className="builder-alert-bar animated-fade-in" style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 1000,
          background: 'var(--bg-surface-solid)',
          border: `1px solid ${statusMsg.type === 'success' ? 'var(--color-status-won)' : 'var(--color-status-lost)'}`,
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {statusMsg.type === 'success' ? (
            <Check size={18} style={{ color: 'var(--color-status-won)' }} />
          ) : (
            <X size={18} style={{ color: 'var(--color-status-lost)' }} />
          )}
          <span style={{ fontWeight: '500', fontSize: '13px' }}>{statusMsg.text}</span>
        </div>
      )}

      {/* Header section */}
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="page-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'var(--accent-primary)',
              color: '#fff',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 12px var(--accent-glow)'
            }}>
              <Clock size={22} />
            </div>
            <h1>Follow-Up Automático</h1>
          </div>
          <p>Configure fluxos de reengajamento automáticos para seus clientes baseados em gatilhos temporais e funil de vendas.</p>
        </div>

        {/* Global Pause Switch */}
        <div className="glass-panel" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'block' }}>
              Status Global do Módulo
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {globalEnabled ? 'Ativo e processando' : 'Pausado geral'}
            </span>
          </div>
          <label className="followup-switch">
            <input 
              type="checkbox" 
              checked={globalEnabled}
              onChange={handleToggleGlobal}
            />
            <span className="followup-switch-slider"></span>
          </label>
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
        <button
          className={`glass-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: '600',
            background: activeTab === 'rules' ? 'var(--accent-primary)' : 'none',
            color: activeTab === 'rules' ? '#fff' : 'var(--text-secondary)',
            border: activeTab === 'rules' ? 'none' : '1px solid transparent',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Layers size={16} />
          Regras de Envio
        </button>

        <button
          className={`glass-btn ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: '600',
            background: activeTab === 'queue' ? 'var(--accent-primary)' : 'none',
            color: activeTab === 'queue' ? '#fff' : 'var(--text-secondary)',
            border: activeTab === 'queue' ? 'none' : '1px solid transparent',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Calendar size={16} />
          Fila de Disparo
        </button>

        <button
          className={`glass-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: '600',
            background: activeTab === 'settings' ? 'var(--accent-primary)' : 'none',
            color: activeTab === 'settings' ? '#fff' : 'var(--text-secondary)',
            border: activeTab === 'settings' ? 'none' : '1px solid transparent',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Settings size={16} />
          Variáveis de Texto
        </button>
      </div>

      {/* Rules Tab View */}
      {activeTab === 'rules' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="glass-btn"
              onClick={() => { setEditingRule(null); setShowModal(true); }}
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: '600',
                background: 'var(--accent-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px var(--accent-glow)'
              }}
            >
              <Plus size={16} />
              Criar Nova Regra
            </button>
          </div>

          {rules.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', marginTop: '24px' }}>
              <HelpCircle size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>Nenhuma regra configurada</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>Crie sua primeira regra de follow-up automático para engajar seus leads.</p>
            </div>
          ) : (
            <div className="followup-grid">
              {rules.map(rule => (
                <div key={rule.id} className={`followup-card ${rule.is_active ? '' : 'inactive'}`}>
                  <div>
                    {/* Card Header */}
                    <div className="followup-card-header">
                      <h3 className="followup-card-title">{rule.name}</h3>
                      <span className={`followup-badge ${rule.is_active ? 'active' : 'inactive'}`}>
                        {rule.is_active ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>

                    {/* Trigger and delay info */}
                    <div className="followup-info-row">
                      <span className="followup-badge event">
                        {getTriggerLabel(rule.trigger_event)}
                      </span>
                    </div>

                    <div className="followup-info-row" style={{ fontSize: '12px', marginTop: '12px' }}>
                      <span className="followup-info-label">Espera:</span>
                      <span style={{ fontWeight: '600' }}>{formatDelay(rule.delay_hours)}</span>
                    </div>

                    {rule.max_attempts > 1 && (
                      <div className="followup-info-row" style={{ fontSize: '12px' }}>
                        <span className="followup-info-label">Tentativas:</span>
                        <span>Até {rule.max_attempts} vezes</span>
                      </div>
                    )}

                    {/* Message Preview */}
                    <div className="followup-message-preview">
                      {rule.message}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="followup-card-actions">
                    {/* Active/Inactive Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label className="followup-switch">
                        <input 
                          type="checkbox" 
                          checked={rule.is_active}
                          onChange={() => handleToggleRuleActive(rule.id, rule.is_active)}
                        />
                        <span className="followup-switch-slider"></span>
                      </label>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {rule.is_active ? 'Ativado' : 'Pausado'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="glass-btn"
                        onClick={() => { setEditingRule(rule); setShowModal(true); }}
                        style={{ padding: '6px 12px', background: 'none', border: '1px solid var(--border-glass)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit2 size={13} />
                        Editar
                      </button>
                      <button
                        className="glass-btn"
                        onClick={() => handleDeleteRule(rule.id)}
                        style={{ padding: '6px 12px', background: 'none', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '6px', color: 'var(--color-status-lost)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Queue Tab View */}
      {activeTab === 'queue' && (
        <div className="followup-table-container">
          <table className="followup-table">
            <thead>
              <tr>
                <th>Regra</th>
                <th>Lead / Contato</th>
                <th>Canal</th>
                <th>Agendado Para</th>
                <th>Tentativa</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Nenhum disparo agendado ou enviado na fila.
                  </td>
                </tr>
              ) : (
                queue.map(item => {
                  const matchingRule = rules.find(r => r.id === item.rule_id);
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '600' }}>
                        {matchingRule ? matchingRule.name : 'Regra Excluída'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '500' }}>{item.contacts?.name || 'Desconhecido'}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.contacts?.phone || '-'}</span>
                        </div>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {item.channels?.name || 'Canal Padrão'}
                      </td>
                      <td>
                        {formatDateTime(item.scheduled_at)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.attempt_number}
                      </td>
                      <td>
                        <span className={`status-indicator ${item.status}`}>
                          {item.status === 'pending' && 'Pendente'}
                          {item.status === 'sent' && 'Enviado'}
                          {item.status === 'cancelled' && 'Cancelado'}
                          {item.status === 'failed' && 'Falhou'}
                        </span>
                        {item.status === 'cancelled' && item.cancel_reason && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Motivo: {
                              item.cancel_reason === 'replied_before_send' ? 'Respondeu antes' : 
                              item.cancel_reason === 'manual_cancel' ? 'Cancelado pelo operador' : 
                              item.cancel_reason === 'rule_disabled' ? 'Regra desativada' : item.cancel_reason
                            }
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {item.status === 'pending' && (
                          <button
                            onClick={() => handleCancelQueueItem(item.id)}
                            style={{
                              background: 'none',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: 'var(--color-status-lost)',
                              padding: '5px 10px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}
                          >
                            Cancelar
                          </button>
                        )}
                        {item.status === 'sent' && item.sent_at && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Enviado em {formatDateTime(item.sent_at)}
                          </span>
                        )}
                        {item.status === 'cancelled' && '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings Tab View */}
      {activeTab === 'settings' && (
        <div style={{ maxWidth: '600px', marginTop: '12px' }}>
          <form onSubmit={handleSaveSettings} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Variáveis do Sistema</h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Defina os valores das variáveis que serão inseridas nos templates das mensagens.</p>
            </div>

            <div className="followup-form-group">
              <label className="followup-form-label">Nome da Empresa ({"{{company_name}}"})</label>
              <input 
                type="text" 
                className="glass-input"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: Wiks Barbearia"
                required
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Esta variável será substituída dinamicamente no envio das mensagens.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="submit"
                disabled={isSavingSetting}
                className="glass-btn"
                style={{
                  padding: '10px 24px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px var(--accent-glow)'
                }}
              >
                <Check size={16} />
                {isSavingSetting ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rule Creator/Editor Modal */}
      {showModal && (
        <FollowUpRuleModal 
          rule={editingRule}
          channels={channels}
          onClose={() => setShowModal(false)}
          onSaveSuccess={() => {
            setShowModal(false);
            loadData();
            showStatus('success', 'Regra de follow-up salva com sucesso!');
          }}
        />
      )}
    </div>
  );
}
