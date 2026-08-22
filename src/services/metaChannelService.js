const N8N_URL = String(import.meta.env.VITE_N8N_WEBHOOK_URL || '').replace(/\/$/, '');

const META_WEBHOOK_PATH = import.meta.env.VITE_N8N_META_WEBHOOK_PATH || '/webhook/meta';
const INSTAGRAM_WEBHOOK_PATH = import.meta.env.VITE_N8N_INSTAGRAM_WEBHOOK_PATH || '/webhook/instagram';

export const META_WEBHOOK_URL = `${N8N_URL}${META_WEBHOOK_PATH}`;
export const INSTAGRAM_WEBHOOK_URL = `${N8N_URL}${INSTAGRAM_WEBHOOK_PATH}`;

export async function testMetaChannelConnection({ provider, resourceId, accessToken }) {
  if (!resourceId?.trim() || !accessToken) {
    throw new Error('Informe o identificador e o token para testar a conexão.');
  }

  const fields = provider === 'instagram'
    ? 'id,name,username'
    : 'id,display_phone_number,verified_name,quality_rating';
  const endpoint = new URL(`https://graph.facebook.com/${encodeURIComponent(resourceId.trim())}`);
  endpoint.searchParams.set('fields', fields);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new Error('Não foi possível acessar a Meta. Verifique sua internet e tente novamente.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // The friendly error below covers invalid Graph API responses.
  }

  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || 'A Meta recusou as credenciais informadas.');
  }

  return {
    connected: true,
    id: data.id || resourceId.trim(),
    displayName: data.verified_name || data.username || data.name || resourceId.trim(),
    detail: provider === 'instagram'
      ? data.username ? `@${data.username}` : 'Conta profissional validada'
      : data.display_phone_number || 'Número do WhatsApp validado',
  };
}
