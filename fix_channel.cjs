const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjM2NDIxYjEtMjcxMy00NDJiLTkwMDAtOTkxOWFhZmQ2MGI0IiwiaWF0IjoxNzc5Mzg1OTI2fQ.jF56nR6RvnHavWrc0pgoon_hGzQIhe0eKWERU98LCuM';
const WF_URL = 'https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET';

async function fix() {
  const res = await fetch(WF_URL, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const wf = await res.json();

  // Fix "Build Message Payload" - remove channel
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
    content:         original.content,
    content_type:    original.content_type,
    direction:       original.direction,
    timestamp:       original.timestamp,
    media_url:       original.media_url
  }
}];`;
    console.log('✅ Fixed Build Message Payload (removed channel)');
  }

  // Fix "Insert Message" - remove channel from JSON body
  const insertNode = wf.nodes.find(n => n.name === 'Insert Message');
  if (insertNode) {
    insertNode.parameters.jsonBody = '={\n  "whatsapp_msg_id": "{{ $json.whatsapp_msg_id }}",\n  "contact_id": "{{ $json.contact_id }}",\n  "content": "{{ $json.content }}",\n  "content_type": "{{ $json.content_type }}",\n  "direction": "{{ $json.direction }}",\n  "timestamp": "{{ $json.timestamp }}",\n  "media_url": {{ $json.media_url ? \'"\' + $json.media_url + \'"\' : \'null\' }}\n}';
    console.log('✅ Fixed Insert Message (removed channel)');
  }

  const payload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: {}
  };

  const updateRes = await fetch(WF_URL, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await updateRes.json();
  if (result.id) {
    console.log('\n✅ Workflow atualizado! ID:', result.id);
  } else {
    console.log('\n❌ Erro:', JSON.stringify(result, null, 2));
  }
}

fix();
