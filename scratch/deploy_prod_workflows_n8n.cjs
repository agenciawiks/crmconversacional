const fs = require('fs');

const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";

const workflows = [
  { name: 'Produção - Evolution Inbound', file: 'scratch/prod_evolution_inbound.json' },
  { name: 'Produção - Outbound Send Message', file: 'scratch/prod_outbound_send.json' },
  { name: 'Produção - Followup Dispatcher', file: 'scratch/prod_followup_dispatcher.json' },
  { name: 'Produção - Central AI Agent', file: 'scratch/prod_central_ai_agent.json' }
];

async function run() {
  console.log("Checking connection with n8n API...");
  const checkRes = await fetch(`${baseUrl}/workflows?limit=1`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  if (!checkRes.ok) {
    console.error("Failed to connect to n8n API. Status:", checkRes.status, await checkRes.text());
    process.exit(1);
  }
  console.log("Authentication successful! Listing existing workflows to check for duplicates...");
  const listRes = await checkRes.json();
  
  // Let's get all workflows to check if they already exist
  const allRes = await fetch(`${baseUrl}/workflows?limit=250`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const allData = await allRes.json();
  const existingWorkflows = allData.data || [];

  for (const wf of workflows) {
    console.log(`\nProcessing ${wf.name}...`);
    if (!fs.existsSync(wf.file)) {
      console.warn(`File ${wf.file} not found, skipping.`);
      continue;
    }
    const localContent = JSON.parse(fs.readFileSync(wf.file, 'utf8'));

    // Check if a workflow with this name already exists
    const duplicate = existingWorkflows.find(w => w.name === wf.name);
    
    let wfId;
    let urlMethod = 'POST';
    let urlPath = `${baseUrl}/workflows`;
    
    if (duplicate) {
      console.log(`Workflow "${wf.name}" already exists with ID ${duplicate.id}. We will update it.`);
      wfId = duplicate.id;
      urlMethod = 'PUT';
      urlPath = `${baseUrl}/workflows/${wfId}`;
    }

    const body = {
      name: wf.name,
      nodes: localContent.nodes,
      connections: localContent.connections,
      settings: {}
    };

    const res = await fetch(urlPath, {
      method: urlMethod,
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      console.error(`Failed to upload ${wf.name}. Status: ${res.status}`, await res.text());
      continue;
    }

    const result = await res.json();
    wfId = result.id;
    console.log(`Workflow ${wf.name} saved successfully with ID ${wfId}!`);

    // Let's activate the workflow (except AI agent if not needed, but let's activate all for now)
    // Wait, the user said the AI agent is not used yet, so we can keep it deactivated, but let's activate the inbound, outbound, and followup dispatcher!
    if (wf.name !== 'Produção - Central AI Agent') {
      console.log(`Activating workflow ${wfId}...`);
      const actRes = await fetch(`${baseUrl}/workflows/${wfId}/activate`, {
        method: 'POST',
        headers: { 'X-N8N-API-KEY': apiKey }
      });
      if (actRes.ok) {
        console.log(`Workflow ${wf.name} activated successfully!`);
      } else {
        console.warn(`Failed to activate workflow ${wf.name}. Status: ${actRes.status}`);
      }
    } else {
      console.log(`Keeping ${wf.name} deactivated (as it is not used yet).`);
    }

    // Print the webhook triggers if any
    const webhookNode = result.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
    if (webhookNode) {
      // In n8n, webhook path is webhook/uuid or webhook-test/uuid
      const path = webhookNode.parameters?.path || webhookNode.id;
      const httpMethod = webhookNode.parameters?.httpMethod || 'GET';
      console.log(`Webhook Trigger Node: "${webhookNode.name}"`);
      console.log(`  Path: /webhook/${path}`);
      console.log(`  Full Webhook URL: https://n8n-n8n.rh3fr2.easypanel.host/webhook/${path}`);
    }
  }
}

run().catch(console.error);
