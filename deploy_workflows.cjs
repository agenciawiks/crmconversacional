const fs = require('fs');
const path = require('path');

const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";
const workflowsDir = path.join(__dirname, 'n8n-workflows');

async function deploy() {
  try {
    // 1. Get existing workflows
    const response = await fetch(`${baseUrl}/workflows?limit=100`, {
      headers: { 'X-N8N-API-KEY': apiKey }
    });

    if (!response.ok) {
      console.error('Failed to fetch workflows:', response.status, await response.text());
      return;
    }

    const data = await response.json();
    const existingWorkflows = data.data || [];
    const nameToIdMap = {};
    existingWorkflows.forEach(wf => {
      nameToIdMap[wf.name] = wf.id;
    });

    // 2. Read local workflows
    const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(workflowsDir, file);
      const wfData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const wfName = wfData.name;

      // Ensure nodes have nodeVersion (required by n8n API sometimes)
      wfData.nodes = wfData.nodes.map(n => {
         if (!n.typeVersion) n.typeVersion = 1;
         return n;
      });

      const existingId = nameToIdMap[wfName];
      let res;

      const payload = {
        name: wfData.name,
        nodes: wfData.nodes,
        connections: wfData.connections,
        settings: wfData.settings || {}
      };

      if (existingId) {
        // Update
        res = await fetch(`${baseUrl}/workflows/${existingId}`, {
          method: 'PUT',
          headers: {
            'X-N8N-API-KEY': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Create
        res = await fetch(`${baseUrl}/workflows`, {
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        console.log(`Successfully deployed: ${wfName} (${existingId ? 'Updated ' + existingId : 'Created'})`);
      } else {
        console.error(`Failed to deploy ${wfName}:`, res.status, await res.text());
      }
    }
  } catch (e) {
    console.error('Deployment error:', e);
  }
}

deploy();
