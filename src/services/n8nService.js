const ENV = import.meta.env || {};
const N8N_URL = ENV.VITE_N8N_WEBHOOK_URL || '';
const OUTBOUND_PATH = ENV.VITE_N8N_OUTBOUND_PATH || '/webhook/send';
const OUTBOUND_MEDIA_PATH = ENV.VITE_N8N_OUTBOUND_MEDIA_PATH || '/webhook/send-media';
const CHECK_OPENAI_QUOTA_PATH = ENV.VITE_N8N_CHECK_OPENAI_QUOTA_PATH
  || (ENV.DEV ? '/webhook/check-openai-quota' : '/webhook/check-openai-quota-prod');

export function requirePersistedMessage(data) {
  const payload = Array.isArray(data) ? data[0] : data;

  if (!payload || payload.success === false) {
    throw new Error(payload?.error || payload?.message || 'O envio não foi confirmado pelo servidor.');
  }

  if (!payload.id) {
    throw new Error('A mensagem pode ter sido enviada, mas não foi confirmada no histórico.');
  }

  return { ...payload, success: true };
}

async function readResponse(response) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
  }

  return requirePersistedMessage(data);
}

class N8nService {
  static async sendOutboundMessage(channelId, contactId, phone, content, recipientJid = null, isGroup = false, tenantId = null) {
    if (!N8N_URL) {
      throw new Error('VITE_N8N_WEBHOOK_URL não configurada.');
    }

    const response = await fetch(`${N8N_URL}${OUTBOUND_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel_id: channelId,
        contact_id: contactId,
        phone: phone,
        content: content,
        recipient_jid: recipientJid,
        is_group: isGroup,
        tenant_id: tenantId
      })
    });

    return readResponse(response);
  }

  static async sendOutboundMedia({ channelId, contactId, phone, recipientJid, isGroup, tenantId, mediaUrl, contentType, mimeType, fileName, caption }) {
    if (!N8N_URL) {
      throw new Error('VITE_N8N_WEBHOOK_URL não configurada.');
    }

    const response = await fetch(`${N8N_URL}${OUTBOUND_MEDIA_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel_id: channelId,
        contact_id: contactId,
        phone: phone,
        recipient_jid: recipientJid,
        is_group: Boolean(isGroup),
        tenant_id: tenantId,
        media_url: mediaUrl,
        content_type: contentType,
        mime_type: mimeType,
        file_name: fileName,
        caption: caption
      })
    });

    return readResponse(response);
  }

  static async checkOpenAIQuota(channelId) {
    if (!N8N_URL || !channelId) {
      return { status: 'no_key' };
    }

    try {
      const response = await fetch(`${N8N_URL}${CHECK_OPENAI_QUOTA_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channelId })
      });

      const data = await response.json().catch(() => null);
      if (data && data.status) {
        if (data.status === 'no_channel' || data.status === 'no_key') {
          return { status: 'no_key' };
        }
        return data;
      }

      return { status: 'no_key' };
    } catch (e) {
      console.error('[N8nService] checkOpenAIQuota error:', e);
      return { status: 'no_key' };
    }
  }
}

export default N8nService;
