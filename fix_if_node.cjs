const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjM2NDIxYjEtMjcxMy00NDJiLTkwMDAtOTkxOWFhZmQ2MGI0IiwiaWF0IjoxNzc5Mzg1OTI2fQ.jF56nR6RvnHavWrc0pgoon_hGzQIhe0eKWERU98LCuM';
const API_URL = 'https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET';

async function fix() {
  const res = await fetch(API_URL, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const wf = await res.json();

  // Fix: swap the connections on "Has Message?"
  // True branch (skip=true) -> nowhere (we skip it)
  // False branch (skip is undefined/false) -> Upsert Contact (we process it)
  wf.connections['Has Message?'] = {
    main: [
      [],  // True = skip IS true = don't process = go nowhere
      [{ node: 'Upsert Contact', type: 'main', index: 0 }]  // False = skip is NOT true = process message
    ]
  };

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
    console.log("✅ Conexões corrigidas! ID:", result.id);
    console.log("Has Message? connections:", JSON.stringify(result.connections['Has Message?'], null, 2));
  } else {
    console.log("❌ Erro:", JSON.stringify(result, null, 2));
  }
}

fix();
