import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';

export default function ChannelsConfig() {
  const { channels, addChannel, toggleChannelStatus, deleteChannel } = useCrm();

  const [showAddForm, setShowAddForm] = useState(false);
  const [providerType, setProviderType] = useState('evolution');
  const [channelName, setChannelName] = useState('');
  
  // Evolution inputs
  const [evoUrl, setEvoUrl] = useState('https://api.evolution.empresa.com');
  const [evoInstance, setEvoInstance] = useState('');
  const [evoApiKey, setEvoApiKey] = useState('');

  // Meta inputs
  const [metaPhoneId, setMetaPhoneId] = useState('');
  const [metaToken, setMetaToken] = useState('');

  // QR Code Simulator States
  const [qrStep, setQrStep] = useState('idle'); // 'idle' | 'generating' | 'ready' | 'connected'
  const [tempChannelData, setTempChannelData] = useState(null);

  const handleStartAdd = (e) => {
    e.preventDefault();
    if (!channelName.trim()) return;

    const details = providerType === 'evolution' 
      ? { url: evoUrl, instance: evoInstance, apiKey: evoApiKey }
      : { phoneId: metaPhoneId, accessToken: metaToken };

    const tempData = { name: channelName, provider: providerType, details };

    if (providerType === 'evolution') {
      // Trigger Evolution QR Code Scan Simulation flow
      setTempChannelData(tempData);
      setQrStep('generating');
      setTimeout(() => {
        setQrStep('ready');
      }, 1500);
    } else {
      // Meta is direct save
      addChannel(channelName, providerType, details);
      resetForm();
    }
  };

  const handleSimulateScan = () => {
    if (!tempChannelData) return;
    setQrStep('connected');
    setTimeout(() => {
      addChannel(tempChannelData.name, tempChannelData.provider, tempChannelData.details);
      resetForm();
    }, 1500);
  };

  const resetForm = () => {
    setShowAddForm(false);
    setChannelName('');
    setEvoInstance('');
    setEvoApiKey('');
    setMetaPhoneId('');
    setMetaToken('');
    setQrStep('idle');
    setTempChannelData(null);
  };

  return (
    <div className="content-wrapper animated-fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Canais de Conexão</h1>
          <p>Gerencie as integrações do seu WhatsApp Oficial, não-oficial (Evolution) e outras redes.</p>
        </div>

        <button onClick={() => setShowAddForm(prev => !prev)} className="glass-btn">
          <span>{showAddForm ? '✕ Fechar Painel' : '＋ Conectar Canal'}</span>
        </button>
      </div>

      {/* CONNECTION WIZARD MODAL PANEL */}
      {showAddForm && (
        <div className="glass-panel animated-fade-in" style={{
          padding: '24px',
          background: 'var(--bg-surface-solid)',
          border: '1px solid var(--accent-primary)',
          display: 'grid',
          gridTemplateColumns: qrStep !== 'idle' ? '1fr 1fr' : '1fr',
          gap: '24px',
          marginBottom: '24px'
        }}>
          
          {/* LEFT COLUMN: FORM DETAILS */}
          <div>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Configurar Integração
            </h3>
            
            {qrStep === 'idle' ? (
              <form onSubmit={handleStartAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Nome da Conexão</span>
                  <input
                    type="text"
                    required
                    className="glass-input"
                    placeholder="Ex: Whats Comercial Suporte"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Tipo de Conexão</span>
                  <select
                    className="crm-status-dropdown"
                    value={providerType}
                    onChange={(e) => setProviderType(e.target.value)}
                  >
                    <option value="evolution">Evolution API (QR Code / Celular Físico)</option>
                    <option value="meta_cloud">API Oficial (Meta / Cloud API)</option>
                  </select>
                </div>

                {/* DYNAMIC FORM FIELDS */}
                {providerType === 'evolution' ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>URL da API Server</span>
                      <input
                        type="url"
                        required
                        className="glass-input"
                        value={evoUrl}
                        onChange={(e) => setEvoUrl(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Nome da Instância</span>
                        <input
                          type="text"
                          required
                          className="glass-input"
                          placeholder="Ex: InstanciaSuporte"
                          value={evoInstance}
                          onChange={(e) => setEvoInstance(e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Global API Key</span>
                        <input
                          type="password"
                          required
                          className="glass-input"
                          placeholder="token_evo_..."
                          value={evoApiKey}
                          onChange={(e) => setEvoApiKey(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Phone Number ID (ID do Telefone)</span>
                      <input
                        type="text"
                        required
                        className="glass-input"
                        placeholder="Ex: 1098457293847"
                        value={metaPhoneId}
                        onChange={(e) => setMetaPhoneId(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Meta Temporary/Permanent Token</span>
                      <input
                        type="password"
                        required
                        className="glass-input"
                        placeholder="EAAd8B..."
                        value={metaToken}
                        onChange={(e) => setMetaToken(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <button type="submit" className="glass-btn" style={{ marginTop: '10px' }}>
                  {providerType === 'evolution' ? 'Gerar QR Code ➔' : 'Conectar API Oficial ✓'}
                </button>
              </form>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '12px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                  <strong>Instruções:</strong> <br />
                  1. Abra o WhatsApp no seu smartphone.<br />
                  2. Vá em Configurações &gt; Aparelhos Conectados.<br />
                  3. Aponte a câmera do celular para o código QR à direita.
                </div>
                
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Canal a cadastrar: <strong>{tempChannelData?.name}</strong> <br />
                  Provedor: <span style={{ textTransform: 'capitalize' }}>{tempChannelData?.provider}</span>
                </div>

                <button onClick={resetForm} className="glass-btn secondary">
                  Cancelar Operação
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: HIGH-FIDELITY QR CODE EMULATOR PANEL */}
          {qrStep !== 'idle' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-app)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-glass)',
              padding: '24px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              
              {/* STATE 1: GENERATING MODAL SPINNER */}
              {qrStep === 'generating' && (
                <div className="animated-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    border: '3px solid var(--border-glass)',
                    borderTopColor: 'var(--accent-primary)',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>Gerando código de pareamento seguro...</span>
                </div>
              )}

              {/* STATE 2: ACTIVE SCANNER VIEW */}
              {qrStep === 'ready' && (
                <div className="animated-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', position: 'relative' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Escaneie o QR Code</span>
                  
                  {/* Outer scan container */}
                  <div style={{
                    width: '180px',
                    height: '180px',
                    background: '#fff',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px',
                    boxShadow: 'var(--shadow-lg)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    
                    {/* Glowing Green Scanning Laser Line */}
                    <div style={{
                      position: 'absolute',
                      left: '0',
                      width: '100%',
                      height: '3px',
                      background: '#10b981',
                      boxShadow: '0 0 8px #10b981',
                      animation: 'scanLaser 2.2s ease-in-out infinite'
                    }}></div>

                    {/* High-Fidelity SVG QR Code */}
                    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="#0B0A11">
                      <rect x="0" y="0" width="30" height="30" fill="none" stroke="#0B0A11" strokeWidth="6"/>
                      <rect x="8" y="8" width="14" height="14"/>
                      <rect x="70" y="0" width="30" height="30" fill="none" stroke="#0B0A11" strokeWidth="6"/>
                      <rect x="78" y="8" width="14" height="14"/>
                      <rect x="0" y="70" width="30" height="30" fill="none" stroke="#0B0A11" strokeWidth="6"/>
                      <rect x="8" y="78" width="14" height="14"/>
                      {/* Random Matrix Dots */}
                      <rect x="40" y="10" width="10" height="10"/>
                      <rect x="50" y="20" width="10" height="10"/>
                      <rect x="40" y="40" width="20" height="20"/>
                      <rect x="10" y="40" width="10" height="10"/>
                      <rect x="80" y="40" width="10" height="20"/>
                      <rect x="70" y="70" width="10" height="10"/>
                      <rect x="85" y="85" width="15" height="15"/>
                    </svg>
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--color-status-won)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="pulsing-dot" style={{ width: '6px', height: '6px', background: 'var(--color-status-won)' }}></span>
                    Código ativo. Expira em 45s.
                  </span>

                  <button onClick={handleSimulateScan} className="glass-btn" style={{ background: '#10b981', fontSize: '12px', padding: '8px 16px', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                    Simular Leitura do Celular
                  </button>
                </div>
              )}

              {/* STATE 3: SUCCESS CHECKMARK CONNECTED */}
              {qrStep === 'connected' && (
                <div className="animated-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '2.5px solid var(--color-status-won)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-status-won)',
                    fontSize: '28px',
                    animation: 'pulse 1.5s infinite'
                  }}>
                    ✓
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-status-won)' }}>Aparelho Pareado!</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Instanciando credenciais e criando webhook no n8n...</span>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ACTIVE CHANNELS LIST DASHBOARD */}
      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Canais Conectados</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {channels.map(chan => (
          <div key={chan.id} className="glass-panel" style={{
            padding: '20px',
            background: 'var(--bg-surface-solid)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            border: '1px solid var(--border-glass)',
            position: 'relative'
          }}>
            
            {/* Upper channel tags row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className={`tag tag-${chan.provider === 'evolution' ? 'whatsapp' : 'webchat'}`} style={{ textTransform: 'none' }}>
                {chan.provider === 'evolution' ? 'evolution api (qr)' : 'api oficial (meta)'}
              </span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="pulsing-dot" style={{
                  background: chan.status === 'connected' ? 'var(--color-status-won)' : 'var(--text-muted)',
                  boxShadow: chan.status === 'connected' ? '0 0 0 0 rgba(16, 185, 129, 0.4)' : 'none'
                }}></span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: chan.status === 'connected' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {chan.status === 'connected' ? 'Conectado' : 'Inativo'}
                </span>
              </div>
            </div>

            {/* Connection Title details */}
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>{chan.name}</h4>
              
              {chan.provider === 'evolution' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>Server: <code>{chan.url}</code></span>
                  <span>Instância: <code>{chan.instance}</code></span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <span>Phone ID: <code>{chan.phoneId}</code></span>
                  <span>Token: <code>••••••••••••••••</code></span>
                </div>
              )}
            </div>

            {/* Action buttons row */}
            <div style={{
              display: 'flex',
              gap: '10px',
              borderTop: '1px solid var(--border-glass)',
              paddingTop: '12px',
              marginTop: '4px'
            }}>
              <button
                onClick={() => toggleChannelStatus(chan.id)}
                className="table-action-btn"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {chan.status === 'connected' ? 'Desativar' : 'Ativar'}
              </button>
              <button
                onClick={() => deleteChannel(chan.id)}
                className="table-action-btn"
                style={{
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: 'var(--color-status-lost)',
                  flex: '0 0 40px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  display: 'inline-flex'
                }}
                title="Deletar Canal"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
            
          </div>
        ))}

        {channels.length === 0 && (
          <div className="glass-panel" style={{
            gridColumn: '1 / -1',
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            border: '2px dashed var(--border-glass)'
          }}>
            Nenhum canal de mensagens cadastrado. <br /> Clique em <strong>Conectar Canal</strong> no canto superior para iniciar!
          </div>
        )}
      </div>

      {/* WEBHOOK EXPLANATORY HELP COMPONENT */}
      <div className="glass-panel" style={{ padding: '24px', background: 'var(--bg-sidebar)', marginTop: '24px' }}>
        <h4 style={{ fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Como integrar com APIs Reais
        </h4>
        <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
          Para colocar este CRM em produção, seu servidor backend deve expor um endpoint HTTP para receber os dados.
          Nas configurações da sua <strong>Evolution API</strong> ou no painel de <strong>Webhook da Meta</strong>, configure a URL de recebimento apontando para: <br />
          <code style={{
            display: 'block',
            padding: '10px',
            background: 'var(--bg-app)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-sm)',
            marginTop: '8px',
            fontFamily: 'monospace',
            color: 'var(--accent-secondary)'
          }}>
            https://api.seu-dominio.com/api/webhooks/whatsapp/[ID_DO_CANAL]
          </code>
          Ao receber um disparo de webhook, seu backend traduz o JSON específico do provedor, atualiza o histórico de chat e despacha os dados via <strong>WebSocket</strong> para o front-end, fazendo a mensagem "bater" instantaneamente na tela do OmniCRM.
        </p>
      </div>

      {/* Embedded specific laser scanning keyframes helper */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes scanLaser {
          0% { top: 0px; }
          50% { top: 177px; }
          100% { top: 0px; }
        }
      `}</style>

    </div>
  );
}
