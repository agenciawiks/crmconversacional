const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjM2NDIxYjEtMjcxMy00NDJiLTkwMDAtOTkxOWFhZmQ2MGI0IiwiaWF0IjoxNzc5Mzg1OTI2fQ.jF56nR6RvnHavWrc0pgoon_hGzQIhe0eKWERU98LCuM';
const API_URL = 'https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET';

async function fix() {
  const res = await fetch(API_URL, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const wf = await res.json();

  const upsertNode = wf.nodes.find(n => n.name === 'Upsert Contact');
  if (upsertNode && upsertNode.parameters.url) {
    upsertNode.parameters.url = upsertNode.parameters.url.replace(
      '/rest/v1/contacts',
      '/rest/v1/contacts?on_conflict=phone'
    );
  }

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
  console.log("Meta Inbound updated:", result.id);
}
fix();
