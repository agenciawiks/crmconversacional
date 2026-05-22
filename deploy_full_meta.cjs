const fs = require('fs');
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjM2NDIxYjEtMjcxMy00NDJiLTkwMDAtOTkxOWFhZmQ2MGI0IiwiaWF0IjoxNzc5Mzg1OTI2fQ.jF56nR6RvnHavWrc0pgoon_hGzQIhe0eKWERU98LCuM';
const API_URL = 'https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET';

async function deploy() {
  
  // Read full JSON
  const raw = fs.readFileSync('n8n-workflows/meta-inbound-webhook.json', 'utf8');
  const fullWf = JSON.parse(raw);
  
  // Ensure the webhook trigger is pointing to meta-inbound
  const mainWebhook = fullWf.nodes.find(n => n.name === 'Meta Webhook Trigger');
  if (mainWebhook) {
      mainWebhook.parameters.path = "meta-inbound";
  }

  // Add GET verification
  const getWebhook = {
    "id": "get-webhook-meta",
    "name": "Meta Verification (GET)",
    "type": "n8n-nodes-base.webhook",
    "typeVersion": 1,
    "position": [ 240, 100 ],
    "parameters": {
      "httpMethod": "GET",
      "path": "meta-inbound",
      "responseMode": "responseNode",
      "options": {}
    }
  };

  const respondNode = {
    "id": "respond-meta",
    "name": "Respond Challenge",
    "type": "n8n-nodes-base.respondToWebhook",
    "typeVersion": 1,
    "position": [ 480, 100 ],
    "parameters": {
      "respondWith": "text",
      "responseBody": "={{ $json.query['hub.challenge'] }}",
      "options": {}
    }
  };

  fullWf.nodes.push(getWebhook, respondNode);
  fullWf.connections["Meta Verification (GET)"] = {
    "main": [ [ { "node": "Respond Challenge", "type": "main", "index": 0 } ] ]
  };

  const payload = {
     name: 'Meta Inbound',
     nodes: fullWf.nodes,
     settings: {}
  };

  const updateRes = await fetch(API_URL, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await updateRes.json();
  console.log("Deployed Meta Inbound:", result.id || result);
}

deploy();
