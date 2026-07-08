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

async function fixFinalNodes() {
  const headers = { 
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYTlkNzM4NDgtNzZhYi00OTM3LWFjMmUtNzhlMDVjNzcxOTE3IiwiaWF0IjoxNzgwNTE2NzgwfQ.Nq0TV5AmJMLrBCImuZanmQPGdOJEj3Cs72ARj-OupzE', 
    'Content-Type': 'application/json', 
    'Accept': 'application/json' 
  };
  
  // FIX META WORKFLOW
  let r = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET', { headers });
  let wf = await r.json();
  
  const insertMeta = wf.nodes.find(n => n.name === 'Insert Message to Supabase');
  if (insertMeta) {
    insertMeta.parameters.bodyParameters.parameters.forEach(p => {
      // In Meta workflow, the node before Upsert Contact is "Has Message?"
      if (typeof p.value === 'string' && p.value.includes("={{ $json.")) {
        p.value = p.value.replace(/=\{\{ \$json\./g, "={{ $('Has Message?').item.json.");
      }
    });
  }
  
  const routingMeta = wf.nodes.find(n => n.name === 'AI Routing Decision');
  if (routingMeta) {
    routingMeta.parameters.jsCode = routingMeta.parameters.jsCode.replace(/\$input\.first\(\)\.json/g, "$('Has Message?').first().json");
  }
  
  let u = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET', { 
    method: 'PUT', headers, body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: getValidSettings(wf.settings) }) 
  });
  console.log("Meta final update:", u.status);
  
  // FIX EVOLUTION WORKFLOW
  r = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { headers });
  wf = await r.json();
  
  const insertEvo = wf.nodes.find(n => n.name === 'Insert Message to Supabase');
  if (insertEvo) {
    insertEvo.parameters.bodyParameters.parameters.forEach(p => {
      // In Evo workflow, the node before Upsert Contact is "Is Message?"
      if (typeof p.value === 'string' && p.value.includes("={{ $json.")) {
        p.value = p.value.replace(/=\{\{ \$json\./g, "={{ $('Is Message?').item.json.");
      }
    });
  }
  
  const logEvo = wf.nodes.find(n => n.name === 'Log Webhook Event');
  if (logEvo) {
    logEvo.parameters.bodyParameters.parameters.forEach(p => {
      if (typeof p.value === 'string' && p.value.includes("={{ $json.")) {
        p.value = p.value.replace(/=\{\{ \$json\./g, "={{ $('Is Message?').item.json.");
      }
    });
  }
  
  const routingEvo = wf.nodes.find(n => n.name === 'AI Routing Decision');
  if (routingEvo) {
    routingEvo.parameters.jsCode = routingEvo.parameters.jsCode.replace(/\$input\.first\(\)\.json/g, "$('Is Message?').first().json");
  }
  
  u = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { 
    method: 'PUT', headers, body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: getValidSettings(wf.settings) }) 
  });
  console.log("Evo final update:", u.status);
}
fixFinalNodes();
