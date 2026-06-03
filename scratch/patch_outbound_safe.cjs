const https = require('https');
const fs = require('fs');

const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYmNjYzViNWQtOTI4NS00N2I2LWJhOWUtNmZhYjQ1NDM1MTc0IiwiaWF0IjoxNzc5ODE1MjU0fQ.-l3smjKe9_ejhjXd1X7HzdnxROuC2CZQblCC7KJoJYM";
const workflowId = "NFkf4R8DDJ2o7Sqx";

const mapCode = `const channelList = $input.first().json;
const channel = Array.isArray(channelList) ? channelList[0] : channelList;

const trigger = $('Send Message Trigger').first().json;
const body = trigger.body || trigger;

if (!channel) {
  throw new Error("Channel not found in Supabase");
}

return [{
  json: {
    channel_id: body.channel_id,
    contact_id: body.contact_id,
    provider: channel.provider,
    content: body.content,
    phone: body.phone,
    // Meta fields
    phone_id: channel.phone_id,
    access_token: channel.access_token,
    // Evolution fields
    evo_url: channel.url,
    evo_instance: channel.instance,
    evo_api_key: channel.api_key
  }
}];`;

const responseCode = `return [{ json: { success: true, message: 'Mensagem enviada com sucesso' } }];`;

function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const opt = {
      method,
      hostname: "n8n-n8n.rh3fr2.easypanel.host",
      path: "/api/v1" + path,
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(opt, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data: JSON.parse(data || '{}') }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log("Deactivating outbound workflow...");
  await apiCall("POST", `/workflows/${workflowId}/deactivate`);

  console.log("Updating outbound workflow structure to sandbox-safe native HTTP...");
  
  const workflowData = {
    name: "WhatsApp – Outbound Send Message",
    nodes: [
      {
        parameters: {
          httpMethod: "POST",
          path: "send",
          responseMode: "lastNode",
          options: {}
        },
        id: "node-webhook-send",
        name: "Send Message Trigger",
        type: "n8n-nodes-base.webhook",
        typeVersion: 1,
        position: [240, 300]
      },
      {
        parameters: {
          method: "GET",
          url: "=https://ibyterftfrqgkhktkaeg.supabase.co/rest/v1/channels?id=eq.{{ $json.body?.channel_id || $json.channel_id }}&select=*",
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: "apikey",
                value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8"
              },
              {
                name: "Authorization",
                value: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8"
              }
            ]
          },
          options: {}
        },
        id: "node-fetch-channel",
        name: "Fetch Channel from DB",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 3,
        position: [480, 300]
      },
      {
        parameters: {
          jsCode: mapCode
        },
        id: "node-map-channel",
        name: "Map Channel Data",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [700, 300]
      },
      {
        parameters: {
          conditions: {
            string: [
              {
                value1: "={{ $json.provider }}",
                operation: "equal",
                value2: "meta"
              }
            ]
          }
        },
        id: "node-switch-provider",
        name: "Which Provider?",
        type: "n8n-nodes-base.if",
        typeVersion: 1,
        position: [920, 300]
      },
      {
        parameters: {
          conditions: {
            string: [
              {
                value1: "={{ $json.provider }}",
                operation: "equal",
                value2: "instagram"
              }
            ]
          }
        },
        id: "node-if-instagram",
        name: "Is Instagram?",
        type: "n8n-nodes-base.if",
        typeVersion: 1,
        position: [920, 500]
      },
      {
        parameters: {
          method: "POST",
          url: "=https://graph.facebook.com/v20.0/{{ $json.phone_id }}/messages",
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: "Authorization",
                value: "=Bearer {{ $json.access_token }}"
              },
              {
                name: "Content-Type",
                value: "application/json"
              }
            ]
          },
          sendBody: true,
          specifyBody: "json",
          jsonBody: "={\n  \"messaging_product\": \"whatsapp\",\n  \"to\": \"{{ $json.phone }}\",\n  \"type\": \"text\",\n  \"text\": {\n    \"body\": \"{{ $json.content }}\"\n  }\n}",
          options: {
            timeout: 15000
          }
        },
        id: "node-send-meta",
        name: "Send via Meta API",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 3,
        position: [1180, 180]
      },
      {
        parameters: {
          method: "POST",
          url: "=https://graph.facebook.com/v20.0/me/messages",
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: "Authorization",
                value: "=Bearer {{ $json.access_token }}"
              },
              {
                name: "Content-Type",
                value: "application/json"
              }
            ]
          },
          sendBody: true,
          specifyBody: "json",
          jsonBody: "={\n  \"recipient\": {\n    \"id\": \"{{ $json.phone }}\"\n  },\n  \"message\": {\n    \"text\": \"{{ $json.content }}\"\n  }\n}",
          options: {
            timeout: 15000
          }
        },
        id: "node-send-instagram",
        name: "Send via Instagram API",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 3,
        position: [1180, 420]
      },
      {
        parameters: {
          method: "POST",
          url: "={{ $json.evo_url }}/message/sendText/{{ $json.evo_instance }}",
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: "apikey",
                value: "={{ $json.evo_api_key }}"
              },
              {
                name: "Content-Type",
                value: "application/json"
              }
            ]
          },
          sendBody: true,
          specifyBody: "json",
          jsonBody: "={\n  \"number\": \"{{ $json.phone }}@s.whatsapp.net\",\n  \"text\": \"{{ $json.content }}\"\n}",
          options: {
            timeout: 15000
          }
        },
        id: "node-send-evo",
        name: "Send via Evolution API",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 3,
        position: [1180, 660]
      },
      {
        parameters: {
          method: "POST",
          url: "https://ibyterftfrqgkhktkaeg.supabase.co/rest/v1/messages",
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: "apikey",
                value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8"
              },
              {
                name: "Authorization",
                value: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8"
              },
              {
                name: "Content-Type",
                value: "application/json"
              },
              {
                name: "Prefer",
                value: "return=representation"
              }
            ]
          },
          sendBody: true,
          bodyParameters: {
            parameters: [
              {
                name: "channel_id",
                value: "={{ $('Map Channel Data').first().json.channel_id }}"
              },
              {
                name: "contact_id",
                value: "={{ $('Map Channel Data').first().json.contact_id }}"
              },
              {
                name: "direction",
                value: "out"
              },
              {
                name: "content",
                value: "={{ $('Map Channel Data').first().json.content }}"
              },
              {
                name: "content_type",
                value: "text"
              },
              {
                name: "timestamp",
                value: "={{ new Date().toISOString() }}"
              }
            ]
          },
          options: {}
        },
        id: "node-log-outgoing",
        name: "Log Outgoing Message",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 3,
        position: [1460, 300]
      },
      {
        parameters: {
          jsCode: responseCode
        },
        id: "node-respond",
        name: "Response OK",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [1700, 300]
      }
    ],
    connections: {
      "Send Message Trigger": {
        "main": [[{ "node": "Fetch Channel from DB", "type": "main", "index": 0 }]]
      },
      "Fetch Channel from DB": {
        "main": [[{ "node": "Map Channel Data", "type": "main", "index": 0 }]]
      },
      "Map Channel Data": {
        "main": [[{ "node": "Which Provider?", "type": "main", "index": 0 }]]
      },
      "Which Provider?": {
        "main": [
          [{ "node": "Send via Meta API", "type": "main", "index": 0 }],
          [{ "node": "Is Instagram?", "type": "main", "index": 0 }]
        ]
      },
      "Is Instagram?": {
        "main": [
          [{ "node": "Send via Instagram API", "type": "main", "index": 0 }],
          [{ "node": "Send via Evolution API", "type": "main", "index": 0 }]
        ]
      },
      "Send via Meta API": {
        "main": [[{ "node": "Log Outgoing Message", "type": "main", "index": 0 }]]
      },
      "Send via Instagram API": {
        "main": [[{ "node": "Log Outgoing Message", "type": "main", "index": 0 }]]
      },
      "Send via Evolution API": {
        "main": [[{ "node": "Log Outgoing Message", "type": "main", "index": 0 }]]
      },
      "Log Outgoing Message": {
        "main": [[{ "node": "Response OK", "type": "main", "index": 0 }]]
      }
    },
    settings: {}
  };

  const updateRes = await apiCall("PUT", `/workflows/${workflowId}`, workflowData);
  console.log("Update status:", updateRes.statusCode);
  if (updateRes.statusCode !== 200) {
    console.error("Update failed:", updateRes.data);
    return;
  }

  console.log("Re-activating outbound workflow...");
  const activateRes = await apiCall("POST", `/workflows/${workflowId}/activate`);
  console.log("Activation status:", activateRes.statusCode);
  if (activateRes.statusCode === 200) {
    console.log("SUCCESS! Outbound workflow fully updated and activated securely on n8n server!");
    
    // Write backup locally so they match
    fs.writeFileSync('n8n-workflows/outbound-send-message.json', JSON.stringify(workflowData, null, 2));
    console.log("Saved new structure to n8n-workflows/outbound-send-message.json");
  } else {
    console.error("Activation failed:", activateRes.data);
  }
}

run().catch(console.error);
