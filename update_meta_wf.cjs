const fs = require('fs');

async function modifyMetaWorkflow() {
  const headers = { 
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYTlkNzM4NDgtNzZhYi00OTM3LWFjMmUtNzhlMDVjNzcxOTE3IiwiaWF0IjoxNzgwNTE2NzgwfQ.Nq0TV5AmJMLrBCImuZanmQPGdOJEj3Cs72ARj-OupzE', 
    'Content-Type': 'application/json', 
    'Accept': 'application/json' 
  };
  
  const r = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET', { headers });
  const wf = await r.json();
  
  const parseNode = wf.nodes.find(n => n.name === 'Parse Meta Payload');
  parseNode.parameters.jsCode = `
// Parse Meta Cloud API webhook payload
const body = $input.first().json.body || $input.first().json;

const entry = body.entry?.[0];
const changes = entry?.changes?.[0];
const value = changes?.value;
const message = value?.messages?.[0];
const contact = value?.contacts?.[0];

if (!message) {
  return [{ json: { skip: true, reason: 'No message in payload' } }];
}

const msgId = message.id;
const phone = message.from;
const contactName = contact?.profile?.name || phone;
const type = message.type || 'text';
let content = message.text?.body || message.caption || '';
let mediaUrl = null;
let accessToken = null;

// If message has media, resolve the URL from Meta API
if (['image', 'audio', 'video', 'document', 'sticker'].includes(type)) {
  const mediaObj = message[type];
  const mediaId = mediaObj?.id;
  
  if (mediaId) {
    try {
      const supabaseUrl = "https://ibyterftfrqgkhktkaeg.supabase.co";
      const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.LEAKED_KEY_REMOVED";
      const channelId = "4886443e-4996-4d2a-83e1-d96f503e1a28";
      
      const channelsResp = await $helpers.httpRequest({
        method: 'GET',
        url: \`\${supabaseUrl}/rest/v1/channels?id=eq.\${channelId}&select=access_token\`,
        headers: {
          'apikey': serviceKey,
          'Authorization': \`Bearer \${serviceKey}\`
        }
      });
      
      accessToken = channelsResp?.[0]?.access_token;
      
      if (accessToken) {
        const mediaResp = await $helpers.httpRequest({
          method: 'GET',
          url: \`https://graph.facebook.com/v20.0/\${mediaId}\`,
          headers: {
            'Authorization': \`Bearer \${accessToken}\`
          }
        });
        
        mediaUrl = mediaResp?.url || null;
      }
    } catch (e) {
      console.error('Error resolving Meta media URL:', e.message);
    }
  }
  
  if (!content) {
    if (type === 'image') content = '[Imagem]';
    else if (type === 'audio') content = '[Áudio]';
    else if (type === 'video') content = '[Vídeo]';
    else if (type === 'document') content = '[Documento]';
    else if (type === 'sticker') content = '[Figurinha]';
    else content = '[Mídia]';
  }
}

return [{
  json: {
    whatsapp_msg_id: msgId,
    phone: phone,
    contact_name: contactName,
    direction: 'in',
    content: content,
    content_type: type,
    media_url: mediaUrl,
    access_token: accessToken,
    timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    raw_payload: body
  }
}];
`;

  // Define new nodes
  const ifMediaNode = {
    parameters: {
      conditions: {
        boolean: [
          { value1: "={{ !!$json.media_url }}", value2: true }
        ]
      }
    },
    id: "node-if-media",
    name: "Has Media URL?",
    type: "n8n-nodes-base.if",
    typeVersion: 1,
    position: [1100, 200]
  };

  const downloadMediaNode = {
    parameters: {
      method: "GET",
      url: "={{ $json.media_url }}",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "Authorization", value: "=Bearer {{ $json.access_token }}" }
        ]
      },
      options: {
        response: { response: { responseFormat: "file", outputPropertyName: "data" } }
      }
    },
    id: "node-download-media",
    name: "Download Media",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 3,
    position: [1300, 100]
  };

  const uploadSupabaseNode = {
    parameters: {
      method: "POST",
      url: "=https://ibyterftfrqgkhktkaeg.supabase.co/storage/v1/object/media/{{ $json.whatsapp_msg_id }}_{{ $binary.data.fileName || 'media' }}",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "Authorization", value: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.LEAKED_KEY_REMOVED" },
          { name: "Content-Type", value: "={{ $binary.data.mimeType }}" }
        ]
      },
      sendBody: true,
      contentType: "binaryData",
      inputDataFieldName: "data",
      options: {}
    },
    id: "node-upload-supabase",
    name: "Upload to Supabase Storage",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 3,
    position: [1500, 100]
  };

  const replaceMediaUrlNode = {
    parameters: {
      jsCode: `
const original = $('Parse Meta Payload').first().json;
original.content = "https://ibyterftfrqgkhktkaeg.supabase.co/storage/v1/object/public/media/" + original.whatsapp_msg_id + "_" + ($binary.data.fileName || 'media');
return [{ json: original }];
      `
    },
    id: "node-replace-media-url",
    name: "Replace Content with Storage URL",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [1700, 100]
  };

  const mergeNode = {
    parameters: {
      mode: "choose",
      output: "input1"
    },
    id: "node-merge-media",
    name: "Merge Media flow",
    type: "n8n-nodes-base.merge",
    typeVersion: 2,
    position: [1900, 200]
  };

  // Add new nodes
  wf.nodes.push(ifMediaNode, downloadMediaNode, uploadSupabaseNode, replaceMediaUrlNode, mergeNode);

  // Update connections
  wf.connections['Parse Meta Payload'].main[0] = [{ node: 'Has Media URL?', type: 'main', index: 0 }];
  
  wf.connections['Has Media URL?'] = {
    main: [
      [{ node: 'Download Media', type: 'main', index: 0 }],
      [{ node: 'Merge Media flow', type: 'main', index: 1 }]
    ]
  };
  
  wf.connections['Download Media'] = { main: [[{ node: 'Upload to Supabase Storage', type: 'main', index: 0 }]] };
  wf.connections['Upload to Supabase Storage'] = { main: [[{ node: 'Replace Content with Storage URL', type: 'main', index: 0 }]] };
  wf.connections['Replace Content with Storage URL'] = { main: [[{ node: 'Merge Media flow', type: 'main', index: 0 }]] };
  
  wf.connections['Merge Media flow'] = {
    main: [
      [{ node: 'Has Message?', type: 'main', index: 0 }]
    ]
  };

  // Shift right all subsequent nodes to make space visually
  wf.nodes.forEach(n => {
    if (n.position[0] >= 1100 && !['node-if-media', 'node-download-media', 'node-upload-supabase', 'node-replace-media-url', 'node-merge-media'].includes(n.id)) {
      n.position[0] += 1000;
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
  
  const u = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET', { 
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
modifyMetaWorkflow();
