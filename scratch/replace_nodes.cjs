const fs = require('fs');
const crypto = require('crypto');

// Fix Instagram workflow
const igFile = 'n8n-workflows/instagram-inbound-webhook.json';
const igData = JSON.parse(fs.readFileSync(igFile, 'utf8'));

// 1. Re-define the Upsert Contact node as an HTTP Request node
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
    "jsonBody": "={\n  \"phone\": \"{{ $json.phone }}\",\n  \"name\": \"{{ $json.contact_name }}\"\n}",
    "options": {}
  },
  "name": "Upsert Contact",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 3,
  "position": [1100, 320],
  "id": "e2c8211a-4575-4b84-9314-ef3441021e4a"
};

// Find and replace the Upsert Contact node in nodes array
const igContactIdx = igData.nodes.findIndex(n => n.name === "Upsert Contact");
if (igContactIdx !== -1) {
  igData.nodes[igContactIdx] = upsertContactNode;
}

// 2. Modify the Insert Msg node to use upstream references for other fields
const insertMsgNode = igData.nodes.find(n => n.name === "Insert Msg");
if (insertMsgNode) {
  insertMsgNode.parameters.bodyParameters.parameters = [
    { "name": "channel_id", "value": "15d09eea-b9b9-42f5-8231-8248dbb5fe7a" },
    { "name": "contact_id", "value": "={{ $json.id }}" },
    { "name": "direction", "value": "in" },
    { "name": "content", "value": "={{ $('Parse Instagram').item.json.content }}" },
    { "name": "content_type", "value": "={{ $('Parse Instagram').item.json.content_type }}" },
    { "name": "media_url", "value": "={{ $('Parse Instagram').item.json.media_url }}" },
    { "name": "whatsapp_msg_id", "value": "={{ $('Parse Instagram').item.json.whatsapp_msg_id }}" },
    { "name": "timestamp", "value": "={{ $('Parse Instagram').item.json.timestamp }}" }
  ];
}

fs.writeFileSync(igFile, JSON.stringify(igData, null, 2));
console.log('Instagram workflow rewritten successfully.');


// Fix Meta/WhatsApp workflow
const metaFile = 'n8n-workflows/meta-inbound-webhook.json';
const metaData = JSON.parse(fs.readFileSync(metaFile, 'utf8'));

// 1. Re-define the Upsert Contact node as an HTTP Request node
const metaUpsertContactNode = {
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
    "jsonBody": "={\n  \"phone\": \"{{ $json.phone }}\",\n  \"name\": \"{{ $json.contact_name }}\"\n}",
    "options": {}
  },
  "name": "Upsert Contact",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 3,
  "position": [1340, 320],
  "id": "node-upsert-contact"
};

const metaContactIdx = metaData.nodes.findIndex(n => n.name === "Upsert Contact");
if (metaContactIdx !== -1) {
  metaData.nodes[metaContactIdx] = metaUpsertContactNode;
}

// 2. Modify the Insert Message to Supabase node
const metaInsertMsgNode = metaData.nodes.find(n => n.name === "Insert Message to Supabase");
if (metaInsertMsgNode) {
  metaInsertMsgNode.parameters.bodyParameters.parameters = [
    { "name": "channel_id", "value": "4886443e-4996-4d2a-83e1-d96f503e1a28" },
    { "name": "contact_id", "value": "={{ $json.id }}" },
    { "name": "direction", "value": "in" },
    { "name": "content", "value": "={{ $('Parse Meta Payload').item.json.content }}" },
    { "name": "content_type", "value": "={{ $('Parse Meta Payload').item.json.content_type }}" },
    { "name": "media_url", "value": "={{ $('Parse Meta Payload').item.json.media_url }}" },
    { "name": "whatsapp_msg_id", "value": "={{ $('Parse Meta Payload').item.json.whatsapp_msg_id }}" },
    { "name": "timestamp", "value": "={{ $('Parse Meta Payload').item.json.timestamp }}" }
  ];
}

fs.writeFileSync(metaFile, JSON.stringify(metaData, null, 2));
console.log('Meta workflow rewritten successfully.');
