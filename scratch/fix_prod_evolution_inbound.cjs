const fs = require('fs');

const file = 'scratch/prod_evolution_inbound.json';
if (!fs.existsSync(file)) {
  console.error(`File ${file} not found.`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Create the new node "Fetch Channel ID"
const fetchChannelNode = {
  "parameters": {
    "method": "GET",
    "url": "=https://rjcuoxvutrrzknicyuev.supabase.co/rest/v1/channels?instance=eq.{{ encodeURIComponent($('Parse Evolution Payload').item.json.instance) }}&select=id",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "apikey",
          "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqY3VveHZ1dHJyemtuaWN5dWV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzM0ODEyMCwiZXhwIjoyMDk4OTI0MTIwfQ.p0MiiM1RHbV9K0lEBDnJwopAveSCa64T7ogUG7Cy-rE"
        },
        {
          "name": "Authorization",
          "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqY3VveHZ1dHJyemtuaWN5dWV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzM0ODEyMCwiZXhwIjoyMDk4OTI0MTIwfQ.p0MiiM1RHbV9K0lEBDnJwopAveSCa64T7ogUG7Cy-rE"
        }
      ]
    },
    "options": {}
  },
  "id": "e458e0a3-bf45-42a9-a931-e40f1e4a29a3",
  "name": "Fetch Channel ID",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 3,
  "position": [
    -32,
    950
  ]
};

// Check if node already exists to avoid duplicates
if (!data.nodes.some(n => n.name === 'Fetch Channel ID')) {
  data.nodes.push(fetchChannelNode);
  console.log("Added 'Fetch Channel ID' node.");
} else {
  console.log("'Fetch Channel ID' node already exists, updating it.");
  const idx = data.nodes.findIndex(n => n.name === 'Fetch Channel ID');
  data.nodes[idx] = fetchChannelNode;
}

// 2. Connect "Parse Evolution Payload" output to "Fetch Channel ID"
if (data.connections["Parse Evolution Payload"]) {
  const conn = data.connections["Parse Evolution Payload"].main[0];
  if (!conn.some(c => c.node === 'Fetch Channel ID')) {
    conn.push({
      "node": "Fetch Channel ID",
      "type": "main",
      "index": 0
    });
    console.log("Connected 'Parse Evolution Payload' to 'Fetch Channel ID'.");
  }
}

// 3. Update "Insert Message to Supabase" channel_id parameter to use dynamic reference
const insertMsgNode = data.nodes.find(n => n.name === 'Insert Message to Supabase');
if (insertMsgNode && insertMsgNode.parameters?.bodyParameters?.parameters) {
  const p = insertMsgNode.parameters.bodyParameters.parameters.find(x => x.name === 'channel_id');
  if (p) {
    p.value = "={{ $('Fetch Channel ID').first().json[0]?.id || $('Fetch Channel ID').first().json.id }}";
    console.log("Updated channel_id in 'Insert Message to Supabase' to dynamic expression.");
  }
}

// 4. Update "Log Webhook Event" channel_id parameter
const logEventNode = data.nodes.find(n => n.name === 'Log Webhook Event');
if (logEventNode && logEventNode.parameters?.bodyParameters?.parameters) {
  const p = logEventNode.parameters.bodyParameters.parameters.find(x => x.name === 'channel_id');
  if (p) {
    p.value = "={{ $('Fetch Channel ID').first().json[0]?.id || $('Fetch Channel ID').first().json.id }}";
    console.log("Updated channel_id in 'Log Webhook Event' to dynamic expression.");
  }
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log("File saved successfully!");
