const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";

async function run() {
  const r = await fetch(`${baseUrl}/workflows/qzJptf3XgjdxpZG5`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  if (r.ok) {
    const data = await r.json();
    fs.writeFileSync('scratch/active_central_ai_agent.json', JSON.stringify(data, null, 2));
    console.log('Saved active Central AI Agent definition to scratch/active_central_ai_agent.json');
  } else {
    console.error('Error fetching workflow:', r.status);
  }
}

const fs = require('fs');
run();
