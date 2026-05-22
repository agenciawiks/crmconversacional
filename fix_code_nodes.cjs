const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjM2NDIxYjEtMjcxMy00NDJiLTkwMDAtOTkxOWFhZmQ2MGI0IiwiaWF0IjoxNzc5Mzg1OTI2fQ.jF56nR6RvnHavWrc0pgoon_hGzQIhe0eKWERU98LCuM';
const API_URL = 'https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET';

const SUPABASE_URL = 'https://ibyterftfrqgkhktkaeg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8';

const parseMetaCode = `const body = $input.first().json.body || $input.first().json;

const entry = body.entry?.[0];
const changes = entry?.changes?.[0];
const value = changes?.value;
const message = value?.messages?.[0];
const contact = value?.contacts?.[0];

if (!message) {
  return [{ json: { skip: true, reason: 'No message in payload' } }];
}

return [{
  json: {
    whatsapp_msg_id: message.id,
    phone: message.from,
    contact_name: contact?.profile?.name || message.from,
    direction: 'in',
    content: message.text?.body || message.caption || '[media]',
    content_type: message.type || 'text',
    media_url: null,
    timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString()
  }
}];`;

const upsertContactCode = `const item = $input.first().json;

const contactRes = await fetch('${SUPABASE_URL}/rest/v1/contacts', {
  method: 'POST',
  headers: {
    'apikey': '${SUPABASE_KEY}',
    'Authorization': 'Bearer ${SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=representation'
  },
  body: JSON.stringify({
    phone: item.phone,
    name: item.contact_name
  })
});

let contactId = null;
try {
  const contactData = await contactRes.json();
  contactId = contactData?.[0]?.id || null;
} catch(e) {}

return [{
  json: {
    ...item,
    contact_id: contactId
  }
}];`;

async function fix() {
  const res = await fetch(API_URL, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const wf = await res.json();

  console.log("ANTES - nodes:");
  wf.nodes.forEach((n, i) => console.log(`  [${i}] ${n.name} (${n.type})`));

  // 1. Remove "Code in JavaScript" node (the myNewField one)
  wf.nodes = wf.nodes.filter(n => n.name !== 'Code in JavaScript');

  // 2. Check if Parse Meta Payload exists, if not add it
  const hasParseMeta = wf.nodes.find(n => n.name === 'Parse Meta Payload');
  if (!hasParseMeta) {
    console.log("  -> Adding Parse Meta Payload node");
    wf.nodes.push({
      parameters: {
        jsCode: parseMetaCode,
        mode: 'runOnceForAllItems'
      },
      id: 'node-parse-meta',
      name: 'Parse Meta Payload',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [480, 300]
    });
  } else {
    hasParseMeta.parameters = { jsCode: parseMetaCode, mode: 'runOnceForAllItems' };
    console.log("  -> Updated Parse Meta Payload");
  }

  // 3. Fix Upsert Contact
  const upsertNode = wf.nodes.find(n => n.name === 'Upsert Contact');
  if (upsertNode) {
    delete upsertNode.parameters.functionCode;
    upsertNode.parameters.jsCode = upsertContactCode;
    upsertNode.parameters.mode = 'runOnceForAllItems';
    console.log("  -> Fixed Upsert Contact");
  }

  // 4. Ensure connections are correct
  wf.connections['Webhook'] = {
    main: [[{ node: 'Parse Meta Payload', type: 'main', index: 0 }]]
  };
  wf.connections['Parse Meta Payload'] = {
    main: [[{ node: 'Has Message?', type: 'main', index: 0 }]]
  };
  wf.connections['Has Message?'] = {
    main: [
      [{ node: 'Upsert Contact', type: 'main', index: 0 }],
      []
    ]
  };
  wf.connections['Upsert Contact'] = {
    main: [[{ node: 'Insert Message to Supabase', type: 'main', index: 0 }]]
  };
  wf.connections['Insert Message to Supabase'] = {
    main: [[{ node: 'Log Webhook Event', type: 'main', index: 0 }]]
  };

  // Remove stale connection
  delete wf.connections['Code in JavaScript'];

  console.log("\nDEPOIS - nodes:");
  wf.nodes.forEach((n, i) => console.log(`  [${i}] ${n.name} (${n.type})`));

  // 5. Update workflow (settings must be empty object, no extra props)
  const payload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: {}
  };

  const updateRes = await fetch(API_URL, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await updateRes.json();
  if (result.id) {
    console.log("\n✅ Workflow atualizado! ID:", result.id);
    console.log("Nodes finais:", result.nodes?.length);
  } else {
    console.log("\n❌ Erro:", JSON.stringify(result, null, 2));
  }
}

fix();
