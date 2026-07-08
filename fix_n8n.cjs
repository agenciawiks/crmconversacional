const fs = require('fs');

async function fixN8nNodes() {
  const headers = { 
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYTlkNzM4NDgtNzZhYi00OTM3LWFjMmUtNzhlMDVjNzcxOTE3IiwiaWF0IjoxNzgwNTE2NzgwfQ.Nq0TV5AmJMLrBCImuZanmQPGdOJEj3Cs72ARj-OupzE', 
    'Content-Type': 'application/json', 
    'Accept': 'application/json' 
  };
  
  // FIX META WORKFLOW
  let r = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET', { headers });
  let wf = await r.json();
  
  // Fix "Insert Message to Supabase" to use $json instead of $('Parse Meta Payload').item.json
  const insertMeta = wf.nodes.find(n => n.name === 'Insert Message to Supabase');
  if (insertMeta) {
    insertMeta.parameters.bodyParameters.parameters.forEach(p => {
      if (typeof p.value === 'string' && p.value.includes("$('Parse Meta Payload')")) {
        p.value = p.value.replace(/\$\('Parse Meta Payload'\)\.item\.json/g, '$json');
      }
    });
  }
  
  // Also fix AI Routing Decision to use $json instead of $('Parse Meta Payload')
  const routingMeta = wf.nodes.find(n => n.name === 'AI Routing Decision');
  if (routingMeta) {
    routingMeta.parameters.jsCode = routingMeta.parameters.jsCode.replace(/\$\('Parse Meta Payload'\)\.first\(\)\.json/g, '$input.first().json');
  }

  // Also fix "Replace Content with Storage URL" to set media_url as well
  const replaceMeta = wf.nodes.find(n => n.name === 'Replace Content with Storage URL');
  if (replaceMeta) {
    replaceMeta.parameters.jsCode = `
const original = $('Parse Meta Payload').first().json;
const publicUrl = "https://ibyterftfrqgkhktkaeg.supabase.co/storage/v1/object/public/media/" + original.whatsapp_msg_id + "_" + ($binary.data.fileName || 'media');
original.content = publicUrl;
original.media_url = publicUrl;
return [{ json: original }];
`;
  }
  
  await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET', { 
    method: 'PUT', headers, body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }) 
  });
  
  
  // FIX EVOLUTION WORKFLOW
  r = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { headers });
  wf = await r.json();
  
  // Fix "Insert Message to Supabase"
  const insertEvo = wf.nodes.find(n => n.name === 'Insert Message to Supabase');
  if (insertEvo) {
    insertEvo.parameters.bodyParameters.parameters.forEach(p => {
      if (typeof p.value === 'string' && p.value.includes("$('Parse Evolution Payload')")) {
        p.value = p.value.replace(/\$\('Parse Evolution Payload'\)\.item\.json/g, '$json');
      }
    });
  }
  
  // Fix "Log Webhook Event"
  const logEvo = wf.nodes.find(n => n.name === 'Log Webhook Event');
  if (logEvo) {
    logEvo.parameters.bodyParameters.parameters.forEach(p => {
      if (typeof p.value === 'string' && p.value.includes("$('Parse Evolution Payload')")) {
        p.value = p.value.replace(/\$\('Parse Evolution Payload'\)\.item\.json/g, '$json');
      }
    });
  }
  
  // Fix AI Routing Decision
  const routingEvo = wf.nodes.find(n => n.name === 'AI Routing Decision');
  if (routingEvo) {
    routingEvo.parameters.jsCode = routingEvo.parameters.jsCode.replace(/\$\('Parse Evolution Payload'\)\.first\(\)\.json/g, '$input.first().json');
  }

  // Fix "Replace Content with Storage URL"
  const replaceEvo = wf.nodes.find(n => n.name === 'Replace Content with Storage URL');
  if (replaceEvo) {
    replaceEvo.parameters.jsCode = `
const original = $('Parse Evolution Payload').first().json;
const publicUrl = "https://ibyterftfrqgkhktkaeg.supabase.co/storage/v1/object/public/media/" + original.whatsapp_msg_id + "_" + original.content_type;
original.content = publicUrl;
original.media_url = publicUrl;
return [{ json: original }];
`;
  }
  
  await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { 
    method: 'PUT', headers, body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }) 
  });
  
  console.log("Fixed N8N node variables");
}
fixN8nNodes();
