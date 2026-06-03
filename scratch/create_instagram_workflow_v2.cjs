const fs = require('fs');

const workflow = {
  "name": "Instagram – Inbound Webhook",
  "active": false,
  "nodes": [
    {
      "parameters": {
        "httpMethod": "GET",
        "path": "instagram",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "Verify GET",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 200]
    },
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "instagram",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "Message POST",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [240, 420]
    },
    {
      "parameters": {
        "respondWith": "text",
        "responseBody": "={{ $json.query?.['hub.challenge'] || '' }}",
        "options": {
          "responseHeaders": {
            "entries": [
              {
                "name": "Content-Type",
                "value": "text/plain"
              }
            ]
          }
        }
      },
      "name": "Respond Challenge",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [460, 200]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "{\\n  \\\"status\\\": \\\"ok\\\"\\n}",
        "options": {}
      },
      "name": "Instant Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [460, 420]
    },
    {
      "parameters": {
        "functionCode": `const body = $input.first().json.body || $input.first().json;

if (!body.entry || !body.entry[0]) {
  return [{ json: { skip: true, reason: 'No entry in payload' } }];
}

const entry = body.entry[0];
const messaging = entry.messaging?.[0];

if (!messaging || !messaging.message) {
  return [{ json: { skip: true, reason: 'No message in payload' } }];
}

const message = messaging.message;
const senderId = messaging.sender?.id; 
const recipientId = messaging.recipient?.id; 
const msgId = message.mid || message.item_id;
const timestamp = messaging.timestamp; 
const text = message.text || '';
const attachments = message.attachments;

let content = text;
let type = 'text';
let mediaUrl = null;

if (attachments && attachments.length > 0) {
  type = attachments[0].type; 
  mediaUrl = attachments[0].payload?.url;
  if (!content) {
    if (type === 'image') content = '[Imagem]';
    else if (type === 'video') content = '[Vídeo]';
    else if (type === 'audio') content = '[Áudio]';
    else content = '[Mídia]';
  }
}

return [{
  json: {
    whatsapp_msg_id: msgId,
    phone: senderId,
    contact_name: "IG User " + senderId, 
    direction: 'in',
    content: content,
    content_type: type,
    media_url: mediaUrl,
    timestamp: new Date(parseInt(timestamp)).toISOString(),
    raw_payload: body,
    source: "instagram"
  }
}];`
      },
      "name": "Parse Instagram",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [680, 420]
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
      "name": "Has Message?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [880, 420]
    },
    {
      "parameters": {
        "functionCode": `const msgId = $json.whatsapp_msg_id;
const contactResult = await $helpers.httpRequest({
  method: 'POST',
  url: "https://ibyterftfrqgkhktkaeg.supabase.co/rest/v1/contacts?on_conflict=phone",
  headers: {
    'apikey': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8",
    'Authorization': "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8",
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=representation'
  },
  body: JSON.stringify({
    phone: $json.phone,
    name: $json.contact_name
  })
});
return [{
  json: {
    ...$json,
    contact_id: contactResult?.[0]?.id
  }
}];`
      },
      "name": "Upsert Contact",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [1100, 320]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://ibyterftfrqgkhktkaeg.supabase.co/rest/v1/messages",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8" },
            { "name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8" },
            { "name": "Content-Type", "value": "application/json" },
            { "name": "Prefer", "value": "return=representation" }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            { "name": "channel_id", "value": "4886443e-4996-4d2a-83e1-d96f503e1a28" },
            { "name": "contact_id", "value": "={{ $json.contact_id }}" },
            { "name": "direction", "value": "in" },
            { "name": "content", "value": "={{ $json.content }}" },
            { "name": "content_type", "value": "={{ $json.content_type }}" },
            { "name": "media_url", "value": "={{ $json.media_url }}" },
            { "name": "whatsapp_msg_id", "value": "={{ $json.whatsapp_msg_id }}" },
            { "name": "timestamp", "value": "={{ $json.timestamp }}" }
          ]
        }
      },
      "name": "Insert Msg",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1320, 320]
    }
  ],
  "connections": {
    "Verify GET": {
      "main": [
        [
          {
            "node": "Respond Challenge",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Message POST": {
      "main": [
        [
          {
            "node": "Instant Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Instant Response": {
      "main": [
        [
          {
            "node": "Parse Instagram",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Parse Instagram": {
      "main": [
        [
          {
            "node": "Has Message?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Has Message?": {
      "main": [
        [
          {
            "node": "Upsert Contact",
            "type": "main",
            "index": 0
          }
        ],
        []
      ]
    },
    "Upsert Contact": {
      "main": [
        [
          {
            "node": "Insert Msg",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
};

fs.writeFileSync('n8n-workflows/instagram-inbound-webhook.json', JSON.stringify(workflow, null, 2));
console.log("Created instagram-inbound-webhook.json with GET and POST nodes.");
