const fs = require('fs');

const headers = { 
  'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg', 
  'Content-Type': 'application/json', 
  'Accept': 'application/json' 
};

async function fix() {
  const r = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/NFkf4R8DDJ2o7Sqx', { headers });
  if (!r.ok) {
    console.error('Failed to fetch workflow:', r.status, await r.text());
    return;
  }
  const wf = await r.json();
  
  // 1. Fix Send via Meta API
  const metaNode = wf.nodes.find(n => n.name === 'Send via Meta API');
  if (metaNode) {
    metaNode.parameters.jsonBody = "={{ { messaging_product: 'whatsapp', to: $json.phone, type: 'text', text: { body: $json.content } } }}";
    console.log('Fixed Send via Meta API node');
  }

  // 2. Fix Send via Instagram API
  const igNode = wf.nodes.find(n => n.name === 'Send via Instagram API');
  if (igNode) {
    igNode.parameters.jsonBody = "={{ { recipient: { id: $json.phone }, message: { text: $json.content } } }}";
    console.log('Fixed Send via Instagram API node');
  }

  // 3. Fix Send via Evolution API
  const evoNode = wf.nodes.find(n => n.name === 'Send via Evolution API');
  if (evoNode) {
    evoNode.parameters.jsonBody = "={{ { number: $json.phone + '@s.whatsapp.net', text: $json.content } }}";
    console.log('Fixed Send via Evolution API node');
  }

  // Clean settings
  const validSettings = {};
  if (wf.settings) {
    if (wf.settings.executionOrder) validSettings.executionOrder = wf.settings.executionOrder;
    if (wf.settings.errorWorkflow) validSettings.errorWorkflow = wf.settings.errorWorkflow;
    if (wf.settings.timezone) validSettings.timezone = wf.settings.timezone;
    if (wf.settings.saveExecutionProgress) validSettings.saveExecutionProgress = wf.settings.saveExecutionProgress;
    if (wf.settings.saveManualExecutions) validSettings.saveManualExecutions = wf.settings.saveManualExecutions;
    if (wf.settings.callerPolicy) validSettings.callerPolicy = wf.settings.callerPolicy;
  }

  const body = { 
    name: wf.name || 'WhatsApp – Outbound Send Message', 
    nodes: wf.nodes, 
    connections: wf.connections, 
    settings: validSettings 
  };
  
  const u = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/NFkf4R8DDJ2o7Sqx', { 
    method: 'PUT', 
    headers, 
    body: JSON.stringify(body) 
  });
  if (u.ok) {
    console.log('Successfully updated Outbound workflow on n8n!');
  } else {
    console.error('Failed to update workflow:', u.status, await u.text());
  }
}

fix();
