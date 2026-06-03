const fs = require('fs');

const data = JSON.parse(fs.readFileSync('n8n-workflows/outbound-send-message.json', 'utf8'));

// 1. Add "Is Instagram?" IF node
data.nodes.push({
  "parameters": {
    "conditions": {
      "string": [
        {
          "value1": "={{ $json.provider }}",
          "operation": "equals",
          "value2": "instagram"
        }
      ]
    }
  },
  "id": "node-if-instagram",
  "name": "Is Instagram?",
  "type": "n8n-nodes-base.if",
  "typeVersion": 1,
  "position": [720, 500]
});

// 2. Add "Send via Instagram API" node
data.nodes.push({
  "parameters": {
    "method": "POST",
    "url": "=https://graph.facebook.com/v20.0/{{ $json.phone_id }}/messages",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "Authorization", "value": "Bearer {{ $json.access_token }}" },
        { "name": "Content-Type", "value": "application/json" }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\\n  \\\"recipient\\\": {\\n    \\\"id\\\": \\\"{{ $json.phone }}\\\"\\n  },\\n  \\\"message\\\": {\\n    \\\"text\\\": \\\"{{ $json.content }}\\\"\\n  }\\n}",
    "options": {
      "retry": {
        "maxRetries": 3,
        "retryInterval": 3000,
        "retryIntervalMultiplier": 2
      },
      "timeout": 15000
    }
  },
  "id": "node-send-instagram",
  "name": "Send via Instagram API",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 3,
  "position": [980, 660]
});

// 3. Update Connections
// Change Which Provider false branch to Is Instagram?
data.connections["Which Provider?"] = {
  "main": [
    [{ "node": "Send via Meta API", "type": "main", "index": 0 }],
    [{ "node": "Is Instagram?", "type": "main", "index": 0 }]
  ]
};

// Add Is Instagram? connections
data.connections["Is Instagram?"] = {
  "main": [
    [{ "node": "Send via Instagram API", "type": "main", "index": 0 }],
    [{ "node": "Send via Evolution API", "type": "main", "index": 0 }]
  ]
};

// Connect Send via Instagram API to Log Outgoing Message
data.connections["Send via Instagram API"] = {
  "main": [
    [{ "node": "Log Outgoing Message", "type": "main", "index": 0 }]
  ]
};

fs.writeFileSync('n8n-workflows/outbound-send-message.json', JSON.stringify(data, null, 2));
console.log('outbound-send-message.json updated with Instagram support');
