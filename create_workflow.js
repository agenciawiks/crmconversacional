const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjM2NDIxYjEtMjcxMy00NDJiLTkwMDAtOTkxOWFhZmQ2MGI0IiwiaWF0IjoxNzc5Mzg1OTI2fQ.jF56nR6RvnHavWrc0pgoon_hGzQIhe0eKWERU98LCuM';
const API_URL = 'https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows';

const workflowsToCreate = [
  {
    "name": "Meta Inbound",
    "settings": {},
    "nodes": [
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "meta-inbound"
        },
        "name": "Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [0, 0]
      },
      {
        "parameters": {
          "responseCode": 200,
          "responseBody": "{\"status\":\"ok\"}",
          "responseMode": "onReceived"
        },
        "name": "Respond",
        "type": "n8n-nodes-base.respond",
        "typeVersion": 1,
        "position": [400, 0]
      }
    ],
    "connections": {
      "Webhook": {
        "main": [[{"node": "Respond", "type": "main", "index": 0}]]
      }
    }
  },
  {
    "name": "Evolution Inbound",
    "settings": {},
    "nodes": [
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "evolution-inbound"
        },
        "name": "Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [0, 0]
      },
      {
        "parameters": {
          "responseCode": 200,
          "responseBody": "{\"status\":\"ok\"}",
          "responseMode": "onReceived"
        },
        "name": "Respond",
        "type": "n8n-nodes-base.respond",
        "typeVersion": 1,
        "position": [400, 0]
      }
    ],
    "connections": {
      "Webhook": {
        "main": [[{"node": "Respond", "type": "main", "index": 0}]]
      }
    }
  },
  {
    "name": "Outbound Router",
    "settings": {},
    "nodes": [
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "outbound"
        },
        "name": "Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [0, 0]
      },
      {
        "parameters": {
          "method": "POST",
          "url": "https://example.com/api/send",
          "sendBody": true,
          "bodyParameters": {
            "parameters": [
              {"name": "message", "value": "={{$json.body.message}}"}
            ]
          }
        },
        "name": "HTTP Request",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 3,
        "position": [400, 0]
      }
    ],
    "connections": {
      "Webhook": {
        "main": [[{"node": "HTTP Request", "type": "main", "index": 0}]]
      }
    }
  }
];

async function createWorkflows() {
  for (const wf of workflowsToCreate) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(wf)
      });
      
      const data = await response.json();
      console.log(`Created ${wf.name} - Status: ${response.status}`);
    } catch (err) {
      console.error(`Error creating ${wf.name}:`, err);
    }
  }
}

createWorkflows();
