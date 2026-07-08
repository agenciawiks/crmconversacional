const fs = require('fs');

const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";
const wfId = "5xAFBcfRezaeB0pv";

async function deploy() {
  const filePath = 'n8n-workflows/followup-dispatcher.json';
  console.log(`Reading local workflow from ${filePath}...`);
  const localWf = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const body = {
    name: localWf.name,
    nodes: localWf.nodes,
    connections: localWf.connections,
    settings: localWf.settings || {}
  };

  console.log(`Sending PUT request to update workflow ${wfId}...`);
  const response = await fetch(`${baseUrl}/workflows/${wfId}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    console.error(`Failed to update workflow: ${response.status}`, await response.text());
    return;
  }

  const result = await response.json();
  console.log('Workflow updated successfully:', result);

  // Now, let's make sure it is activated
  console.log(`Activating workflow ${wfId}...`);
  const activateResponse = await fetch(`${baseUrl}/workflows/${wfId}/activate`, {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': apiKey
    }
  });

  if (activateResponse.ok) {
    console.log('Workflow activated successfully!');
  } else {
    console.log('Workflow activation status (it might already be active):', activateResponse.status, await activateResponse.text());
  }
}

deploy().catch(console.error);
