const fs = require('fs');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjM2NDIxYjEtMjcxMy00NDJiLTkwMDAtOTkxOWFhZmQ2MGI0IiwiaWF0IjoxNzc5Mzg1OTI2fQ.jF56nR6RvnHavWrc0pgoon_hGzQIhe0eKWERU98LCuM';
const API_URL = 'https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows';

const metaLogic = JSON.parse(fs.readFileSync('./n8n-workflows/meta-inbound-webhook.json', 'utf8'));
const evoLogic = JSON.parse(fs.readFileSync('./n8n-workflows/evolution-inbound-webhook.json', 'utf8'));
const outLogic = JSON.parse(fs.readFileSync('./n8n-workflows/outbound-send-message.json', 'utf8'));

const chatwootLogic = {
  "name": "WhatsApp Chatwoot API – Inbound Webhook",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "webhook/chatwoot",
        "responseMode": "onReceived",
        "options": {}
      },
      "id": "node-webhook-chatwoot",
      "name": "Chatwoot Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "functionCode": "const body = $input.first().json.body || $input.first().json;\n\nif (body.event !== 'message_created') {\n  return [{ json: { skip: true, reason: 'Not a message_created event' } }];\n}\n\nreturn [{\n  json: {\n    event_type: 'message.received',\n    whatsapp_msg_id: body.id,\n    phone: body.sender?.phone_number?.replace('+', '') || body.conversation?.meta?.sender?.phone_number?.replace('+', ''),\n    contact_name: body.sender?.name || body.conversation?.meta?.sender?.name,\n    direction: body.message_type === 'incoming' ? 'in' : 'out',\n    content: body.content,\n    content_type: body.attachments?.length ? 'media' : 'text',\n    media_url: body.attachments?.[0]?.data_url || null,\n    timestamp: new Date().toISOString(),\n    raw_payload: body\n  }\n}];"
      },
      "id": "node-parse-chatwoot",
      "name": "Parse Chatwoot Payload",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [480, 300]
    },
    {
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{ $json.skip }}",
              "value2": true
            }
          ]
        }
      },
      "id": "node-filter-chatwoot-skip",
      "name": "Has Message?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [700, 300]
    },
    {
      "parameters": {
        "functionCode": "const contactResult = await $helpers.httpRequest({\n  method: 'POST',\n  url: `${$env.SUPABASE_URL}/rest/v1/contacts`,\n  headers: {\n    'apikey': $env.SUPABASE_SERVICE_KEY,\n    'Authorization': `Bearer ${$env.SUPABASE_SERVICE_KEY}`,\n    'Content-Type': 'application/json',\n    'Prefer': 'resolution=merge-duplicates,return=representation'\n  },\n  body: JSON.stringify({\n    phone: $json.phone,\n    name: $json.contact_name\n  })\n});\n\nconst contactId = contactResult?.[0]?.id;\n\nreturn [{\n  json: {\n    ...$json,\n    contact_id: contactId\n  }\n}];"
      },
      "id": "node-upsert-contact-chatwoot",
      "name": "Upsert Contact",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [920, 200]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $env.SUPABASE_URL }}/rest/v1/messages",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "apikey", "value": "={{ $env.SUPABASE_SERVICE_KEY }}" },
            { "name": "Prefer", "value": "return=representation" }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            { "name": "channel_id", "value": "={{ $env.VITE_CHATWOOT_CHANNEL_ID }}" },
            { "name": "contact_id", "value": "={{ $json.contact_id }}" },
            { "name": "direction", "value": "={{ $json.direction }}" },
            { "name": "content", "value": "={{ $json.content }}" },
            { "name": "content_type", "value": "={{ $json.content_type }}" },
            { "name": "media_url", "value": "={{ $json.media_url }}" },
            { "name": "whatsapp_msg_id", "value": "={{ $json.whatsapp_msg_id }}" },
            { "name": "timestamp", "value": "={{ $json.timestamp }}" }
          ]
        },
        "options": {
          "retry": {
            "maxRetries": 5,
            "retryInterval": 2000,
            "retryIntervalMultiplier": 2
          }
        }
      },
      "id": "node-insert-msg-chatwoot",
      "name": "Insert Message to Supabase",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1160, 200]
    }
  ],
  "connections": {
    "Chatwoot Webhook Trigger": {
      "main": [[{ "node": "Parse Chatwoot Payload", "type": "main", "index": 0 }]]
    },
    "Parse Chatwoot Payload": {
      "main": [[{ "node": "Has Message?", "type": "main", "index": 0 }]]
    },
    "Has Message?": {
      "main": [
        [{ "node": "Upsert Contact", "type": "main", "index": 0 }],
        []
      ]
    },
    "Upsert Contact": {
      "main": [[{ "node": "Insert Message to Supabase", "type": "main", "index": 0 }]]
    }
  }
};

const mapLogic = {
  "Meta Inbound": metaLogic,
  "Evolution Inbound": evoLogic,
  "Outbound Router": outLogic,
  "Chatwoot Inbound": chatwootLogic
};

async function deployLogic() {
  try {
    const res = await fetch(API_URL, {
      headers: { 'X-N8N-API-KEY': API_KEY }
    });
    const data = await res.json();
    
    if (!data.data) {
       console.log("Failed to fetch workflows", data);
       return;
    }
    
    for (const wf of data.data) {
      if (mapLogic[wf.name]) {
        const logic = mapLogic[wf.name];
        
        const existingWebhook = wf.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
        const logicWebhook = logic.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
        
        if (existingWebhook && logicWebhook) {
           logicWebhook.id = existingWebhook.id; 
           logicWebhook.parameters.path = existingWebhook.parameters.path; 
           
           if (logicWebhook.name !== existingWebhook.name) {
              const newConnections = {};
              for (const [key, val] of Object.entries(logic.connections)) {
                 const mappedKey = key === logicWebhook.name ? existingWebhook.name : key;
                 newConnections[mappedKey] = val;
              }
              logic.connections = newConnections;
              logicWebhook.name = existingWebhook.name;
           }
        }
        
        const payload = {
          name: wf.name,
          nodes: logic.nodes.map(n => {
            const { parameters_extra, ...rest } = n;
            return rest;
          }),
          connections: logic.connections,
          settings: wf.settings || {}
        };
        
        const updateRes = await fetch(`${API_URL}/${wf.id}`, {
          method: 'PUT',
          headers: {
            'X-N8N-API-KEY': API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        
        console.log(`Deployed logic to ${wf.name} - Status: ${updateRes.status}`);
        if(updateRes.status !== 200) {
           console.log(await updateRes.text());
        }
      }
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

deployLogic();
