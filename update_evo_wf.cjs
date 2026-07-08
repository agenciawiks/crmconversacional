const fs = require('fs');

async function modifyEvoWorkflow() {
  const headers = { 
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYTlkNzM4NDgtNzZhYi00OTM3LWFjMmUtNzhlMDVjNzcxOTE3IiwiaWF0IjoxNzgwNTE2NzgwfQ.Nq0TV5AmJMLrBCImuZanmQPGdOJEj3Cs72ARj-OupzE', 
    'Content-Type': 'application/json', 
    'Accept': 'application/json' 
  };
  
  const r = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { headers });
  const wf = await r.json();
  
  const parseNode = wf.nodes.find(n => n.name === 'Parse Evolution Payload');
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

  // If it's media but we don't have base64 yet, fetch it from Evolution API
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
        // Call Evolution getBase64
        const evoResp = await $helpers.httpRequest({
          method: 'POST',
          url: \`\${baseUrl}/chat/getBase64/\${body.instance}\`,
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
      base64: base64Data,
      mime_type: mimeType,
      timestamp: new Date(msg.messageTimestamp*1000).toISOString(), 
      instance: body.instance 
    } 
  }];
} else {
  return [{ json: { event_type: 'skip', reason: 'Not a message: ' + event } }];
}
`;

  // Define new nodes
  const ifMediaNode = {
    parameters: {
      conditions: {
        boolean: [
          { value1: "={{ !!$json.base64 }}", value2: true }
        ]
      }
    },
    id: "node-if-base64",
    name: "Has Base64?",
    type: "n8n-nodes-base.if",
    typeVersion: 1,
    position: [110, 200]
  };

  const uploadSupabaseNode = {
    parameters: {
      method: "POST",
      url: "=https://ibyterftfrqgkhktkaeg.supabase.co/storage/v1/object/media/{{ $json.whatsapp_msg_id }}_{{ $json.content_type }}",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "Authorization", value: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.LEAKED_KEY_REMOVED" },
          { name: "Content-Type", value: "={{ $json.mime_type }}" }
        ]
      },
      sendBody: true,
      contentType: "raw",
      rawBody: "={{ Buffer.from($json.base64, 'base64') }}",
      options: {}
    },
    id: "node-upload-supabase-base64",
    name: "Upload to Supabase Storage",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 3,
    position: [310, 100]
  };

  const replaceMediaUrlNode = {
    parameters: {
      jsCode: `
const original = $('Parse Evolution Payload').first().json;
original.content = "https://ibyterftfrqgkhktkaeg.supabase.co/storage/v1/object/public/media/" + original.whatsapp_msg_id + "_" + original.content_type;
return [{ json: original }];
      `
    },
    id: "node-replace-media-url-evo",
    name: "Replace Content with Storage URL",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [510, 100]
  };

  const mergeNode = {
    parameters: {
      mode: "choose",
      output: "input1"
    },
    id: "node-merge-media-evo",
    name: "Merge Media flow",
    type: "n8n-nodes-base.merge",
    typeVersion: 2,
    position: [710, 200]
  };

  // Add new nodes
  wf.nodes.push(ifMediaNode, uploadSupabaseNode, replaceMediaUrlNode, mergeNode);

  // Update connections
  // We need to insert these nodes between "Parse Evolution Payload" and "Is Message?"
  // Originally: Parse Evolution Payload -> Is Message?
  // Now: Parse Evolution Payload -> Has Base64? -> (True: Upload -> Replace -> Merge) / (False: Merge) -> Is Message?
  
  wf.connections['Parse Evolution Payload'].main[0] = [{ node: 'Has Base64?', type: 'main', index: 0 }];
  
  wf.connections['Has Base64?'] = {
    main: [
      [{ node: 'Upload to Supabase Storage', type: 'main', index: 0 }],
      [{ node: 'Merge Media flow', type: 'main', index: 1 }]
    ]
  };
  
  wf.connections['Upload to Supabase Storage'] = { main: [[{ node: 'Replace Content with Storage URL', type: 'main', index: 0 }]] };
  wf.connections['Replace Content with Storage URL'] = { main: [[{ node: 'Merge Media flow', type: 'main', index: 0 }]] };
  
  wf.connections['Merge Media flow'] = {
    main: [
      [{ node: 'Is Message?', type: 'main', index: 0 }]
    ]
  };

  // Shift right all subsequent nodes to make space visually
  wf.nodes.forEach(n => {
    if (n.position[0] >= -100 && !['node-if-base64', 'node-upload-supabase-base64', 'node-replace-media-url-evo', 'node-merge-media-evo', 'Parse Evolution Payload'].includes(n.name) && !['588f5a8e-3d98-4ff8-b3d1-562a62415367', 'f79aec30-2f4a-4a5f-be76-a73d28679181'].includes(n.id)) {
      n.position[0] += 900;
    }
  });

  const validSettings = {};
  if (wf.settings) {
    if (wf.settings.executionOrder) validSettings.executionOrder = wf.settings.executionOrder;
    if (wf.settings.errorWorkflow) validSettings.errorWorkflow = wf.settings.errorWorkflow;
    if (wf.settings.timezone) validSettings.timezone = wf.settings.timezone;
    if (wf.settings.saveExecutionProgress) validSettings.saveExecutionProgress = wf.settings.saveExecutionProgress;
    if (wf.settings.saveManualExecutions) validSettings.saveManualExecutions = wf.settings.saveManualExecutions;
    if (wf.settings.callerPolicy) validSettings.callerPolicy = wf.settings.callerPolicy;
  }

  const body = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: validSettings };
  
  const u = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { 
    method: 'PUT', 
    headers, 
    body: JSON.stringify(body) 
  });
  console.log('Update status:', u.status);
  if (u.ok) {
     console.log(await u.json());
  } else {
     console.log(await u.text());
  }
}
modifyEvoWorkflow();
