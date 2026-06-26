const fs = require('fs');

const headers = { 
  'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg', 
  'Content-Type': 'application/json', 
  'Accept': 'application/json' 
};

async function fix() {
  const r = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/qzJptf3XgjdxpZG5', { headers });
  const wf = await r.json();
  
  const node = wf.nodes.find(n => n.name === 'AI Routing Decision');
  
  node.parameters.jsCode = `const settingsRaw = $('Fetch AI Settings').first()?.json || {};
let contactData = $('Fetch Contact').first()?.json || {};
const contact = Array.isArray(contactData) ? (contactData[0] || {}) : contactData;
const inputBody = $('AI Webhook Trigger').first()?.json?.body || {};

let parsedPrompt = {};
try {
  parsedPrompt = JSON.parse(settingsRaw.system_prompt || '{}');
} catch(e) {
  parsedPrompt = { system_prompt: settingsRaw.system_prompt };
}

const isEnabled = parsedPrompt.is_enabled ?? false;

if (!isEnabled) {
  return [{ json: { run_ai: false, reason: 'No settings found or disabled globally' } }];
}

const tags = contact.tags || [];
const isPausedByTag = tags.includes('IA Inativa');

const systemPrompt = parsedPrompt.system_prompt || '';
const negativePrompt = parsedPrompt.negative_prompt || '';
const apiKey = parsedPrompt.api_key || '';
const model = parsedPrompt.model || 'gpt-4o-mini';
const temperature = settingsRaw.temperature ?? 0.7;

const msgText = inputBody.user_message || '';
const phone = inputBody.phone || contact.phone || '';
const direction = inputBody.direction || 'in';

if (direction !== 'in') {
  return [{ json: { run_ai: false, reason: 'Message is outbound' } }];
}

const pausePhrases = settingsRaw.pause_trigger_phrases || [];
const matchedPhrase = pausePhrases.find(p => msgText.toLowerCase().includes(p.toLowerCase()));

let pauseBot = false;
let runAi = false;
let reason = '';

if (isPausedByTag) {
  reason = 'AI is paused for this contact (IA Inativa tag present)';
} else if (matchedPhrase) {
  pauseBot = true;
  reason = \`AI paused by trigger phrase: "\${matchedPhrase}"\`;
} else {
  runAi = true;
  reason = 'All checks passed, running AI';
}

const updatedTags = isPausedByTag ? tags : [...tags, 'IA Inativa'];

return [{
  json: {
    run_ai: runAi,
    pause_bot: pauseBot,
    reason: reason,
    contact_id: inputBody.contact_id,
    phone: phone,
    contact_name: contact.name || '',
    channel_id: inputBody.channel_id,
    user_message: msgText,
    system_prompt: systemPrompt,
    negative_prompt: negativePrompt,
    api_key: apiKey,
    model: model,
    temperature: temperature,
    updated_tags: updatedTags
  }
}];`;
  
  const sendNode = wf.nodes.find(n => n.name === 'Send AI Response');
  if (sendNode) {
    sendNode.parameters.jsonBody = "={{ { channel_id: $json.channel_id, contact_id: $json.contact_id, phone: $json.phone, content: $json.content } }}";
  }

  // We only keep executionOrder and errorWorkflow
  const validSettings = {};
  if (wf.settings) {
    if (wf.settings.executionOrder) validSettings.executionOrder = wf.settings.executionOrder;
    if (wf.settings.errorWorkflow) validSettings.errorWorkflow = wf.settings.errorWorkflow;
    if (wf.settings.timezone) validSettings.timezone = wf.settings.timezone;
    if (wf.settings.saveExecutionProgress) validSettings.saveExecutionProgress = wf.settings.saveExecutionProgress;
    if (wf.settings.saveManualExecutions) validSettings.saveManualExecutions = wf.settings.saveManualExecutions;
    if (wf.settings.callerPolicy) validSettings.callerPolicy = wf.settings.callerPolicy;
  }

  const body = { name: wf.name || 'Central AI Agent', nodes: wf.nodes, connections: wf.connections, settings: validSettings };
  
  const u = await fetch('https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/qzJptf3XgjdxpZG5', { 
    method: 'PUT', 
    headers, 
    body: JSON.stringify(body) 
  });
  console.log(await u.json());
}
fix();
