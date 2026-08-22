import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, FlaskConical, RefreshCw, ShieldCheck, WifiOff, Zap } from 'lucide-react';
import { useOpenAIQuota } from '../hooks/useOpenAIQuota';

const STATUS_MAP = {
  loading: { icon: RefreshCw, tone: 'neutral', label: 'Verificando Conexão…', description: 'Consultando a API da OpenAI pelo servidor seguro.' },
  ok: { icon: CheckCircle2, tone: 'success', label: 'Conexão Operacional', description: 'A chave foi validada e possui acesso à API.' },
  quota_exceeded: { icon: AlertTriangle, tone: 'danger', label: 'Créditos Esgotados', description: 'A chave é válida, mas o agente ficará offline até a recarga.' },
  invalid_key: { icon: AlertTriangle, tone: 'warning', label: 'Chave Inválida', description: 'A credencial foi revogada ou não é reconhecida pela OpenAI.' },
  unknown: { icon: WifiOff, tone: 'neutral', label: 'Não Foi Possível Validar', description: 'Revise a conectividade e execute o teste novamente.' },
  no_key: { icon: Zap, tone: 'purple', label: 'Chave Não Configurada', description: 'Cadastre uma chave para habilitar o teste real do provedor.' },
};

export default function OpenAIStatusCard({ channelId = null, model = 'gpt-4o-mini', apiKeyConfigured = false }) {
  const { status, isChecking, lastChecked, recheck } = useOpenAIQuota(120000, channelId);
  const resolvedStatus = !apiKeyConfigured && status !== 'loading' ? 'no_key' : status;
  const config = STATUS_MAP[resolvedStatus] || STATUS_MAP.unknown;
  const Icon = config.icon;
  const time = lastChecked ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(lastChecked) : null;
  return (
    <section className={`ai-test-card is-${config.tone}`} aria-live="polite">
      <header><span><FlaskConical size={18} aria-hidden="true" /></span><div><small>Teste Real</small><h2>Saúde do Provedor</h2><p>Verificação direta pelo fluxo seguro do n8n.</p></div></header>
      <div className="ai-provider-mark"><span className="ai-openai-symbol" aria-hidden="true">AI</span><div><small>Provedor</small><strong>OpenAI</strong><p>API oficial · {model}</p></div><i><ShieldCheck size={13} aria-hidden="true" /> Seguro</i></div>
      <div className="ai-test-result"><span className={isChecking ? 'is-spinning' : ''}><Icon size={21} aria-hidden="true" /></span><div><strong>{isChecking ? 'Executando Teste…' : config.label}</strong><p>{config.description}</p></div></div>
      {time && <p className="ai-last-check"><Clock3 size={12} aria-hidden="true" /> Última verificação às {time}</p>}
      <div className="ai-test-actions">{resolvedStatus === 'quota_exceeded' && <a href="https://platform.openai.com/settings/billing/overview" target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> Abrir Faturamento</a>}<button type="button" className="ai-secondary-action ai-animated-action" onClick={recheck} disabled={isChecking || !channelId || !apiKeyConfigured}><RefreshCw size={15} aria-hidden="true" />{isChecking ? 'Testando…' : 'Testar Conexão'}</button></div>
      <small className="ai-test-note">A chave não passa pelo navegador durante o teste.</small>
    </section>
  );
}
