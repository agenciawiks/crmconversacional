// n8n Code node: reconciles Evolution API history with Supabase without replaying
// the inbound webhook (and therefore without re-triggering the conversational AI).
const SUPABASE_URL = 'https://rjcuoxvutrrzknicyuev.supabase.co';
const SERVICE_KEY = '__SUPABASE_SERVICE_ROLE_KEY__';
const RECENT_PAGES = 4;
const FIRST_DEEP_PAGE = RECENT_PAGES + 1;

const httpRequest = (typeof $helpers !== 'undefined' && $helpers?.httpRequest)
  || this?.helpers?.httpRequest?.bind(this.helpers)
  || (typeof fetch !== 'undefined' ? async (options) => {
    const response = await fetch(options.url, {
      method: options.method,
      headers: options.headers,
      body: options.body === undefined || Buffer.isBuffer(options.body)
        ? options.body
        : JSON.stringify(options.body),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 500)}`);
    if (!options.json) return text;
    return text ? JSON.parse(text) : null;
  } : null);

if (!httpRequest) throw new Error('Nenhum cliente HTTP está disponível neste Code node');

if (!SERVICE_KEY || SERVICE_KEY.startsWith('__')) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY was not injected into the deployed workflow');
}

const state = $getWorkflowStaticData('global');
const startedAt = new Date();
state.deepPageByChannel = state.deepPageByChannel || {};

const supabaseHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const cleanJid = (value) => String(value || '').trim().toLowerCase().replace(/\s/g, '');
const jidKind = (value) => {
  const normalized = cleanJid(value);
  if (normalized.endsWith('@lid')) return 'lid';
  if (normalized.endsWith('@g.us')) return 'group';
  if (normalized.endsWith('@s.whatsapp.net') || normalized.endsWith('@c.us')) return 'phone';
  return normalized ? 'other' : 'empty';
};
const toPhoneJid = (value) => {
  const normalized = cleanJid(value).replace(/@c\.us$/, '@s.whatsapp.net');
  return normalized.endsWith('@s.whatsapp.net') ? normalized : '';
};
const digits = (value) => cleanJid(value).split('@')[0].split(':')[0].replace(/\D/g, '');
const valueFrom = (record) => record?.message ? record : (record?.data || record || {});
const recordsFrom = (payload) => {
  if (Array.isArray(payload)) return payload;
  return [
    payload?.messages?.records,
    payload?.messages,
    payload?.records,
    payload?.data?.records,
    payload?.data?.messages,
    payload?.data,
  ].find(Array.isArray) || [];
};
const timestampOf = (record) => {
  const value = valueFrom(record);
  const raw = Number(value.messageTimestamp || value.timestamp || value.createdAt || 0);
  if (!raw) return null;
  const parsed = new Date(raw > 10_000_000_000 ? raw : raw * 1000);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};
const parseContent = (record) => {
  const message = valueFrom(record).message || {};
  if (message.conversation) return { content: message.conversation, type: 'text', mime: null };
  if (message.extendedTextMessage?.text) return { content: message.extendedTextMessage.text, type: 'text', mime: null };
  if (message.imageMessage) return { content: message.imageMessage.caption || '[Imagem]', type: 'image', mime: message.imageMessage.mimetype || 'image/jpeg' };
  if (message.audioMessage) return { content: '[Áudio]', type: 'audio', mime: message.audioMessage.mimetype || 'audio/ogg' };
  if (message.videoMessage) return { content: message.videoMessage.caption || '[Vídeo]', type: 'video', mime: message.videoMessage.mimetype || 'video/mp4' };
  if (message.documentMessage) return { content: message.documentMessage.fileName || '[Documento]', type: 'document', mime: message.documentMessage.mimetype || 'application/pdf' };
  if (message.stickerMessage) return { content: '[Figurinha]', type: 'sticker', mime: message.stickerMessage.mimetype || 'image/webp' };
  if (message.contactMessage) return { content: message.contactMessage.displayName || '[Contato]', type: 'contact', mime: null };
  if (message.locationMessage) return { content: '[Localização]', type: 'location', mime: null };
  return { content: '[Mensagem não suportada]', type: 'text', mime: null };
};

async function request(options, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await httpRequest({ json: true, ...options });
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(250 * attempt);
    }
  }
  throw lastError;
}

async function supabase(path, options = {}) {
  return request({
    method: options.method || 'GET',
    url: `${SUPABASE_URL}${path}`,
    headers: {
      ...supabaseHeaders,
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    ...(options.body !== undefined ? { body: options.body } : {}),
  });
}

async function rpc(name, payload) {
  return supabase(`/rest/v1/rpc/${name}`, { method: 'POST', body: payload });
}

async function audit(channel, status, payload) {
  await supabase('/rest/v1/webhook_logs', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      tenant_id: channel.tenant_id,
      channel_id: channel.id,
      event_type: 'message.reconciliation',
      source: 'evolution_reconciler',
      status,
      payload,
    },
  });
}

async function recordFailure(channel, messageId, payload, error) {
  const errorMessage = String(error?.message || error || 'Falha desconhecida').slice(0, 1000);
  try {
    await rpc('record_message_reconciliation_failure', {
      p_tenant_id: channel.tenant_id,
      p_channel_id: channel.id,
      p_provider_message_id: messageId || null,
      p_payload: payload,
      p_error_message: errorMessage,
    });
  } catch (_) {
    await supabase('/rest/v1/failed_messages', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: {
        tenant_id: channel.tenant_id,
        channel_id: channel.id,
        payload: { ...payload, whatsapp_msg_id: messageId || null, source: 'evolution_reconciler' },
        error_message: errorMessage,
      },
    });
  }
}

async function resolveFailure(channel, messageId) {
  if (!messageId) return;
  try {
    await rpc('resolve_message_reconciliation_failure', {
      p_tenant_id: channel.tenant_id,
      p_channel_id: channel.id,
      p_provider_message_id: messageId,
    });
  } catch (_) {
    // The audit table migration may not exist yet; message persistence is not blocked.
  }
}

async function fetchHistory(channel) {
  const endpoint = `${String(channel.url || '').replace(/\/$/, '')}/chat/findMessages/${encodeURIComponent(channel.instance)}`;
  const fetchPage = (page) => request({
    method: 'POST',
    url: endpoint,
    headers: { apikey: channel.api_key, 'Content-Type': 'application/json' },
    body: { where: {}, page },
  });
  const first = await fetchPage(1);
  const reportedPages = Math.max(1, Number(first?.messages?.pages || first?.pages || 1));
  const pages = new Set([1]);
  for (let page = 2; page <= Math.min(RECENT_PAGES, reportedPages); page += 1) pages.add(page);
  let deepPage = Math.max(FIRST_DEEP_PAGE, Number(state.deepPageByChannel[channel.id] || FIRST_DEEP_PAGE));
  if (deepPage > reportedPages) deepPage = FIRST_DEEP_PAGE;
  if (deepPage <= reportedPages) pages.add(deepPage);
  const remainingPages = [...pages].filter((page) => page !== 1);
  const remaining = await Promise.all(remainingPages.map(fetchPage));
  const payloads = [first, ...remaining];
  state.deepPageByChannel[channel.id] = deepPage >= reportedPages ? FIRST_DEEP_PAGE : deepPage + 1;
  return {
    records: payloads.flatMap(recordsFrom),
    pagesRead: payloads.length,
    deepPage: deepPage <= reportedPages ? deepPage : null,
    reportedPages,
  };
}

async function existingMessageIds(channel, ids) {
  const found = new Set();
  for (let start = 0; start < ids.length; start += 40) {
    const chunk = ids.slice(start, start + 40).filter((id) => /^[A-Za-z0-9._:-]+$/.test(id));
    if (!chunk.length) continue;
    const query = [
      `tenant_id=eq.${channel.tenant_id}`,
      `channel_id=eq.${channel.id}`,
      `whatsapp_msg_id=in.(${chunk.join(',')})`,
      'select=whatsapp_msg_id',
    ].join('&');
    const rows = await supabase(`/rest/v1/messages?${query}`);
    for (const row of rows || []) if (row.whatsapp_msg_id) found.add(String(row.whatsapp_msg_id));
  }
  return found;
}

async function upsertContact(channel, identity, value) {
  const syntheticPhone = identity.isGroup
    ? digits(identity.chatJid)
    : (identity.phone || `unresolved:${identity.lidJid}`);
  if (!syntheticPhone) throw new Error('Não foi possível determinar uma identidade estável para o contato');
  const existing = await supabase(
    `/rest/v1/contacts?tenant_id=eq.${channel.tenant_id}&phone=eq.${encodeURIComponent(syntheticPhone)}&select=id,phone,name,is_group,whatsapp_jid&limit=1`,
  );
  if (Array.isArray(existing) && existing[0]?.id) return existing[0];
  const name = identity.isGroup
    ? String(value.groupMetadata?.subject || value.group?.subject || `Grupo WhatsApp • ${digits(identity.chatJid).slice(-4)}`).trim()
    : String(value.pushName || identity.phone || 'Contato WhatsApp').trim();
  const rows = await supabase('/rest/v1/contacts?on_conflict=tenant_id,phone', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: {
      tenant_id: channel.tenant_id,
      phone: syntheticPhone,
      whatsapp_jid: identity.chatJid || identity.lidJid,
      is_group: identity.isGroup,
      name,
    },
  });
  const contact = Array.isArray(rows) ? rows[0] : rows;
  if (!contact?.id) throw new Error('O Supabase não retornou o contato reconciliado');
  return contact;
}

function identityOf(record, phoneByLid) {
  const value = valueFrom(record);
  const key = value.key || {};
  const remote = cleanJid(key.remoteJid || value.remoteJid);
  const alt = cleanJid(key.remoteJidAlt || value.remoteJidAlt);
  const isGroup = jidKind(remote) === 'group' || jidKind(alt) === 'group';
  const lidJid = jidKind(remote) === 'lid' ? remote : (jidKind(alt) === 'lid' ? alt : '');
  const directPhoneJid = jidKind(alt) === 'phone' ? toPhoneJid(alt)
    : (jidKind(remote) === 'phone' ? toPhoneJid(remote) : '');
  const resolvedPhoneJid = directPhoneJid || phoneByLid.get(lidJid) || '';
  const chatJid = isGroup
    ? (jidKind(remote) === 'group' ? remote : alt)
    : (resolvedPhoneJid || lidJid || remote || alt);
  return {
    isGroup,
    lidJid,
    phoneJid: resolvedPhoneJid,
    phone: digits(resolvedPhoneJid),
    chatJid,
    senderJid: isGroup ? cleanJid(key.participantAlt || key.participant || key.senderPn || '') : '',
  };
}

async function persistMedia(channel, record, parsed, messageId, timestamp) {
  if (!['image', 'audio', 'video', 'document', 'sticker'].includes(parsed.type)) {
    return { url: null, mime: parsed.mime, status: 'not_applicable', error: null };
  }
  try {
    const value = valueFrom(record);
    const response = await request({
      method: 'POST',
      url: `${String(channel.url).replace(/\/$/, '')}/chat/getBase64FromMediaMessage/${encodeURIComponent(channel.instance)}`,
      headers: { apikey: channel.api_key, 'Content-Type': 'application/json' },
      body: { message: { key: value.key || {}, message: value.message || {} }, convertToMp4: false },
    }, 2);
    let base64 = String(response?.base64 || response?.data?.base64 || response?.media?.base64 || '');
    if (base64.includes('base64,')) base64 = base64.split('base64,').pop();
    base64 = base64.replace(/\s/g, '');
    if (!base64) throw new Error(response?.message || 'Evolution não retornou a mídia em base64');
    const mime = String(response?.mimetype || response?.mimeType || parsed.mime || 'application/octet-stream');
    const extMap = {
      'audio/ogg': 'ogg', 'audio/ogg; codecs=opus': 'ogg', 'audio/mpeg': 'mp3',
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
      'video/mp4': 'mp4', 'application/pdf': 'pdf',
    };
    const extension = extMap[mime.toLowerCase()] || mime.split('/')[1]?.split(';')[0] || 'bin';
    const safeId = String(messageId).replace(/[^A-Za-z0-9_-]/g, '_');
    const date = new Date(timestamp);
    const objectPath = `${channel.tenant_id}/${channel.id}/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${safeId}.${extension}`;
    await httpRequest({
      method: 'POST',
      url: `${SUPABASE_URL}/storage/v1/object/media/${objectPath}`,
      headers: {
        ...supabaseHeaders,
        'Content-Type': mime,
        'x-upsert': 'true',
      },
      body: Buffer.from(base64, 'base64'),
    });
    return {
      url: `${SUPABASE_URL}/storage/v1/object/public/media/${objectPath}`,
      mime,
      status: 'ready',
      error: null,
    };
  } catch (error) {
    return {
      url: null,
      mime: parsed.mime,
      status: 'failed',
      error: String(error?.message || error).slice(0, 500),
    };
  }
}

const channels = await supabase('/rest/v1/channels?provider=eq.evolution&status=in.(connected,active)&order=created_at.asc&select=id,tenant_id,url,instance,api_key,status,created_at');
const summaries = [];
let runHadChannelError = false;
const validChannels = (channels || []).filter((channel) => channel.id && channel.tenant_id && channel.url && channel.instance && channel.api_key);
const channelIndex = validChannels.length ? Number(state.channelIndex || 0) % validChannels.length : 0;
const selectedChannels = validChannels.length ? [validChannels[channelIndex]] : [];

for (const channel of selectedChannels) {
  const summary = { channel_id: channel.id, instance: channel.instance, pages: 0, inspected: 0, missing: 0, recovered: 0, failures: 0, identities: 0 };
  if (!channel.id || !channel.tenant_id || !channel.url || !channel.instance || !channel.api_key) {
    summary.skipped = 'Configuração incompleta';
    summaries.push(summary);
    continue;
  }
  try {
    const history = await fetchHistory(channel);
    summary.pages = history.pagesRead;
    summary.deep_page = history.deepPage;
    summary.total_pages = history.reportedPages;
    const unique = new Map();
    for (const record of history.records) {
      const value = valueFrom(record);
      const id = String(value.key?.id || value.id || '').trim();
      const timestamp = timestampOf(record);
      if (!id || !timestamp || new Date(timestamp) < new Date(channel.created_at || 0)) continue;
      unique.set(id, record);
    }
    const records = [...unique.values()];
    summary.inspected = records.length;

    const phoneCandidates = new Map();
    for (const record of records) {
      const value = valueFrom(record);
      const remote = cleanJid(value.key?.remoteJid || value.remoteJid);
      const alt = cleanJid(value.key?.remoteJidAlt || value.remoteJidAlt);
      const lidJid = jidKind(remote) === 'lid' ? remote : (jidKind(alt) === 'lid' ? alt : '');
      const phoneJid = jidKind(alt) === 'phone' ? toPhoneJid(alt) : (jidKind(remote) === 'phone' ? toPhoneJid(remote) : '');
      if (!lidJid || !phoneJid || digits(lidJid) === digits(phoneJid)) continue;
      const candidates = phoneCandidates.get(lidJid) || new Set();
      candidates.add(phoneJid);
      phoneCandidates.set(lidJid, candidates);
    }
    const phoneByLid = new Map();
    const identityMappings = [];
    for (const [lidJid, candidates] of phoneCandidates) {
      if (candidates.size !== 1) continue;
      const phoneJid = [...candidates][0];
      phoneByLid.set(lidJid, phoneJid);
      identityMappings.push({ lid_jid: lidJid, phone_jid: phoneJid, phone: digits(phoneJid) });
    }
    if (identityMappings.length) {
      await rpc('reconcile_evolution_identity_batch', {
        p_tenant_id: channel.tenant_id,
        p_channel_id: channel.id,
        p_mappings: identityMappings,
      });
      summary.identities = identityMappings.length;
    }

    const ids = records.map((record) => String(valueFrom(record).key?.id || valueFrom(record).id || '')).filter(Boolean);
    const existing = await existingMessageIds(channel, ids);
    const missing = records.filter((record) => !existing.has(String(valueFrom(record).key?.id || valueFrom(record).id || '')));
    summary.missing = missing.length;

    for (const record of missing) {
      const value = valueFrom(record);
      const key = value.key || {};
      const messageId = String(key.id || value.id || '').trim();
      try {
        const identity = identityOf(record, phoneByLid);
        const timestamp = timestampOf(record) || startedAt.toISOString();
        const parsed = parseContent(record);
        const contact = await upsertContact(channel, identity, value);
        const media = await persistMedia(channel, record, parsed, messageId, timestamp);
        await rpc('persist_evolution_message', { p_payload: {
          tenant_id: channel.tenant_id,
          channel_id: channel.id,
          contact_id: contact.id,
          direction: key.fromMe ? 'out' : 'in',
          content: parsed.content,
          content_type: parsed.type,
          media_url: media.url,
          whatsapp_msg_id: messageId,
          timestamp,
          status: key.fromMe ? 'sent' : 'received',
          is_group: identity.isGroup,
          chat_jid: identity.chatJid,
          sender_jid: identity.senderJid || null,
          sender_name: identity.isGroup && !key.fromMe ? String(value.pushName || 'Participante') : null,
          media_mime_type: media.mime,
          media_storage_status: media.status,
          media_storage_error: media.error,
        } });
        await resolveFailure(channel, messageId);
        await audit(channel, 'recovered', {
          whatsapp_msg_id: messageId,
          timestamp,
          direction: key.fromMe ? 'out' : 'in',
          content_type: parsed.type,
          media_storage_status: media.status,
        });
        summary.recovered += 1;
      } catch (error) {
        summary.failures += 1;
        await recordFailure(channel, messageId, { record, source: 'evolution_reconciler' }, error);
      }
    }
    await audit(channel, summary.failures ? 'completed_with_failures' : 'completed', {
      ...summary,
      rotating_deep_scan: true,
    });
  } catch (error) {
    runHadChannelError = true;
    summary.failures += 1;
    summary.error = String(error?.message || error).slice(0, 1000);
    await recordFailure(channel, null, { source: 'evolution_reconciler', scope: 'channel' }, error);
  }
  summaries.push(summary);
}

if (!runHadChannelError) {
  state.lastSuccessfulAt = startedAt.toISOString();
}
if (validChannels.length) state.channelIndex = (channelIndex + 1) % validChannels.length;

return [{ json: {
  ok: !runHadChannelError && summaries.every((item) => !item.failures),
  started_at: startedAt.toISOString(),
  rotating_deep_scan: true,
  configured_channels: validChannels.length,
  channels_checked: summaries.length,
  inspected: summaries.reduce((sum, item) => sum + item.inspected, 0),
  missing: summaries.reduce((sum, item) => sum + item.missing, 0),
  recovered: summaries.reduce((sum, item) => sum + item.recovered, 0),
  failures: summaries.reduce((sum, item) => sum + item.failures, 0),
  details: summaries,
} }];
