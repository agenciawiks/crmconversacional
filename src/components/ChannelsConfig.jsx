import { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  connectEvolutionChannel,
  DEFAULT_EVOLUTION_URL,
  EVOLUTION_WEBHOOK_URL,
} from '../services/evolutionService';

const statusLabels = {
  connected: 'Conectado',
  disconnected: 'WhatsApp desconectado',
  active: 'Cadastrado',
};

export default function ChannelsConfig() {
  const {
    tenantId,
    channels,
    addChannel,
    refreshChannels,
    toggleChannelStatus,
    deleteChannel,
  } = useCrm();

  const [showAddForm, setShowAddForm] = useState(false);
  const [providerType, setProviderType] = useState('evolution');
  const [channelName, setChannelName] = useState('');
  const [evoUrl] = useState(DEFAULT_EVOLUTION_URL);
  const [evoInstance, setEvoInstance] = useState('');
  const [evoApiKey, setEvoApiKey] = useState('');
  const [metaPhoneId, setMetaPhoneId] = useState('');
  const [metaToken, setMetaToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [connectionResult, setConnectionResult] = useState(null);

  const resetForm = () => {
    setShowAddForm(false);
    setChannelName('');
    setEvoInstance('');
    setEvoApiKey('');
    setMetaPhoneId('');
    setMetaToken('');
    setConnectionResult(null);
  };

  const handleToggleForm = () => {
    if (showAddForm) {
      resetForm();
    } else {
      setShowAddForm(true);
      setConnectionResult(null);
    }
  };

  const handleStartAdd = async (event) => {
    event.preventDefault();
    if (!channelName.trim() || submitting) return;

    setSubmitting(true);
    setConnectionResult(null);

    try {
      if (providerType === 'evolution') {
        const result = await connectEvolutionChannel({
          name: channelName.trim(),
          url: evoUrl,
          instance: evoInstance.trim(),
          apiKey: evoApiKey,
          tenantId,
        });

        const refreshedChannels = await refreshChannels();
        const persistedChannel = refreshedChannels.find((channel) =>
          result.channelId
            ? channel.id === result.channelId
            : channel.provider === 'evolution' &&
              channel.instance === evoInstance.trim(),
        );

        if (!persistedChannel) {
          throw new Error(
            'A Evolution API foi conectada, mas o canal não foi salvo para este cliente. Tente novamente.',
          );
        }

        setEvoApiKey('');
        setConnectionResult({
          type: result.connected ? 'success' : 'warning',
          title: result.connected
            ? 'Canal conectado'
            : 'API validada, WhatsApp desconectado',
          message: result.message,
          state: result.state,
          webhookUrl: result.webhookUrl,
        });
      } else {
        const saved = await addChannel(channelName.trim(), providerType, {
          phoneId: metaPhoneId.trim(),
          accessToken: metaToken,
          webhookUrl: EVOLUTION_WEBHOOK_URL,
        });
        if (!saved) {
          throw new Error('Não foi possível salvar o canal da Meta.');
        }
        setMetaToken('');
        setConnectionResult({
          type: 'success',
          title: 'Canal salvo',
          message: 'As credenciais da Meta foram salvas.',
        });
      }
    } catch (error) {
      setConnectionResult({
        type: 'error',
        title: 'Não foi possível conectar',
        message:
          error?.message ||
          'A API recusou a conexão. Confira as credenciais.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="content-wrapper animated-fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Canais de Conexão</h1>
          <p>
            Valide as credenciais e configure automaticamente o webhook
            do WhatsApp.
          </p>
        </div>

        <button onClick={handleToggleForm} className="glass-btn">
          <span>
            {showAddForm ? '✕ Fechar Painel' : '＋ Conectar Canal'}
          </span>
        </button>
      </div>

      {showAddForm && (
        <div
          className="glass-panel animated-fade-in"
          style={{
            padding: '24px',
            background: 'var(--bg-surface-solid)',
            border: '1px solid var(--accent-primary)',
            marginBottom: '24px',
          }}
        >
          <div style={{ maxWidth: '760px' }}>
            <h3
              style={{
                fontSize: '18px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              Configurar Integração
            </h3>

            <form
              onSubmit={handleStartAdd}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Nome da Conexão
                </span>
                <input
                  type="text"
                  required
                  className="glass-input"
                  placeholder="Ex: WhatsApp Comercial"
                  value={channelName}
                  onChange={(event) =>
                    setChannelName(event.target.value)
                  }
                />
              </label>

              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Tipo de Conexão
                </span>
                <select
                  className="crm-status-dropdown"
                  value={providerType}
                  onChange={(event) => {
                    setProviderType(event.target.value);
                    setConnectionResult(null);
                  }}
                >
                  <option value="evolution">Evolution API</option>
                  <option value="meta_cloud">
                    API Oficial (Meta / Cloud API)
                  </option>
                </select>
              </label>

              {providerType === 'evolution' ? (
                <>
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Servidor Evolution API
                    </span>
                    <input
                      type="url"
                      required
                      readOnly
                      className="glass-input"
                      value={evoUrl}
                    />
                  </label>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        Nome da Instância
                      </span>
                      <input
                        type="text"
                        required
                        className="glass-input"
                        placeholder="Ex: caionormal"
                        value={evoInstance}
                        onChange={(event) =>
                          setEvoInstance(event.target.value)
                        }
                      />
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        Global API Key
                      </span>
                      <input
                        type="password"
                        required
                        autoComplete="off"
                        className="glass-input"
                        placeholder="Cole a API key da Evolution"
                        value={evoApiKey}
                        onChange={(event) =>
                          setEvoApiKey(event.target.value)
                        }
                      />
                    </label>
                  </div>

                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Webhook que será configurado
                    </span>
                    <input
                      type="url"
                      readOnly
                      className="glass-input"
                      value={EVOLUTION_WEBHOOK_URL}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Phone Number ID
                    </span>
                    <input
                      type="text"
                      required
                      className="glass-input"
                      value={metaPhoneId}
                      onChange={(event) =>
                        setMetaPhoneId(event.target.value)
                      }
                    />
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Token da Meta
                    </span>
                    <input
                      type="password"
                      required
                      autoComplete="off"
                      className="glass-input"
                      value={metaToken}
                      onChange={(event) =>
                        setMetaToken(event.target.value)
                      }
                    />
                  </label>
                </>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="glass-btn"
                style={{
                  marginTop: '4px',
                  opacity: submitting ? 0.65 : 1,
                }}
              >
                {submitting
                  ? 'Verificando conexão...'
                  : providerType === 'evolution'
                    ? 'Verificar e conectar'
                    : 'Salvar canal da Meta'}
              </button>
            </form>

            {connectionResult && (
              <div
                role="status"
                style={{
                  marginTop: '18px',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${
                    connectionResult.type === 'success'
                      ? 'rgba(16, 185, 129, 0.45)'
                      : connectionResult.type === 'warning'
                        ? 'rgba(245, 158, 11, 0.5)'
                        : 'rgba(239, 68, 68, 0.45)'
                  }`,
                  background:
                    connectionResult.type === 'success'
                      ? 'rgba(16, 185, 129, 0.1)'
                      : connectionResult.type === 'warning'
                        ? 'rgba(245, 158, 11, 0.1)'
                        : 'rgba(239, 68, 68, 0.1)',
                }}
              >
                <strong>{connectionResult.title}</strong>
                <div
                  style={{
                    marginTop: '5px',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {connectionResult.message}
                </div>
                {connectionResult.webhookUrl && (
                  <code
                    style={{
                      display: 'block',
                      marginTop: '8px',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {connectionResult.webhookUrl}
                  </code>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>
        Canais Cadastrados
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {channels.map((channel) => {
          const connected = channel.status === 'connected';
          return (
            <div
              key={channel.id}
              className="glass-panel"
              style={{
                padding: '20px',
                background: 'var(--bg-surface-solid)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                border: '1px solid var(--border-glass)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <span
                  className={`tag tag-${
                    channel.provider === 'evolution'
                      ? 'whatsapp'
                      : 'webchat'
                  }`}
                >
                  {channel.provider === 'evolution'
                    ? 'Evolution API'
                    : 'API Oficial'}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: connected
                      ? 'var(--color-status-won)'
                      : 'var(--text-muted)',
                  }}
                >
                  {statusLabels[channel.status] || channel.status}
                </span>
              </div>

              <div>
                <h4
                  style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    marginBottom: '4px',
                  }}
                >
                  {channel.name}
                </h4>
                {channel.provider === 'evolution' ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span>
                      Instância: <code>{channel.instance}</code>
                    </span>
                    <span>
                      Webhook:{' '}
                      <code>
                        {channel.webhookUrl || 'não configurado'}
                      </code>
                    </span>
                  </div>
                ) : (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Phone ID: <code>{channel.phoneId}</code>
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  borderTop: '1px solid var(--border-glass)',
                  paddingTop: '12px',
                }}
              >
                {channel.provider !== 'evolution' && (
                  <button
                    onClick={() =>
                      toggleChannelStatus(channel.id)
                    }
                    className="table-action-btn"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    {connected ? 'Desativar' : 'Ativar'}
                  </button>
                )}
                <button
                  onClick={() => deleteChannel(channel.id)}
                  className="table-action-btn"
                  style={{
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: 'var(--color-status-lost)',
                    marginLeft:
                      channel.provider === 'evolution'
                        ? 'auto'
                        : undefined,
                  }}
                >
                  Excluir
                </button>
              </div>
            </div>
          );
        })}

        {channels.length === 0 && (
          <div
            className="glass-panel"
            style={{
              gridColumn: '1 / -1',
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              border: '2px dashed var(--border-glass)',
            }}
          >
            Nenhum canal cadastrado. Clique em{' '}
            <strong>Conectar Canal</strong> para começar.
          </div>
        )}
      </div>

      <div
        className="glass-panel"
        style={{
          padding: '20px',
          background: 'var(--bg-sidebar)',
          marginTop: '24px',
        }}
      >
        <h4 style={{ fontSize: '15px', marginBottom: '8px' }}>
          Webhook de entrada
        </h4>
        <code
          style={{
            display: 'block',
            padding: '10px',
            background: 'var(--bg-app)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-secondary)',
            overflowWrap: 'anywhere',
          }}
        >
          {EVOLUTION_WEBHOOK_URL}
        </code>
        <p
          style={{
            marginTop: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          Esse endereço é configurado automaticamente após a
          validação das credenciais.
        </p>
      </div>
    </div>
  );
}
