import React, { useState, useEffect } from 'react';
import SupabaseService from '../services/supabaseService';
import OpenAIStatusCard from './OpenAIStatusCard';
import { 
  Bot, 
  Sliders, 
  Key, 
  FileText, 
  AlertOctagon, 
  PauseCircle, 
  Save, 
  Eye, 
  EyeOff, 
  X, 
  Plus, 
  CheckCircle,
  AlertCircle,
  MessageSquare
} from 'lucide-react';

export default function AiAgentSettings() {
  const [channels, setChannels] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  
  const [id, setId] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [agentName, setAgentName] = useState('Atendente IA');
  const [model, setModel] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [pausePhrases, setPausePhrases] = useState([]);
  
  // UI states
  const [showApiKey, setShowApiKey] = useState(false);
  const [newPhrase, setNewPhrase] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Load channels on mount
  useEffect(() => {
    async function init() {
      try {
        const chs = await SupabaseService.fetchChannels();
        setChannels(chs);
        if (chs.length > 0) {
          setSelectedChannelId(chs[0].id);
        }
      } catch (err) {
        console.error('Error loading channels:', err);
      }
    }
    init();
  }, []);

  // Load settings when selected channel changes
  useEffect(() => {
    async function loadSettings() {
      if (!selectedChannelId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const config = await SupabaseService.fetchAiSettings(selectedChannelId);
        if (config) {
          setId(config.id);
          setTenantId(config.tenant_id);
          setIsEnabled(config.is_enabled);
          setAgentName(config.agent_name);
          setModel(config.model);
          setApiKey(config.api_key);
          setTemperature(config.temperature);
          setSystemPrompt(config.system_prompt);
          setNegativePrompt(config.negative_prompt);
          setWelcomeMessage(config.welcome_message || '');
          setPausePhrases(config.pause_trigger_phrases || []);
        } else {
          // Reset if no settings found for this channel
          setId(null);
          setIsEnabled(false);
          setAgentName('Atendente IA');
          setModel('gpt-4o-mini');
          setTemperature(0.7);
          setSystemPrompt('');
          setNegativePrompt('');
          setWelcomeMessage('');
          setPausePhrases([]);
        }
      } catch (err) {
        console.error('Error loading AI settings:', err);
        showStatus('error', 'Falha ao carregar configurações do banco de dados.');
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, [selectedChannelId]);

  const showStatus = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg({ type: '', text: '' });
    }, 4000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    const settingsData = {
      id,
      tenant_id: tenantId,
      channel_id: selectedChannelId,
      is_enabled: isEnabled,
      agent_name: agentName,
      model,
      ...(apiKey ? { api_key: apiKey } : {}),
      temperature: Number(temperature),
      system_prompt: systemPrompt,
      negative_prompt: negativePrompt,
      welcome_message: welcomeMessage,
      pause_trigger_phrases: pausePhrases
    };

    try {
      const result = await SupabaseService.saveAiSettings(settingsData);
      if (result) {
        if (typeof result === 'object' && result.id) {
          setId(result.id);
          setTenantId(result.tenant_id);
        }
        if (apiKey) setApiKey('');
        showStatus('success', 'Configurações do Agente de IA salvas com sucesso!');
      } else {
        showStatus('error', 'Ocorreu um erro ao salvar as configurações.');
      }
    } catch (err) {
      console.error('Save settings error:', err);
      showStatus('error', 'Falha na conexão com o Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  const addPhrase = () => {
    const trimmed = newPhrase.trim().toLowerCase();
    if (trimmed && !pausePhrases.includes(trimmed)) {
      setPausePhrases([...pausePhrases, trimmed]);
      setNewPhrase('');
    }
  };

  const removePhrase = (phraseToRemove) => {
    setPausePhrases(pausePhrases.filter(p => p !== phraseToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPhrase();
    }
  };

  if (isLoading) {
    return (
      <div className="content-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="pulsing-dot" style={{ width: '12px', height: '12px' }}></div>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Carregando configurações do Agente...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="content-wrapper animated-fade-in" style={{ height: '100%', overflowY: 'auto', padding: '24px 32px' }}>
      
      {/* Header section */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
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
              <Bot size={22} />
            </div>
            <h1>Configurações do Agente de IA</h1>
          </div>
          <p>Defina a identidade, as diretrizes da persona, chaves de API e regras de handoff com humanos.</p>
        </div>
      </div>

      {/* OpenAI Status Card */}
      <OpenAIStatusCard />

      {/* Channel Selector */}
      <div className="glass-panel" style={{ marginBottom: '24px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Selecione o Canal:</h2>
        <select 
          className="glass-input" 
          style={{ maxWidth: '300px' }}
          value={selectedChannelId}
          onChange={(e) => setSelectedChannelId(e.target.value)}
        >
          {channels.length === 0 ? (
            <option value="">Nenhum canal encontrado</option>
          ) : (
            channels.map(ch => (
              <option key={ch.id} value={ch.id}>{ch.name} ({ch.provider})</option>
            ))
          )}
        </select>
        {!selectedChannelId && channels.length > 0 && (
          <span style={{ fontSize: '12px', color: 'var(--color-status-lost)' }}>Selecione um canal para configurar a IA.</span>
        )}
      </div>

      {/* Alert banner for save status */}
      {statusMsg.text && (
        <div className={`builder-alert-bar animated-fade-in`} style={{
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
            <CheckCircle size={18} style={{ color: 'var(--color-status-won)' }} />
          ) : (
            <AlertCircle size={18} style={{ color: 'var(--color-status-lost)' }} />
          )}
          <span style={{ fontWeight: '500', fontSize: '13px' }}>{statusMsg.text}</span>
        </div>
      )}

      {selectedChannelId && (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', paddingBottom: '40px' }}>
        
        {/* Row 1: Global Status & Core Settings */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          
          {/* Card: Status & Model */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <Bot size={18} style={{ color: 'var(--accent-primary)' }} />
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Status & Modelo</h2>
            </div>

            {/* Enable Toggle Switch */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: '600', display: 'block', color: 'var(--text-primary)' }}>Ativar Robô neste Canal</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Habilitar resposta automática por IA para este canal</span>
              </div>
              <label className="theme-toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isEnabled} 
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }} 
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: isEnabled ? 'var(--accent-primary)' : 'var(--text-muted)',
                  borderRadius: '34px',
                  transition: '0.3s',
                  boxShadow: isEnabled ? '0 0 10px var(--accent-glow)' : 'none'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '18px', width: '18px',
                    left: isEnabled ? '26px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.3s'
                  }}></span>
                </span>
              </label>
            </div>

            {/* Agent Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nome do Agente</label>
              <input 
                type="text" 
                className="glass-input" 
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Ex: Assistente Wiks"
                required
              />
            </div>

            {/* Model Select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Modelo de IA</label>
              <select 
                className="glass-input" 
                style={{ appearance: 'none', backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat', paddingRight: '32px' }}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Recomendado – Rápido e Barato)</option>
                <option value="gpt-4o">GPT-4o (Avançado – Raciocínio Complexo)</option>
              </select>
            </div>
          </div>

          {/* Card: Parâmetros & API */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <Sliders size={18} style={{ color: 'var(--accent-primary)' }} />
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Parâmetros & Credenciais</h2>
            </div>

            {/* Temperature Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Temperatura ({temperature})</label>
                <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--accent-secondary)' }}>
                  {temperature <= 0.3 ? 'Mais Preciso/Factual' : temperature >= 0.8 ? 'Mais Criativo/Variado' : 'Equilibrado'}
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1.2" 
                step="0.1" 
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                style={{ 
                  width: '100%', 
                  accentColor: 'var(--accent-primary)',
                  background: 'var(--border-glass)',
                  height: '6px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* API Key Status & Write-Only Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status da Chave de API</label>
              <div style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-hover)',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-status-won)', boxShadow: '0 0 8px var(--color-status-won)' }} />
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Gerenciada com segurança via Servidor Proxy (n8n)
                </span>
              </div>

              {/* Write-Only Rotation Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Atualizar / Rotacionar Chave (Write-Only)
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showApiKey ? 'text' : 'password'} 
                    className="glass-input" 
                    style={{ paddingRight: '40px' }}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Cole uma nova chave sk-proj-... para atualizar"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                  Este campo opera em modo <strong>Write-Only</strong> (apenas gravação): a chave salva é enviada ao banco com segurança e nunca é lida ou exposta no navegador.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mensagem de Boas-Vindas (Opcional) */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
            <MessageSquare size={18} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Mensagem de Boas-Vindas (Opcional)</h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Se configurada, esta mensagem será enviada automaticamente no primeiro contato do cliente. Deixe em branco se quiser que o Agente de IA responda diretamente usando Inteligência Artificial desde a primeira mensagem.
              </p>
            </div>
          </div>
          <textarea
            className="node-textarea"
            style={{ minHeight: '80px', fontSize: '12.5px', padding: '12px', lineHeight: '1.5' }}
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            placeholder="Ex: Olá! Seja bem-vindo à Clínica Estética. Como posso te ajudar hoje?"
          />
        </div>

        {/* System Prompt (Persona / Context) */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
            <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Persona & Diretrizes (System Prompt)</h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Escreva as regras de comportamento do agente, quem ele representa, e informações sobre a empresa.</p>
            </div>
          </div>
          <textarea
            className="node-textarea"
            style={{ minHeight: '160px', fontSize: '12.5px', padding: '12px', lineHeight: '1.5' }}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Você é um assistente virtual da barbearia The Barber. Seu objetivo é ajudar os clientes a agendar horários, tirar dúvidas sobre serviços e preços...
Seja simpático, use emojis e responda em parágrafos curtos."
            required
          />
        </div>

        {/* Negative Prompt (Constraints) */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
            <AlertOctagon size={18} style={{ color: 'var(--color-status-lost)' }} />
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Instruções Negativas (O QUE NÃO FAZER)</h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Defina explicitamente limites éticos, regras de descontos e tópicos proibidos.</p>
            </div>
          </div>
          <textarea
            className="node-textarea"
            style={{ minHeight: '100px', fontSize: '12.5px', padding: '12px', borderLeft: '3px solid var(--color-status-lost)', lineHeight: '1.5' }}
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="- NUNCA mencione concorrentes diretos.
- NUNCA dê descontos sem autorização manual.
- NUNCA fale sobre assuntos políticos ou religiosos."
          />
        </div>

        {/* Pause Trigger Phrases */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
            <PauseCircle size={18} style={{ color: 'var(--color-status-contacted)' }} />
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Gatilhos de Handoff & Pausa</h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Quando o cliente falar qualquer uma dessas frases, o robô pausará automaticamente e adicionará a tag 'IA Inativa' ao lead.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-md)' }}>
            {/* Tag List */}
            {pausePhrases.map(phrase => (
              <span key={phrase} style={{
                background: 'var(--bg-surface-hover)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-glass)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '500'
              }}>
                {phrase}
                <button
                  type="button"
                  onClick={() => removePhrase(phrase)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  <X size={12} style={{ strokeWidth: 3 }} />
                </button>
              </span>
            ))}

            {/* Input tag */}
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '150px' }}>
              <input
                type="text"
                placeholder={pausePhrases.length === 0 ? "Ex: falar com humano, atendente..." : "Nova frase..."}
                value={newPhrase}
                onChange={(e) => setNewPhrase(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  width: '100%',
                  padding: '4px'
                }}
              />
              <button
                type="button"
                onClick={addPhrase}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                <Plus size={16} style={{ strokeWidth: 3 }} />
              </button>
            </div>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Pressione Enter ou clique no botão '+' para adicionar a frase como gatilho de pausa.</span>
        </div>

        {/* Save button card */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            type="submit"
            disabled={isSaving}
            className="glass-btn"
            style={{
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              opacity: isSaving ? 0.7 : 1,
              boxShadow: '0 4px 14px var(--accent-glow)',
              transition: 'all 0.2s ease'
            }}
          >
            <Save size={16} />
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>

        </form>
      )}
    </div>
  );
}
