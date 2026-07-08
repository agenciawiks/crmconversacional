const fs = require('fs');

function getValidSettings(settings) {
  const valid = {};
  if (settings) {
    if (settings.executionOrder) valid.executionOrder = settings.executionOrder;
    if (settings.errorWorkflow) valid.errorWorkflow = settings.errorWorkflow;
    if (settings.timezone) valid.timezone = settings.timezone;
    if (settings.saveExecutionProgress) valid.saveExecutionProgress = settings.saveExecutionProgress;
    if (settings.saveManualExecutions) valid.saveManualExecutions = settings.saveManualExecutions;
    if (settings.callerPolicy) valid.callerPolicy = settings.callerPolicy;
  }
  return valid;
}

async function fixUpload() {
  const headers = { 
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYTlkNzM4NDgtNzZhYi00OTM3LWFjMmUtNzhlMDVjNzcxOTE3IiwiaWF0IjoxNzgwNTE2NzgwfQ.Nq0TV5AmJMLrBCImuZanmQPGdOJEj3Cs72ARj-OupzE', 
    'Content-Type': 'application/json', 
    'Accept': 'application/json' 
  };
  
  let r = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { headers });
  let wf = await r.json();
  
  // 1. Update Parse Evolution Payload to output binary data
  const parseNode = wf.nodes.find(n => n.name === 'Parse Evolution Payload');
  if (parseNode) {
    parseNode.parameters.jsCode = `
const body = $input.first().json.body || $input.first().json;
const event = body.event;
if (event === 'messages.upsert') {
  const msg = body.data; 
  const key = msg.key;
  const phone = key.remoteJid?.split('@')[0]?.split(':')[0] || '';
  
  let content = '';
  let contentType = 'text';
  let mediaUrl = null;
  let base64Data = msg.message?.base64 || null;
  let mimeType = 'application/octet-stream';
  
  if (msg.message?.conversation) {
    content = msg.message.conversation;
  } else if (msg.message?.extendedTextMessage?.text) {
    content = msg.message.extendedTextMessage.text;
  } else if (msg.message?.imageMessage) { 
    content = msg.message.imageMessage.caption || '[Imagem]'; 
    contentType = 'image'; 
    mimeType = msg.message.imageMessage.mimetype || 'image/jpeg';
  } else if (msg.message?.audioMessage) { 
    content = '[Áudio]'; 
    contentType = 'audio'; 
    mimeType = msg.message.audioMessage.mimetype || 'audio/ogg';
  } else if (msg.message?.videoMessage) { 
    content = msg.message.videoMessage.caption || '[Vídeo]'; 
    contentType = 'video'; 
    mimeType = msg.message.videoMessage.mimetype || 'video/mp4';
  } else if (msg.message?.documentMessage) { 
    content = msg.message.documentMessage.fileName || '[Documento]'; 
    contentType = 'document'; 
    mimeType = msg.message.documentMessage.mimetype || 'application/pdf';
  } else if (msg.message?.stickerMessage) { 
    content = '[Figurinha]'; 
    contentType = 'sticker'; 
    mimeType = msg.message.stickerMessage.mimetype || 'image/webp';
  } else {
    content = '[Mensagem não suportada]';
  }

  if (['image', 'audio', 'video', 'document', 'sticker'].includes(contentType) && !base64Data) {
    try {
      const supabaseUrl = "https://ibyterftfrqgkhktkaeg.supabase.co";
      const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.LEAKED_KEY_REMOVED";
      
      const channelsResp = await $helpers.httpRequest({
        method: 'GET',
        url: \`\${supabaseUrl}/rest/v1/channels?instance=eq.\${body.instance}&select=url,api_key\`,
        headers: {
          'apikey': serviceKey,
          'Authorization': \`Bearer \${serviceKey}\`
        }
      });
      
      const channel = channelsResp?.[0];
      if (channel && channel.url && channel.api_key) {
        const baseUrl = channel.url.replace(/\\/$/, '');
        const evoResp = await $helpers.httpRequest({
          method: 'POST',
          url: \`\${baseUrl}/chat/getBase64FromMediaMessage/\${body.instance}\`,
          headers: {
            'apikey': channel.api_key,
            'Content-Type': 'application/json'
          },
          body: { message: msg.message }
        });
        
        if (evoResp && evoResp.base64) {
          base64Data = evoResp.base64;
          if (evoResp.mimetype) mimeType = evoResp.mimetype;
        }
      }
    } catch(e) {
      console.error('Error fetching base64 from Evolution:', e.message);
    }
  }

  const resultItem = { 
    json: { 
      event_type: 'message.received', 
      whatsapp_msg_id: key.id, 
      phone, 
      contact_name: msg.pushName || phone, 
      direction: key.fromMe ? 'out' : 'in', 
      content, 
      content_type: contentType, 
      media_url: mediaUrl, 
      base64: !!base64Data, 
      mime_type: mimeType,
      timestamp: new Date(msg.messageTimestamp*1000).toISOString(), 
      instance: body.instance 
    } 
  };
  
  if (base64Data) {
    resultItem.binary = {
      data: {
        data: base64Data,
        mimeType: mimeType,
        fileName: key.id + '_' + contentType
      }
    };
  }

  return [resultItem];
} else {
  return [{ json: { event_type: 'skip', reason: 'Not a message: ' + event } }];
}
`;
  }

  // 2. Update Upload to Supabase Storage to use binary data natively
  const uploadNode = wf.nodes.find(n => n.name === 'Upload to Supabase Storage');
  if (uploadNode) {
    uploadNode.parameters.sendBody = true;
    uploadNode.parameters.contentType = 'binaryData';
    uploadNode.parameters.inputDataFieldName = 'data'; // matches binary.data
    delete uploadNode.parameters.rawBody;
  }
  
  let u = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { 
    method: 'PUT', headers, body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: getValidSettings(wf.settings) }) 
  });
  console.log("Evo binary fix update:", u.status);
}
fixUpload();
