const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjM2NDIxYjEtMjcxMy00NDJiLTkwMDAtOTkxOWFhZmQ2MGI0IiwiaWF0IjoxNzc5Mzg1OTI2fQ.jF56nR6RvnHavWrc0pgoon_hGzQIhe0eKWERU98LCuM';
const API_URL = 'https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows';

const newRespondNode = {
  "parameters": {
    "respondWith": "json",
    "responseBody": "{\n  \"status\": \"ok\"\n}",
    "options": {}
  },
  "name": "Respond to Webhook",
  "type": "n8n-nodes-base.respondToWebhook",
  "typeVersion": 1,
  "position": [400, 0]
};

async function fixWorkflows() {
  try {
    const res = await fetch(API_URL, {
      headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const data = await res.json();
    
    if (!data.data) {
       console.log("Failed to fetch workflows", data);
       return;
    }
    
    const targetNames = ["Chatwoot Inbound", "Meta Inbound", "Evolution Inbound"];
    const workflowsToUpdate = data.data.filter(wf => targetNames.includes(wf.name));
    
    for (const wf of workflowsToUpdate) {
      // 1. Delete old
      await fetch(`${API_URL}/${wf.id}`, {
        method: 'DELETE',
        headers: { 'X-N8N-API-KEY': API_KEY }
      });
      console.log(`Deleted old ${wf.name}`);
      
      // 2. Build new payload
      const newNodes = wf.nodes.map(node => {
        if (node.name === "Respond" || node.type === "n8n-nodes-base.respond") {
           return { ...newRespondNode };
        }
        return {
           name: node.name,
           type: node.type,
           typeVersion: node.typeVersion,
           position: node.position,
           parameters: node.parameters
        };
      });
      
      const newConnections = {};
      if (wf.connections && wf.connections.Webhook && wf.connections.Webhook.main) {
         newConnections.Webhook = {
            main: wf.connections.Webhook.main.map(arr => arr.map(conn => {
               if (conn.node === "Respond") {
                  return { node: "Respond to Webhook", type: "main", index: 0 };
               }
               return conn;
            }))
         };
      }
      
      const newWf = {
         name: wf.name,
         settings: {},
         nodes: newNodes,
         connections: newConnections
      };
      
      // 3. Post new
      const createRes = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newWf)
      });
      
      console.log(`Recreated ${wf.name} - Status: ${createRes.status}`);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

fixWorkflows();
