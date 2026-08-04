import { supabase } from '../supabase';

const N8N_URL = String(import.meta.env.VITE_N8N_WEBHOOK_URL || '').replace(
  /\/$/,
  '',
);

const CONNECT_PATH =
  import.meta.env.VITE_N8N_EVOLUTION_CONNECT_PATH ||
  '/webhook/evolution-channel-connect';

const EVOLUTION_WEBHOOK_PATH =
  import.meta.env.VITE_N8N_EVOLUTION_WEBHOOK_PATH ||
  '/webhook/evolution-prod';

export const EVOLUTION_WEBHOOK_URL = `${N8N_URL}${EVOLUTION_WEBHOOK_PATH}`;

export const DEFAULT_EVOLUTION_URL =
  'https://n8n-evolution-api.rh3fr2.easypanel.host';

export async function connectEvolutionChannel({
  name,
  url,
  instance,
  apiKey,
  tenantId,
}) {
  if (!N8N_URL) {
    throw new Error('O endereço do n8n não está configurado neste ambiente.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Sua sessão expirou. Faça login novamente.');
  }

  let response;
  try {
    response = await fetch(`${N8N_URL}${CONNECT_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ name, url, instance, apiKey, tenantId }),
    });
  } catch {
    throw new Error(
      'Não foi possível acessar o serviço de conexão. Tente novamente.',
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // A mensagem amigável abaixo cobre respostas inválidas do servidor.
  }

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.message ||
        'A Evolution API recusou a conexão. Confira as credenciais.',
    );
  }

  return data;
}
