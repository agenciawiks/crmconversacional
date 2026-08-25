export const formatResponseDuration = (durationMs) => {
  if (!Number.isFinite(durationMs) || durationMs < 0) return '—';

  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return `${minutes}min ${seconds}s`;
  return `${seconds}s`;
};

export const buildResponseMetric = (receivedAt, respondedAt = null) => {
  if (!receivedAt) return { status: 'empty' };
  if (!respondedAt) return { status: 'waiting', receivedAt };

  const receivedTimestamp = new Date(receivedAt).getTime();
  const respondedTimestamp = new Date(respondedAt).getTime();
  if (!Number.isFinite(receivedTimestamp) || !Number.isFinite(respondedTimestamp)) {
    return { status: 'empty' };
  }

  return {
    status: 'answered',
    durationMs: Math.max(0, respondedTimestamp - receivedTimestamp),
    receivedAt,
    respondedAt
  };
};

export const getResponseMetricPresentation = (metric, loading = false, failed = false) => {
  if (loading) return { value: 'Calculando…', state: 'loading' };
  if (failed) return { value: 'Indisponível', state: 'error' };
  if (!metric || metric.status === 'empty') return { value: 'Sem mensagens', state: 'empty' };
  if (metric.status === 'waiting') return { value: 'Aguardando', state: 'waiting' };

  return {
    value: formatResponseDuration(metric.durationMs),
    state: 'answered'
  };
};
