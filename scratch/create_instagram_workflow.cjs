const fs = require('fs');

const baseWorkflow = JSON.parse(fs.readFileSync('n8n-workflows/meta-inbound-webhook.json', 'utf8'));

baseWorkflow.name = "Instagram – Inbound Webhook";

// Update webhook path
const webhookNode = baseWorkflow.nodes.find(n => n.name === 'Meta Webhook Trigger');
if (webhookNode) {
  webhookNode.name = "Instagram Webhook Trigger";
  webhookNode.parameters.path = "webhook/instagram";
}

// Update Parser Node
const parserNode = baseWorkflow.nodes.find(n => n.name === 'Parse Meta Payload');
if (parserNode) {
  parserNode.name = "Parse Instagram Payload";
  parserNode.parameters.functionCode = `// Parse Instagram Webhook payload
const body = $input.first().json.body || $input.first().json;

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

// Use senderId as the contact identifier (phone)
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
}];`;
}

// Ensure the parser connects from Instant Response POST correctly
// Since we renamed the nodes, we should update connections if we rename nodes
// Let's just not rename the nodes to avoid breaking connections, or update them.
// Let's update connections:
if (baseWorkflow.connections["Meta Webhook Trigger"]) {
  baseWorkflow.connections["Instagram Webhook Trigger"] = baseWorkflow.connections["Meta Webhook Trigger"];
  delete baseWorkflow.connections["Meta Webhook Trigger"];
}
if (baseWorkflow.connections["Instant Response for POST"]) {
  const postConns = baseWorkflow.connections["Instant Response for POST"].main[0];
  postConns[0].node = "Parse Instagram Payload";
}
if (baseWorkflow.connections["Parse Meta Payload"]) {
  baseWorkflow.connections["Parse Instagram Payload"] = baseWorkflow.connections["Parse Meta Payload"];
  delete baseWorkflow.connections["Parse Meta Payload"];
}

// We'll write this modified workflow to a new file
fs.writeFileSync('n8n-workflows/instagram-inbound-webhook.json', JSON.stringify(baseWorkflow, null, 2));
console.log("Created instagram-inbound-webhook.json locally.");
