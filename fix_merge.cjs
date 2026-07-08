const fs = require('fs');

async function fixMergeNodes() {
  const headers = { 
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYTlkNzM4NDgtNzZhYi00OTM3LWFjMmUtNzhlMDVjNzcxOTE3IiwiaWF0IjoxNzgwNTE2NzgwfQ.Nq0TV5AmJMLrBCImuZanmQPGdOJEj3Cs72ARj-OupzE', 
    'Content-Type': 'application/json', 
    'Accept': 'application/json' 
  };
  
  // FIX META WORKFLOW
  let r = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET', { headers });
  let wf = await r.json();
  
  // We want to bypass the "Merge Media flow" node.
  // We will connect "Replace Content with Storage URL" directly to "Has Message?"
  // We will connect "Has Media URL?" (False branch) directly to "Has Message?"
  
  wf.connections['Has Media URL?'].main[1] = [{ node: 'Has Message?', type: 'main', index: 0 }];
  wf.connections['Replace Content with Storage URL'].main[0] = [{ node: 'Has Message?', type: 'main', index: 0 }];
  
  delete wf.connections['Merge Media flow'];
  wf.nodes = wf.nodes.filter(n => n.name !== 'Merge Media flow');
  
  await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET', { 
    method: 'PUT', headers, body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }) 
  });
  
  // FIX EVOLUTION WORKFLOW
  r = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { headers });
  wf = await r.json();
  
  wf.connections['Has Base64?'].main[1] = [{ node: 'Is Message?', type: 'main', index: 0 }];
  wf.connections['Replace Content with Storage URL'].main[0] = [{ node: 'Is Message?', type: 'main', index: 0 }];
  
  delete wf.connections['Merge Media flow'];
  wf.nodes = wf.nodes.filter(n => n.name !== 'Merge Media flow');
  
  await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { 
    method: 'PUT', headers, body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }) 
  });
  
  console.log("Fixed Merge Nodes");
}
fixMergeNodes();
