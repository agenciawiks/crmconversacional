const fs = require('fs');
const crypto = require('crypto');

const file = 'n8n-workflows/instagram-inbound-webhook.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Define the Fetch IG Profile node
const fetchProfileNode = {
  "parameters": {
    "method": "GET",
    "url": "=https://graph.facebook.com/v20.0/{{ $json.phone }}",
    "sendQuery": true,
    "queryParameters": {
      "parameters": [
        { "name": "fields", "value": "name,username,profile_pic" },
        { "name": "access_token", "value": "EAAOFwaqMDFoBRjHuckGTPEUMNxmvRjZCAvbT3eW9XWShRVkFMv1gGGaQ2FHF0A0VzL4xtZCEMwnKHTtK9fFMCdixmrUUM8HwOTusRObxXVnLWZBKMNJB5QlXoZBQNsLo6umPdBnyU1jkqPrK9IELxQUtzBDBw1QVKJePerVoMMHvpq4EOyTxbZCHSpp1qQZBteU9By3iQZD" }
      ]
    },
    "options": {}
  },
  "name": "Fetch IG Profile",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 3,
  "position": [1100, 500],
  "id": crypto.randomUUID()
};

// 2. Redefine Upsert Contact to take input from Fetch IG Profile
const upsertContactNode = {
  "parameters": {
    "method": "POST",
    "url": "https://ibyterftfrqgkhktkaeg.supabase.co/rest/v1/contacts?on_conflict=phone",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8" },
        { "name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8" },
        { "name": "Content-Type", "value": "application/json" },
        { "name": "Prefer", "value": "resolution=merge-duplicates,return=representation" }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"phone\": \"{{ $json.id }}\",\n  \"name\": \"{{ $json.name || $json.username }}\"\n}",
    "options": {}
  },
  "name": "Upsert Contact",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 3,
  "position": [1320, 500],
  "id": "e2c8211a-4575-4b84-9314-ef3441021e4a"
};

// 3. Redefine Insert Msg to read contact_id from Upsert Contact, and message content from Parse Instagram
const insertMsgNode = {
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
        { "name": "channel_id", "value": "15d09eea-b9b9-42f5-8231-8248dbb5fe7a" },
        { "name": "contact_id", "value": "={{ $json.id }}" },
        { "name": "direction", "value": "in" },
        { "name": "content", "value": "={{ $('Parse Instagram').item.json.content }}" },
        { "name": "content_type", "value": "={{ $('Parse Instagram').item.json.content_type }}" },
        { "name": "media_url", "value": "={{ $('Parse Instagram').item.json.media_url }}" },
        { "name": "whatsapp_msg_id", "value": "={{ $('Parse Instagram').item.json.whatsapp_msg_id }}" },
        { "name": "timestamp", "value": "={{ $('Parse Instagram').item.json.timestamp }}" }
      ]
    }
  },
  "name": "Insert Msg",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 3,
  "position": [1540, 500],
  "id": "6196f76e-ddbd-4897-982a-519a7cb6660a"
};

// 4. Update nodes list
data.nodes = data.nodes.filter(n => n.name !== "Fetch IG Profile" && n.name !== "Upsert Contact" && n.name !== "Insert Msg");
data.nodes.push(fetchProfileNode);
data.nodes.push(upsertContactNode);
data.nodes.push(insertMsgNode);

// 5. Update connections
// Has Message? (branch 1 / false) -> Fetch IG Profile
// Fetch IG Profile -> Upsert Contact
// Upsert Contact -> Insert Msg
data.connections["Has Message?"] = {
  "main": [
    [],
    [
      {
        "node": "Fetch IG Profile",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

data.connections["Fetch IG Profile"] = {
  "main": [
    [
      {
        "node": "Upsert Contact",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

data.connections["Upsert Contact"] = {
  "main": [
    [
      {
        "node": "Insert Msg",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log("Updated workflow with profile fetching node!");
