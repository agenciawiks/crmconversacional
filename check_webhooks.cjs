const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjM2NDIxYjEtMjcxMy00NDJiLTkwMDAtOTkxOWFhZmQ2MGI0IiwiaWF0IjoxNzc5Mzg1OTI2fQ.jF56nR6RvnHavWrc0pgoon_hGzQIhe0eKWERU98LCuM';
const API_URL = 'https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET';

async function checkWf() {
  const res = await fetch(API_URL, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const wf = await res.json();
  console.log("Nodes:");
  wf.nodes.forEach(n => {
    if(n.type === 'n8n-nodes-base.webhook') {
      console.log(n.name, n.parameters.httpMethod, n.parameters.path, n.webhookId);
    }
  });
}
checkWf();
