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

async function fixUploadNode() {
  const headers = { 
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYTlkNzM4NDgtNzZhYi00OTM3LWFjMmUtNzhlMDVjNzcxOTE3IiwiaWF0IjoxNzgwNTE2NzgwfQ.Nq0TV5AmJMLrBCImuZanmQPGdOJEj3Cs72ARj-OupzE', 
    'Content-Type': 'application/json', 
    'Accept': 'application/json' 
  };
  
  let r = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { headers });
  let wf = await r.json();
  
  // Change "Process Base64 Upload" to output binary data
  const processNode = wf.nodes.find(n => n.name === 'Process Base64 Upload');
  if (processNode) {
    processNode.parameters.jsCode = `
const evoResponse = $input.first().json;
const parseData = $('Is Media?').first().json;

const base64Data = evoResponse.base64;
const mimeType = evoResponse.mimetype || parseData.mime_type;
const fileName = parseData.whatsapp_msg_id + '_' + parseData.content_type;

if (base64Data) {
  return [{
    json: {
      ...parseData,
      upload_file_name: fileName,
      upload_mime_type: mimeType
    },
    binary: {
      data: {
        data: base64Data,
        mimeType: mimeType,
        fileName: fileName
      }
    }
  }];
}

// If no base64, pass through without media
return [{ json: parseData }];
`;
  }

  // Change "Upload Media to Supabase" to use binary data
  const uploadNode = wf.nodes.find(n => n.name === 'Upload Media to Supabase');
  if (uploadNode) {
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
      contentType: 'binaryData',
      inputDataFieldName: 'data',
      options: {}
    };
  }

  // Fix the Log Webhook Event that keeps erroring
  const logNode = wf.nodes.find(n => n.name === 'Log Webhook Event');
  if (logNode) {
    // Just make it reference $json directly from Insert Message output
    if (logNode.parameters?.bodyParameters) {
      logNode.parameters.bodyParameters.parameters = logNode.parameters.bodyParameters.parameters.map(p => {
        if (typeof p.value === 'string') {
          return { ...p, value: p.value.replace(/\$\('Is Message\?'\)\.item\.json\./g, '$json.') };
        }
        return p;
      });
    }
  }

  let u = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/m5wmXXTYAqLiRM9c', { 
    method: 'PUT', headers, body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: getValidSettings(wf.settings) }) 
  });
  console.log("Evo binary upload fix:", u.status);
}

fixUploadNode();
