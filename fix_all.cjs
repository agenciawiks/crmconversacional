const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjM2NDIxYjEtMjcxMy00NDJiLTkwMDAtOTkxOWFhZmQ2MGI0IiwiaWF0IjoxNzc5Mzg1OTI2fQ.jF56nR6RvnHavWrc0pgoon_hGzQIhe0eKWERU98LCuM';
const META_WF_URL = 'https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET';
const OUTBOUND_WF_URL = 'https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/NFkf4R8DDJ2o7Sqx';
const SUPABASE_URL = 'https://ibyterftfrqgkhktkaeg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8';
const CHANNEL_ID = '4886443e-4996-4d2a-83e1-d96f503e1a28';

async function fixMetaInbound() {
  console.log('\n=== FIXING META INBOUND ===');
  const res = await fetch(META_WF_URL, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const wf = await res.json();

  // Fix Build Message Payload to include channel_id
  const buildNode = wf.nodes.find(n => n.name === 'Build Message Payload');
  if (buildNode) {
    buildNode.parameters.jsCode = `const upsertResult = $input.first().json;

let contactId = null;
if (Array.isArray(upsertResult)) {
  contactId = upsertResult[0]?.id || null;
} else {
  contactId = upsertResult?.id || null;
}

const original = $('Parse Meta Payload').first().json;

return [{
  json: {
    whatsapp_msg_id: original.whatsapp_msg_id,
    contact_id:      contactId,
    channel_id:      '${CHANNEL_ID}',
    content:         original.content,
    content_type:    original.content_type,
    direction:       original.direction,
    timestamp:       original.timestamp,
    media_url:       original.media_url
  }
}];`;
    console.log('  ✅ Build Message Payload: added channel_id');
  }

  // Fix Insert Message to include channel_id in the body
  const insertNode = wf.nodes.find(n => n.name === 'Insert Message');
  if (insertNode) {
    insertNode.parameters.jsonBody = `={
  "whatsapp_msg_id": "{{ $json.whatsapp_msg_id }}",
  "contact_id": "{{ $json.contact_id }}",
  "channel_id": "{{ $json.channel_id }}",
  "content": "{{ $json.content }}",
  "content_type": "{{ $json.content_type }}",
  "direction": "{{ $json.direction }}",
  "timestamp": "{{ $json.timestamp }}",
  "media_url": {{ $json.media_url ? '"' + $json.media_url + '"' : 'null' }}
}`;
    console.log('  ✅ Insert Message: added channel_id to body');
  }

  const payload = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: {} };
  const updateRes = await fetch(META_WF_URL, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await updateRes.json();
  console.log('  Meta Inbound saved:', result.id ? '✅' : '❌', result.id || JSON.stringify(result));
}

async function fixOutboundRouter() {
  console.log('\n=== FIXING OUTBOUND ROUTER ===');
  const res = await fetch(OUTBOUND_WF_URL, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const wf = await res.json();

  // The Resolve Channel node fetches from Supabase channels table using $env vars.
  // Check if n8n has the env vars set. If not, we hardcode the Supabase URL/key.
  const resolveNode = wf.nodes.find(n => n.name === 'Resolve Channel');
  if (resolveNode) {
    resolveNode.parameters.jsCode = `// Resolve channel from Supabase
const channelId = $json.body?.channel_id || $json.channel_id;
const content = $json.body?.content || $json.content;
const phone = $json.body?.phone || $json.phone;
const contactId = $json.body?.contact_id || $json.contact_id;

const SUPA_URL = $env.SUPABASE_URL || '${SUPABASE_URL}';
const SUPA_KEY = $env.SUPABASE_SERVICE_KEY || '${SUPABASE_KEY}';

let channel = null;

if (channelId) {
  const channelResp = await $helpers.httpRequest({
    method: 'GET',
    url: SUPA_URL + '/rest/v1/channels?id=eq.' + channelId + '&select=*',
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY
    }
  });
  channel = channelResp?.[0];
}

// Fallback: if no channel_id or not found, get the first active meta channel
if (!channel) {
  const fallbackResp = await $helpers.httpRequest({
    method: 'GET',
    url: SUPA_URL + '/rest/v1/channels?provider=eq.meta&status=eq.active&limit=1',
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY
    }
  });
  channel = fallbackResp?.[0];
}

if (!channel) {
  throw new Error('No active channel found');
}

return [{
  json: {
    channel_id: channel.id,
    contact_id: contactId,
    provider: channel.provider,
    content: content,
    phone: phone,
    phone_id: channel.phone_id,
    access_token: channel.access_token,
    evo_url: channel.url,
    evo_instance: channel.instance,
    evo_api_key: channel.api_key
  }
}];`;
    // Also update to Code v2 which uses jsCode
    resolveNode.typeVersion = 2;
    delete resolveNode.parameters.functionCode;
    console.log('  ✅ Resolve Channel: hardcoded Supabase fallback + channel fallback');
  }

  // Fix Log Outgoing Message to also include contact_id
  const logNode = wf.nodes.find(n => n.name === 'Log Outgoing Message');
  if (logNode) {
    logNode.parameters.url = `${SUPABASE_URL}/rest/v1/messages`;
    logNode.parameters.headerParameters = {
      parameters: [
        { name: 'apikey', value: SUPABASE_KEY },
        { name: 'Authorization', value: `Bearer ${SUPABASE_KEY}` },
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Prefer', value: 'return=representation' }
      ]
    };
    logNode.parameters.specifyBody = 'json';
    logNode.parameters.jsonBody = `={
  "channel_id": "{{ $json.channel_id }}",
  "contact_id": "{{ $json.contact_id }}",
  "direction": "out",
  "content": "{{ $json.content }}",
  "content_type": "text",
  "timestamp": "{{ new Date().toISOString() }}"
}`;
    delete logNode.parameters.bodyParameters;
    console.log('  ✅ Log Outgoing Message: hardcoded Supabase creds + added contact_id');
  }

  // Fix Response OK to use jsCode (v2)
  const respondNode = wf.nodes.find(n => n.name === 'Response OK');
  if (respondNode) {
    respondNode.parameters.jsCode = `return [{ json: { success: true, message: 'Mensagem enviada com sucesso' } }];`;
    respondNode.typeVersion = 2;
    delete respondNode.parameters.functionCode;
    console.log('  ✅ Response OK: upgraded to v2');
  }

  const payload = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: {} };
  const updateRes = await fetch(OUTBOUND_WF_URL, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await updateRes.json();
  console.log('  Outbound Router saved:', result.id ? '✅' : '❌', result.id || JSON.stringify(result));
}

async function fixExistingMessages() {
  console.log('\n=== FIXING EXISTING MESSAGES (setting channel_id) ===');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?channel_id=is.null`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ channel_id: CHANNEL_ID })
  });
  const updated = await res.json();
  console.log(`  ✅ Updated ${updated.length} messages with channel_id`);
}

async function enableRealtime() {
  console.log('\n=== ENABLING REALTIME ===');
  // We can't run DDL via REST, but we can use the Supabase Management API
  // or instruct the user. Let's check if it works first.
  console.log('  ⚠️  The user needs to run this SQL in Supabase Dashboard:');
  console.log('     ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;');
  console.log('     ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;');
}

async function main() {
  await fixMetaInbound();
  await fixOutboundRouter();
  await fixExistingMessages();
  await enableRealtime();
  console.log('\n🎉 ALL DONE!');
}

main().catch(e => console.error('FATAL:', e));
