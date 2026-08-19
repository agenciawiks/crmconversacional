const N8N_BASE = 'https://n8n-n8n.rh3fr2.easypanel.host/api/v1';
const INBOUND_ID = 'oOYAsBHtimSQr0iO';
const CONNECT_ID = 'Y6qOr3qRvX8yohQT';
const LABEL_EVENTS = ['LABELS_EDIT', 'LABELS_ASSOCIATION'];

const apiKey = process.env.N8N_API_KEY;
if (!apiKey) throw new Error('Set N8N_API_KEY before deploying');
const headers = { 'X-N8N-API-KEY': apiKey, Accept: 'application/json' };

async function request(path, options = {}) {
  const response = await fetch(`${N8N_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(`${path}: ${response.status} ${text}`);
  return data;
}

function cleanSettings(settings = {}) {
  const allowed = {};
  for (const key of [
    'executionOrder',
    'errorWorkflow',
    'timezone',
    'saveExecutionProgress',
    'saveManualExecutions',
    'callerPolicy',
  ]) {
    if (settings[key] !== undefined) allowed[key] = settings[key];
  }
  return allowed;
}

async function updateWorkflow(workflow) {
  return request(`/workflows/${workflow.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: cleanSettings(workflow.settings),
    }),
  });
}

const parserCode = `const root = $input.first().json;
const body = root.body || root;
const event = String(body.event || '').toLowerCase();
const data = Array.isArray(body.data) ? (body.data[0] || {}) : (body.data || {});

if (event === 'labels.association') {
  const association = data.association || data;
  const action = String(data.type || data.action || association.action || '').toLowerCase();
  return [{ json: {
    event_type: 'label.association',
    instance: String(body.instance || data.instance || '').trim(),
    label_action: action === 'add' || action === 'remove' ? action : '',
    label_chat_id: String(data.chatId || association.chatId || '').trim(),
    label_id: String(data.labelId || association.labelId || '').trim(),
  } }];
}

if (event === 'labels.edit') {
  return [{ json: {
    event_type: 'label.catalog',
    instance: String(body.instance || data.instance || '').trim(),
    label_id: String(data.id || data.labelId || '').trim(),
    label_name: String(data.name || '').trim(),
    label_deleted: Boolean(data.deleted),
  } }];
}

const key = data.key || {};
const message = data.message || {};
const remoteJid = String(key.remoteJid || key.remoteJidAlt || '');
const remoteJidAlt = String(key.remoteJidAlt || '');
const isGroup = remoteJid.endsWith('@g.us');
const whatsappJid = isGroup
  ? remoteJid
  : (remoteJidAlt.endsWith('@s.whatsapp.net') ? remoteJidAlt : (remoteJid || remoteJidAlt));
const participantJid = isGroup
  ? String(key.participantAlt || key.participant || '')
  : '';
const phone = whatsappJid.split('@')[0].split(':')[0];

const rawStatus = String(
  data.update?.status || data.status || body.status || '',
).toUpperCase();
const status = ['PLAYED', '5'].includes(rawStatus)
  ? 'played'
  : (['READ', 'READ_ACK', '4'].includes(rawStatus)
    ? 'read'
    : (['DELIVERY_ACK', 'DELIVERED', '3'].includes(rawStatus)
      ? 'delivered'
      : (['ERROR', 'FAILED', '0'].includes(rawStatus)
        ? 'failed'
        : (['PENDING', 'SERVER_ACK', 'DEVICE_ACK', 'SENT', '1', '2'].includes(rawStatus)
          ? 'sent'
          : ''))));

if (['messages.update', 'send.message.update'].includes(event)) {
  return [{ json: {
    event_type: 'message.status',
    whatsapp_msg_id: String(key.id || data.id || ''),
    instance: String(body.instance || '').trim(),
    status,
    status_timestamp: new Date().toISOString(),
  } }];
}

if (event !== 'messages.upsert') {
  return [{ json: { event_type: 'skip', reason: 'Evento ignorado: ' + event } }];
}

let content = '';
let contentType = 'text';
let mimeType = 'application/octet-stream';
if (message.conversation) {
  content = message.conversation;
} else if (message.extendedTextMessage?.text) {
  content = message.extendedTextMessage.text;
} else if (message.imageMessage) {
  content = message.imageMessage.caption || '[Imagem]';
  contentType = 'image';
  mimeType = message.imageMessage.mimetype || 'image/jpeg';
} else if (message.audioMessage) {
  content = '[Áudio]';
  contentType = 'audio';
  mimeType = message.audioMessage.mimetype || 'audio/ogg';
} else if (message.videoMessage) {
  content = message.videoMessage.caption || '[Vídeo]';
  contentType = 'video';
  mimeType = message.videoMessage.mimetype || 'video/mp4';
} else if (message.documentMessage) {
  content = message.documentMessage.fileName || '[Documento]';
  contentType = 'document';
  mimeType = message.documentMessage.mimetype || 'application/pdf';
} else if (message.stickerMessage) {
  content = '[Figurinha]';
  contentType = 'sticker';
  mimeType = message.stickerMessage.mimetype || 'image/webp';
} else {
  content = '[Mensagem não suportada]';
}

const timestampValue = Number(data.messageTimestamp || 0);
const timestamp = timestampValue
  ? new Date(timestampValue * 1000).toISOString()
  : new Date().toISOString();

return [{ json: {
  event_type: 'message.received',
  whatsapp_msg_id: String(key.id || ''),
  phone,
  remote_jid: remoteJid,
  whatsapp_jid: whatsappJid,
  participant_jid: participantJid,
  sender_name: String(data.pushName || participantJid.split('@')[0].split(':')[0] || 'Participante'),
  contact_name: isGroup ? '' : String(data.pushName || phone),
  group_name: String(data.groupMetadata?.subject || data.group?.subject || ''),
  direction: key.fromMe ? 'out' : 'in',
  content,
  content_type: contentType,
  media_url: null,
  mime_type: mimeType,
  timestamp,
  instance: String(body.instance || '').trim(),
  is_media: ['image', 'audio', 'video', 'document', 'sticker'].includes(contentType),
  is_group: isGroup,
  raw_key: key,
  raw_message: message,
} }];`;

function ifNode(id, name, leftValue, rightValue, position) {
  return {
    id,
    name,
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position,
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'loose',
          version: 2,
        },
        conditions: [{
          id: `${id}-condition`,
          leftValue,
          rightValue,
          operator: { type: typeof rightValue === 'boolean' ? 'boolean' : 'string', operation: 'equals' },
        }],
        combinator: 'and',
      },
      options: {},
    },
  };
}

function deployInbound(inbound) {
  const parser = inbound.nodes.find((node) => node.name === 'Parse Evolution Payload');
  const channelNode = inbound.nodes.find((node) => node.name === 'Fetch Channel Context');
  const upsertNode = inbound.nodes.find((node) => node.name === 'Upsert Contact');
  if (!parser || !channelNode || !upsertNode) throw new Error('Required inbound nodes not found');
  parser.parameters.jsCode = parserCode;

  const supabaseHeaders = structuredClone(channelNode.parameters.headerParameters);
  const contentHeaders = structuredClone(upsertNode.parameters.headerParameters);
  const byName = new Map(inbound.nodes.map((node) => [node.name, node]));

  const desiredNodes = [
    ifNode(
      'prod-is-label-association-20260819',
      'Is Label Association?',
      '={{ $json.event_type }}',
      'label.association',
      [-32, 1400]
    ),
    {
      id: 'prod-fetch-label-channel-20260819',
      name: 'Fetch Label Channel Context',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [200, 1400],
      parameters: {
        method: 'GET',
        url: "=https://rjcuoxvutrrzknicyuev.supabase.co/rest/v1/channels?provider=eq.evolution&instance=eq.{{ encodeURIComponent($('Parse Evolution Payload').first().json.instance) }}&select=id,tenant_id,url,instance,api_key&limit=1",
        sendHeaders: true,
        headerParameters: supabaseHeaders,
        options: { response: { response: { responseFormat: 'json' } } },
      },
    },
    {
      id: 'prod-fetch-label-catalog-20260819',
      name: 'Fetch Evolution Label Catalog',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [430, 1400],
      onError: 'continueRegularOutput',
      parameters: {
        method: 'GET',
        url: "={{ String($json.url || '').replace(/\\/$/, '') + '/label/findLabels/' + encodeURIComponent($json.instance) }}",
        sendHeaders: true,
        headerParameters: { parameters: [{ name: 'apikey', value: '={{ $json.api_key }}' }] },
        options: { response: { response: { responseFormat: 'json' } } },
      },
    },
    {
      id: 'prod-resolve-label-association-20260819',
      name: 'Resolve Label Association',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [660, 1400],
      parameters: {
        jsCode: `const event = $('Parse Evolution Payload').first().json;
const channel = $('Fetch Label Channel Context').first().json;
const incoming = $input.all().map((item) => item.json);
const labels = incoming.flatMap((value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (value && (value.id !== undefined || value.labelId !== undefined)) return [value];
  return [];
});
const label = labels.find((item) => String(item.id ?? item.labelId ?? '') === String(event.label_id));
const labelName = String(label?.name || '').trim();
const chatJid = String(event.label_chat_id || '').trim();
const canUsePhone = /@(s\\.whatsapp\\.net|c\\.us)$/i.test(chatJid);
const phone = canUsePhone ? chatJid.split('@')[0].split(':')[0] : '';
const action = String(event.label_action || '').toLowerCase();
return [{ json: {
  tenant_id: channel.tenant_id,
  channel_id: channel.id,
  chat_jid: chatJid,
  phone,
  label_id: String(event.label_id || ''),
  label_name: labelName,
  label_action: action,
  should_lookup: Boolean(channel.tenant_id && chatJid && labelName && ['add', 'remove'].includes(action)),
} }];`,
      },
    },
    ifNode(
      'prod-can-sync-label-20260819',
      'Can Sync Label?',
      '={{ $json.should_lookup }}',
      true,
      [890, 1400]
    ),
    {
      id: 'prod-fetch-label-contact-20260819',
      name: 'Fetch Label Contact',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [1120, 1400],
      alwaysOutputData: true,
      onError: 'continueRegularOutput',
      parameters: {
        method: 'GET',
        url: "={{ 'https://rjcuoxvutrrzknicyuev.supabase.co/rest/v1/contacts?tenant_id=eq.' + encodeURIComponent($json.tenant_id) + '&or=(whatsapp_jid.eq.' + encodeURIComponent($json.chat_jid) + ($json.phone ? ',phone.eq.' + encodeURIComponent($json.phone) : '') + ')&select=id,tags,phone,whatsapp_jid&limit=1' }}",
        sendHeaders: true,
        headerParameters: supabaseHeaders,
        options: { response: { response: { responseFormat: 'json' } } },
      },
    },
    {
      id: 'prod-prepare-label-tags-20260819',
      name: 'Prepare Label Tags',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1350, 1400],
      parameters: {
        jsCode: `const change = $('Resolve Label Association').first().json;
const contact = $input.first().json || {};
let tags = contact.tags;
if (typeof tags === 'string') {
  try { tags = JSON.parse(tags); } catch { tags = []; }
}
if (!Array.isArray(tags)) tags = [];
tags = [...new Set(tags.filter((tag) => typeof tag === 'string' && tag.trim()))];
const before = JSON.stringify(tags);
if (change.label_action === 'add' && !tags.includes(change.label_name)) {
  tags.push(change.label_name);
}
if (change.label_action === 'remove') {
  tags = tags.filter((tag) => tag !== change.label_name);
}
return [{ json: {
  tenant_id: change.tenant_id,
  contact_id: contact.id || '',
  tags,
  should_update: Boolean(contact.id && JSON.stringify(tags) !== before),
} }];`,
      },
    },
    ifNode(
      'prod-has-label-change-20260819',
      'Has Label Change?',
      '={{ $json.should_update }}',
      true,
      [1580, 1400]
    ),
    {
      id: 'prod-update-contact-labels-20260819',
      name: 'Update Contact Labels',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [1810, 1400],
      onError: 'continueRegularOutput',
      parameters: {
        method: 'PATCH',
        url: '=https://rjcuoxvutrrzknicyuev.supabase.co/rest/v1/contacts?id=eq.{{ encodeURIComponent($json.contact_id) }}&tenant_id=eq.{{ encodeURIComponent($json.tenant_id) }}',
        sendHeaders: true,
        headerParameters: contentHeaders,
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ JSON.stringify({ tags: $json.tags }) }}',
        options: {},
      },
    },
  ];

  for (const desired of desiredNodes) {
    const existing = byName.get(desired.name);
    if (existing) Object.assign(existing, desired);
    else inbound.nodes.push(desired);
  }

  inbound.connections['Parse Evolution Payload'] = {
    main: [[{ node: 'Is Label Association?', type: 'main', index: 0 }]],
  };
  inbound.connections['Is Label Association?'] = {
    main: [
      [{ node: 'Fetch Label Channel Context', type: 'main', index: 0 }],
      [{ node: 'Is Message?', type: 'main', index: 0 }],
    ],
  };
  inbound.connections['Fetch Label Channel Context'] = {
    main: [[{ node: 'Fetch Evolution Label Catalog', type: 'main', index: 0 }]],
  };
  inbound.connections['Fetch Evolution Label Catalog'] = {
    main: [[{ node: 'Resolve Label Association', type: 'main', index: 0 }]],
  };
  inbound.connections['Resolve Label Association'] = {
    main: [[{ node: 'Can Sync Label?', type: 'main', index: 0 }]],
  };
  inbound.connections['Can Sync Label?'] = {
    main: [[{ node: 'Fetch Label Contact', type: 'main', index: 0 }], []],
  };
  inbound.connections['Fetch Label Contact'] = {
    main: [[{ node: 'Prepare Label Tags', type: 'main', index: 0 }]],
  };
  inbound.connections['Prepare Label Tags'] = {
    main: [[{ node: 'Has Label Change?', type: 'main', index: 0 }]],
  };
  inbound.connections['Has Label Change?'] = {
    main: [[{ node: 'Update Contact Labels', type: 'main', index: 0 }], []],
  };
  inbound.connections['Update Contact Labels'] = { main: [[]] };
}

function deployConnector(connector) {
  const webhookNode = connector.nodes.find((node) => node.name === 'Configure Evolution Webhook');
  if (!webhookNode) throw new Error('Connector webhook node not found');
  webhookNode.parameters.jsonBody = webhookNode.parameters.jsonBody
    .replace(/webhookByEvents/g, 'byEvents')
    .replace(/webhookBase64/g, 'base64');
  const body = webhookNode.parameters.jsonBody;
  for (const event of LABEL_EVENTS) {
    if (!body.includes(`'${event}'`) && !body.includes(`\"${event}\"`)) {
      webhookNode.parameters.jsonBody = webhookNode.parameters.jsonBody.replace(
        "'GROUP_PARTICIPANTS_UPDATE'",
        `'GROUP_PARTICIPANTS_UPDATE', '${event}'`
      );
    }
  }
}

async function main() {
  const [inbound, connector] = await Promise.all([
    request(`/workflows/${INBOUND_ID}`),
    request(`/workflows/${CONNECT_ID}`),
  ]);
  deployInbound(inbound);
  deployConnector(connector);
  await updateWorkflow(inbound);
  await updateWorkflow(connector);

  const [updatedInbound, updatedConnector] = await Promise.all([
    request(`/workflows/${INBOUND_ID}`),
    request(`/workflows/${CONNECT_ID}`),
  ]);
  const connectorText = JSON.stringify(updatedConnector);
  console.log(JSON.stringify({
    inboundActive: updatedInbound.active,
    inboundNodes: updatedInbound.nodes.length,
    hasLabelBranch: updatedInbound.nodes.some((node) => node.name === 'Update Contact Labels'),
    parserHandlesAssociation: updatedInbound.nodes
      .find((node) => node.name === 'Parse Evolution Payload')
      ?.parameters?.jsCode?.includes("event === 'labels.association'"),
    connectorActive: updatedConnector.active,
    connectorHasLabelEdit: connectorText.includes('LABELS_EDIT'),
    connectorHasLabelAssociation: connectorText.includes('LABELS_ASSOCIATION'),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
