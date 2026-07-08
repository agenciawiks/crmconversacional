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

async function fixWithSeparateNodes() {
  const headers = { 
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYTlkNzM4NDgtNzZhYi00OTM3LWFjMmUtNzhlMDVjNzcxOTE3IiwiaWF0IjoxNzgwNTE2NzgwfQ.Nq0TV5AmJMLrBCImuZanmQPGdOJEj3Cs72ARj-OupzE', 
    'Content-Type': 'application/json', 
    'Accept': 'application/json' 
  };
  
  let r = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { headers });
  let wf = await r.json();
  
  // 1. Simplify Parse Evolution Payload - NO external calls, just parse
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

  return [{ 
    json: { 
      event_type: 'message.received', 
      whatsapp_msg_id: key.id, 
      phone, 
      contact_name: msg.pushName || phone, 
      direction: key.fromMe ? 'out' : 'in', 
      content, 
      content_type: contentType, 
      media_url: null, 
      mime_type: mimeType,
      timestamp: new Date(msg.messageTimestamp*1000).toISOString(), 
      instance: body.instance,
      is_media: ['image', 'audio', 'video', 'document', 'sticker'].includes(contentType),
      raw_key: key,
      raw_message: msg.message
    } 
  }];
} else {
  return [{ json: { event_type: 'skip', reason: 'Not a message: ' + event } }];
}
`;
  }

  // 2. Add/update "Is Media?" conditional node
  let isMediaNode = wf.nodes.find(n => n.name === 'Is Media?');
  if (!isMediaNode) {
    isMediaNode = {
      parameters: {
        conditions: {
          boolean: [{ value1: "={{ $json.is_media }}", value2: true }]
        }
      },
      id: 'node-is-media',
      name: 'Is Media?',
      type: 'n8n-nodes-base.if',
      typeVersion: 1,
      position: [810, 200]
    };
    wf.nodes.push(isMediaNode);
  } else {
    isMediaNode.parameters = {
      conditions: {
        boolean: [{ value1: "={{ $json.is_media }}", value2: true }]
      }
    };
  }

  // 3. Add/update "Fetch Base64 from Evolution" HTTP Request node
  let fetchBase64Node = wf.nodes.find(n => n.name === 'Fetch Base64 from Evolution');
  if (!fetchBase64Node) {
    fetchBase64Node = {
      parameters: {},
      id: 'node-fetch-base64',
      name: 'Fetch Base64 from Evolution',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 3,
      position: [1010, 100]
    };
    wf.nodes.push(fetchBase64Node);
  }
  fetchBase64Node.parameters = {
    method: 'POST',
    url: "=https://n8n-evolution-api.rh3fr2.easypanel.host/chat/getBase64FromMediaMessage/{{ $json.instance }}",
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: 'apikey', value: '365AA9F89AD5-451D-98F2-C56207956F1F' },
        { name: 'Content-Type', value: 'application/json' }
      ]
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: '={{ JSON.stringify({ message: { key: $json.raw_key, message: $json.raw_message }, convertToMp4: false }) }}',
    options: {
      timeout: 30000
    }
  };

  // 4. Add/update "Process Base64 Upload" Code node
  let processUploadNode = wf.nodes.find(n => n.name === 'Process Base64 Upload');
  if (!processUploadNode) {
    processUploadNode = {
      parameters: {},
      id: 'node-process-upload',
      name: 'Process Base64 Upload',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1210, 100]
    };
    wf.nodes.push(processUploadNode);
  }
  processUploadNode.parameters = {
    jsCode: `
const evoResponse = $input.first().json;
const parseData = $('Is Media?').first().json;

const base64Data = evoResponse.base64;
const mimeType = evoResponse.mimetype || parseData.mime_type;
const fileName = parseData.whatsapp_msg_id + '_' + parseData.content_type;

if (base64Data) {
  return [{
    json: {
      ...parseData,
      upload_base64: base64Data,
      upload_mime_type: mimeType,
      upload_file_name: fileName
    }
  }];
}

// If no base64, pass through without media
return [{ json: parseData }];
`
  };

  // 5. Add/update "Upload Media to Supabase" HTTP Request node
  let uploadNode = wf.nodes.find(n => n.name === 'Upload Media to Supabase');
  if (!uploadNode) {
    uploadNode = {
      parameters: {},
      id: 'node-upload-media',
      name: 'Upload Media to Supabase',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 3,
      position: [1410, 100]
    };
    wf.nodes.push(uploadNode);
  }
  uploadNode.parameters = {
    method: 'POST',
    url: "=https://ibyterftfrqgkhktkaeg.supabase.co/storage/v1/object/media/{{ $json.upload_file_name }}",
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: 'Authorization', value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.LEAKED_KEY_REMOVED' },
        { name: 'Content-Type', value: '={{ $json.upload_mime_type }}' }
      ]
    },
    sendBody: true,
    contentType: 'raw',
    rawBody: '={{ Buffer.from($json.upload_base64, "base64") }}',
    options: {}
  };

  // 6. Add/update "Set Media URL" Code node  
  let setUrlNode = wf.nodes.find(n => n.name === 'Set Media URL');
  if (!setUrlNode) {
    setUrlNode = {
      parameters: {},
      id: 'node-set-url',
      name: 'Set Media URL',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1610, 100]
    };
    wf.nodes.push(setUrlNode);
  }
  setUrlNode.parameters = {
    jsCode: `
const data = $('Process Base64 Upload').first().json;
const publicUrl = "https://ibyterftfrqgkhktkaeg.supabase.co/storage/v1/object/public/media/" + data.upload_file_name;

return [{
  json: {
    event_type: data.event_type,
    whatsapp_msg_id: data.whatsapp_msg_id,
    phone: data.phone,
    contact_name: data.contact_name,
    direction: data.direction,
    content: data.content,
    content_type: data.content_type,
    media_url: publicUrl,
    mime_type: data.mime_type,
    timestamp: data.timestamp,
    instance: data.instance
  }
}];
`
  };

  // 7. Fix connections - the complete flow:
  // Parse -> Is Media? 
  //   true -> Fetch Base64 -> Process Upload -> Upload to Supabase -> Set URL -> Is Message?
  //   false -> Is Message?
  wf.connections['Parse Evolution Payload'] = {
    main: [[{ node: 'Is Media?', type: 'main', index: 0 }]]
  };
  
  wf.connections['Is Media?'] = {
    main: [
      [{ node: 'Fetch Base64 from Evolution', type: 'main', index: 0 }], // true
      [{ node: 'Is Message?', type: 'main', index: 0 }]  // false
    ]
  };
  
  wf.connections['Fetch Base64 from Evolution'] = {
    main: [[{ node: 'Process Base64 Upload', type: 'main', index: 0 }]]
  };
  
  wf.connections['Process Base64 Upload'] = {
    main: [[{ node: 'Upload Media to Supabase', type: 'main', index: 0 }]]
  };
  
  wf.connections['Upload Media to Supabase'] = {
    main: [[{ node: 'Set Media URL', type: 'main', index: 0 }]]
  };
  
  wf.connections['Set Media URL'] = {
    main: [[{ node: 'Is Message?', type: 'main', index: 0 }]]
  };

  // Remove old nodes that we replaced
  const oldNodesToRemove = ['Has Base64?', 'Upload to Supabase Storage', 'Replace Content with Storage URL'];
  wf.nodes = wf.nodes.filter(n => !oldNodesToRemove.includes(n.name));
  delete wf.connections['Has Base64?'];
  delete wf.connections['Upload to Supabase Storage'];
  delete wf.connections['Replace Content with Storage URL'];

  // 8. Fix Insert Message references
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

  // 9. Fix Upsert Contact  
  const upsertEvo = wf.nodes.find(n => n.name === 'Upsert Contact');
  if (upsertEvo) {
    upsertEvo.parameters.jsonBody = "={{ JSON.stringify(Object.assign({ phone: $json.phone }, $json.direction === 'in' && $json.contact_name ? { name: $json.contact_name } : {})) }}";
  }

  let u = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { 
    method: 'PUT', headers, body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: getValidSettings(wf.settings) }) 
  });
  console.log("Evo update:", u.status);
  if (u.status !== 200) {
    console.log(await u.text());
  }
}

fixWithSeparateNodes();
