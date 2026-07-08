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

async function fixDefinitively() {
  const headers = { 
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYTlkNzM4NDgtNzZhYi00OTM3LWFjMmUtNzhlMDVjNzcxOTE3IiwiaWF0IjoxNzgwNTE2NzgwfQ.Nq0TV5AmJMLrBCImuZanmQPGdOJEj3Cs72ARj-OupzE', 
    'Content-Type': 'application/json', 
    'Accept': 'application/json' 
  };
  
  // ===== FIX EVOLUTION WORKFLOW =====
  let r = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { headers });
  let wf = await r.json();
  
  // 1. Fix Parse Evolution Payload - correct API call format
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
  let base64Data = null;
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

  // For media messages, call Evolution getBase64FromMediaMessage with CORRECT format
  if (['image', 'audio', 'video', 'document', 'sticker'].includes(contentType)) {
    try {
      const supabaseUrl = "https://ibyterftfrqgkhktkaeg.supabase.co";
      const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.LEAKED_KEY_REMOVED";
      
      const channelsResp = await fetch(
        supabaseUrl + "/rest/v1/channels?instance=eq." + body.instance + "&select=url,api_key",
        { headers: { 'apikey': serviceKey, 'Authorization': 'Bearer ' + serviceKey } }
      );
      const channels = await channelsResp.json();
      const channel = channels?.[0];
      
      if (channel && channel.url && channel.api_key) {
        const baseUrl = channel.url.replace(/\\/$/, '');
        
        // CORRECT FORMAT: { message: { key, message } }
        const evoResp = await fetch(
          baseUrl + "/chat/getBase64FromMediaMessage/" + body.instance,
          {
            method: 'POST',
            headers: { 'apikey': channel.api_key, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: { key: key, message: msg.message }, convertToMp4: false })
          }
        );
        
        if (evoResp.ok) {
          const evoData = await evoResp.json();
          if (evoData && evoData.base64) {
            base64Data = evoData.base64;
            if (evoData.mimetype) mimeType = evoData.mimetype;
          }
        }
      }
    } catch(e) {
      // Silently continue without media
    }
    
    // If we got base64, upload to Supabase Storage directly
    if (base64Data) {
      try {
        const supabaseUrl2 = "https://ibyterftfrqgkhktkaeg.supabase.co";
        const serviceKey2 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.LEAKED_KEY_REMOVED";
        
        const binaryData = Buffer.from(base64Data, 'base64');
        const fileName = key.id + '_' + contentType;
        
        const uploadResp = await fetch(
          supabaseUrl2 + "/storage/v1/object/media/" + fileName,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + serviceKey2,
              'Content-Type': mimeType
            },
            body: binaryData
          }
        );
        
        if (uploadResp.ok || uploadResp.status === 200) {
          mediaUrl = supabaseUrl2 + "/storage/v1/object/public/media/" + fileName;
        }
      } catch(e) {
        // Upload failed, continue without media_url
      }
    }
  }

  return [{ 
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
  }];
} else {
  return [{ json: { event_type: 'skip', reason: 'Not a message: ' + event } }];
}
`;
  }

  // 2. Remove the Has Base64?, Upload to Supabase Storage, Replace Content nodes
  // They are no longer needed since Parse does everything
  const nodesToRemove = ['Has Base64?', 'Upload to Supabase Storage', 'Replace Content with Storage URL'];
  wf.nodes = wf.nodes.filter(n => !nodesToRemove.includes(n.name));
  
  // 3. Fix connections: Parse Evolution Payload -> Is Message? directly
  wf.connections['Parse Evolution Payload'] = {
    main: [[{ node: 'Is Message?', type: 'main', index: 0 }]]
  };
  
  // Remove connections FROM removed nodes
  delete wf.connections['Has Base64?'];
  delete wf.connections['Upload to Supabase Storage'];
  delete wf.connections['Replace Content with Storage URL'];
  
  // 4. Fix Insert Message to Supabase - use $json directly since data flows correctly now
  const insertEvo = wf.nodes.find(n => n.name === 'Insert Message to Supabase');
  if (insertEvo) {
    insertEvo.parameters.bodyParameters.parameters = [
      { name: 'channel_id', value: '50df1e49-8f4c-4f90-b3c5-e9b95e37d8ed' },
      { name: 'contact_id', value: "={{ $('Upsert Contact').item.json.id }}" },
      { name: 'direction', value: "={{ $('Is Message?').item.json.direction }}" },
      { name: 'content', value: "={{ $('Is Message?').item.json.content }}" },
      { name: 'content_type', value: "={{ $('Is Message?').item.json.content_type }}" },
      { name: 'media_url', value: "={{ $('Is Message?').item.json.media_url }}" },
      { name: 'whatsapp_msg_id', value: "={{ $('Is Message?').item.json.whatsapp_msg_id }}" },
      { name: 'timestamp', value: "={{ $('Is Message?').item.json.timestamp }}" }
    ];
  }

  // 5. Fix Upsert Contact - use $json from Is Message?
  const upsertEvo = wf.nodes.find(n => n.name === 'Upsert Contact');
  if (upsertEvo) {
    upsertEvo.parameters.jsonBody = "={{ JSON.stringify(Object.assign({ phone: $json.phone }, $json.direction === 'in' && $json.contact_name ? { name: $json.contact_name } : {})) }}";
  }
  
  // 6. Fix AI Routing Decision - use $json from Insert Message
  const routingEvo = wf.nodes.find(n => n.name === 'AI Routing Decision');
  if (routingEvo && routingEvo.parameters?.jsCode) {
    // Make sure it references $input properly
    routingEvo.parameters.jsCode = routingEvo.parameters.jsCode.replace(
      /\$\('Is Message\?'\)\.first\(\)\.json/g, 
      '$input.first().json'
    );
  }
  
  // 7. Fix Log Webhook Event
  const logEvo = wf.nodes.find(n => n.name === 'Log Webhook Event');
  if (logEvo && logEvo.parameters?.bodyParameters) {
    logEvo.parameters.bodyParameters.parameters.forEach(p => {
      if (typeof p.value === 'string') {
        p.value = p.value.replace(/\$\('Is Message\?'\)\.item\.json\./g, '$json.');
      }
    });
  }
  
  let u = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { 
    method: 'PUT', headers, body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: getValidSettings(wf.settings) }) 
  });
  const respText = await u.text();
  console.log("Evo update:", u.status, respText.substring(0, 200));
  
  // ===== CLEAN UP BAD DATA =====
  // Delete orphaned "Novo Contato" messages (contact_id is null)
  const supabaseUrl = 'https://ibyterftfrqgkhktkaeg.supabase.co';
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.LEAKED_KEY_REMOVED';
  
  // Delete messages with null contact_id
  const delMsgs = await fetch(supabaseUrl + '/rest/v1/messages?contact_id=is.null', {
    method: 'DELETE',
    headers: { 'apikey': serviceKey, 'Authorization': 'Bearer ' + serviceKey, 'Prefer': 'return=representation' }
  });
  console.log('Deleted null contact_id messages:', delMsgs.status);
  
  // Delete test messages
  const delTest = await fetch(supabaseUrl + '/rest/v1/messages?whatsapp_msg_id=like.TEST_*', {
    method: 'DELETE',
    headers: { 'apikey': serviceKey, 'Authorization': 'Bearer ' + serviceKey, 'Prefer': 'return=representation' }
  });
  console.log('Deleted test messages:', delTest.status);
  
  // Delete contacts with phone "5511999999999" (test contacts)  
  const delTestContacts = await fetch(supabaseUrl + '/rest/v1/contacts?phone=eq.5511999999999', {
    method: 'DELETE',
    headers: { 'apikey': serviceKey, 'Authorization': 'Bearer ' + serviceKey, 'Prefer': 'return=representation' }
  });
  console.log('Deleted test contacts:', delTestContacts.status);
}

fixDefinitively();
