const fs = require('fs');
const crypto = require('crypto');

const configs = [
  {
    file: 'n8n-workflows/meta-inbound-webhook.json',
    channelId: '4886443e-4996-4d2a-83e1-d96f503e1a28',
    insertNodeName: 'Insert Message to Supabase',
    parseNodeName: 'Parse Meta Payload'
  },
  {
    file: 'n8n-workflows/evolution-inbound-webhook.json',
    channelId: '50df1e49-8f4c-4f90-b3c5-e9b95e37d8ed',
    insertNodeName: 'Insert Message to Supabase',
    parseNodeName: 'Parse Evolution Payload'
  },
  {
    file: 'n8n-workflows/instagram-inbound-webhook.json',
    channelId: '15d09eea-b9b9-42f5-8231-8248dbb5fe7a',
    insertNodeName: 'Insert Msg',
    parseNodeName: 'Parse Instagram'
  }
];

function sanitizeNode(node) {
  const allowedKeys = [
    'parameters', 'id', 'name', 'type', 'typeVersion',
    'position', 'notes', 'notesInFlow', 'webhookId', 'disabled', 'onError'
  ];
  const sanitized = {};
  for (const key of allowedKeys) {
    if (node[key] !== undefined) {
      sanitized[key] = node[key];
    }
  }
  return sanitized;
}

function patchFile({ file, channelId, insertNodeName, parseNodeName }) {
  console.log('Patching & Sanitizing ' + file + '...');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  // Remove existing AI nodes from old architecture
  const oldAiNodeNames = [
    'Fetch AI Settings', 'AI Routing Decision', 'If Pause AI?', 'Pause Contact AI',
    'If Run AI?', 'Fetch Conversation History', 'Format Prompt & History',
    'Call OpenAI API', 'Extract AI Answer', 'Send AI Response', 'Call Central AI Agent'
  ];
  data.nodes = data.nodes.filter(n => !oldAiNodeNames.includes(n.name));

  // Also completely remove them from connections object!
  for (const oldName of oldAiNodeNames) {
    if (data.connections[oldName]) {
      delete data.connections[oldName];
    }
  }

  const jsonBodyStr = '={"contact_id": "{{ $(\\'Upsert Contact\\').item.json.id }}", "phone": "{{ $(\\'' + parseNodeName + '\\').item.json.phone }}", "direction": "{{ $(\\'' + parseNodeName + '\\').item.json.direction }}", "user_message": "{{ $(\\'' + parseNodeName + '\\').item.json.content }}", "channel_id": "' + channelId + '"}';

  // Create new Call Central AI Agent node
  const callAiAgentNode = {
    parameters: {
      method: "POST",
      url: "https://n8n-n8n.rh3fr2.easypanel.host/webhook/ai-agent",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "Content-Type", value: "application/json" }
        ]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: jsonBodyStr,
      options: {}
    },
    id: crypto.randomUUID(),
    name: "Call Central AI Agent",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 3,
    position: [2100, 300]
  };

  data.nodes.push(callAiAgentNode);
  data.nodes = data.nodes.map(sanitizeNode);

  // Setup connection
  if (!data.connections[insertNodeName]) {
    data.connections[insertNodeName] = { "main": [[]] };
  }
  
  data.connections[insertNodeName].main[0] = data.connections[insertNodeName].main[0].filter(c => !oldAiNodeNames.includes(c.node));
  data.connections[insertNodeName].main[0].push({
    node: "Call Central AI Agent",
    type: "main",
    index: 0
  });

  fs.writeFileSync(file, JSON.stringify(data, null, 2));

  const allowedKeys = ['name', 'nodes', 'connections', 'settings'];
  const deployData = {};
  for (const key of allowedKeys) {
    if (data[key] !== undefined) {
      deployData[key] = data[key];
    }
  }
  deployData.settings = {};
  fs.writeFileSync(file.replace('.json', '-deploy.json'), JSON.stringify(deployData));

  console.log('Successfully patched and sanitized ' + file + '!');
}

for (const config of configs) {
  try {
    patchFile(config);
  } catch (e) {
    console.error('Failed to patch ' + config.file, e.message);
  }
}
