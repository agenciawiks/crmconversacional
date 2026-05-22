const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjM2NDIxYjEtMjcxMy00NDJiLTkwMDAtOTkxOWFhZmQ2MGI0IiwiaWF0IjoxNzc5Mzg1OTI2fQ.jF56nR6RvnHavWrc0pgoon_hGzQIhe0eKWERU98LCuM';
const API_URL = 'https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET';

async function fix() {
  const res = await fetch(API_URL, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const wf = await res.json();
  
  // Create nodes for GET verification
  const getWebhook = {
    "id": "get-webhook-meta",
    "name": "Meta Verification (GET)",
    "type": "n8n-nodes-base.webhook",
    "typeVersion": 1,
    "position": [ 0, -200 ],
    "parameters": {
      "httpMethod": "GET",
      "path": "meta",
      "responseMode": "responseNode",
      "options": {}
    }
  };

  const respondNode = {
    "id": "respond-meta",
    "name": "Respond Challenge",
    "type": "n8n-nodes-base.respondToWebhook",
    "typeVersion": 1,
    "position": [ 200, -200 ],
    "parameters": {
      "respondWith": "text",
      "responseBody": "={{ $json.query['hub.challenge'] }}",
      "options": {}
    }
  };

  // Check if already added
  if (!wf.nodes.find(n => n.name === "Meta Verification (GET)")) {
    wf.nodes.push(getWebhook, respondNode);
    wf.connections["Meta Verification (GET)"] = {
       "main": [
          [ { "node": "Respond Challenge", "type": "main", "index": 0 } ]
       ]
    };
  }

  const payload = {
     name: wf.name,
     nodes: wf.nodes,
     connections: wf.connections,
     settings: wf.settings
  };

  const updateRes = await fetch(API_URL, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await updateRes.json();
  console.log("Updated workflow:", result);
}

fix();
