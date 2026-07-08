const fs = require('fs');

function getValidSettings(settings) {
  const valid = {};
  if (settings) {
    if (settings.executionOrder) valid.executionOrder = settings.executionOrder;
    if (settings.errorWorkflow) valid.errorWorkflow = settings.errorWorkflow;
    if (settings.timezone) valid.timezone = settings.timezone;
    if (settings.saveExecutionProgress) valid.saveExecutionProgress = settings.saveExecutionProgress;
    if (settings.saveManualExecutions) valid.saveManualExecutions = settings.saveManualExecutions;
    if (settings.callerPolicy) valid.callerPolicy = settings.callerPolicy;
  }
  return valid;
}

async function fixUpsert() {
  const headers = { 
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYTlkNzM4NDgtNzZhYi00OTM3LWFjMmUtNzhlMDVjNzcxOTE3IiwiaWF0IjoxNzgwNTE2NzgwfQ.Nq0TV5AmJMLrBCImuZanmQPGdOJEj3Cs72ARj-OupzE', 
    'Content-Type': 'application/json', 
    'Accept': 'application/json' 
  };
  
  // FIX META WORKFLOW
  let r = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET', { headers });
  let wf = await r.json();
  
  const upsertMeta = wf.nodes.find(n => n.name === 'Upsert Contact');
  if (upsertMeta) {
    upsertMeta.parameters.jsonBody = "={{ JSON.stringify(Object.assign({ phone: $json.phone }, $json.direction === 'in' && $json.contact_name ? { name: $json.contact_name } : {})) }}";
  }
  
  let u = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET', { 
    method: 'PUT', headers, body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: getValidSettings(wf.settings) }) 
  });
  console.log("Meta upsert fix:", u.status);
  
  // FIX EVOLUTION WORKFLOW
  r = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { headers });
  wf = await r.json();
  
  const upsertEvo = wf.nodes.find(n => n.name === 'Upsert Contact');
  if (upsertEvo) {
    upsertEvo.parameters.jsonBody = "={{ JSON.stringify(Object.assign({ phone: $json.phone }, $json.direction === 'in' && $json.contact_name ? { name: $json.contact_name } : {})) }}";
  }
  
  u = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { 
    method: 'PUT', headers, body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: getValidSettings(wf.settings) }) 
  });
  console.log("Evo upsert fix:", u.status);
}
fixUpsert();
