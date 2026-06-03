const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('ai_agent.json'));

const routingNode = wf.nodes.find(n => n.name === 'AI Routing Decision');
routingNode.parameters.jsCode = `
const rawSettings = $('Fetch AI Settings').first()?.json || {};
let parsedSettings = {};
try {
  parsedSettings = JSON.parse(rawSettings.system_prompt || '{}');
} catch (e) {
  parsedSettings = rawSettings;
}

const is_enabled = parsedSettings.is_enabled ?? rawSettings.is_enabled;
const system_prompt = parsedSettings.system_prompt ?? rawSettings.system_prompt ?? '';
const negative_prompt = parsedSettings.negative_prompt ?? rawSettings.negative_prompt ?? '';
const api_key = parsedSettings.api_key ?? rawSettings.api_key ?? '';
const model = parsedSettings.model ?? rawSettings.model ?? 'gpt-4o-mini';
const temperature = parsedSettings.temperature ?? rawSettings.temperature ?? 0.7;
const pause_phrases = parsedSettings.pause_trigger_phrases ?? rawSettings.pause_trigger_phrases ?? [];

const inputBody = $('AI Webhook Trigger').first()?.json?.body || {};
const contactJson = $('Fetch Contact').first()?.json || {};
const contact = Array.isArray(contactJson) ? (contactJson[0] || {}) : contactJson;

if (!is_enabled) {
  return [{ json: { run_ai: false, reason: 'No settings found or disabled globally' } }];
}

const tags = contact.tags || [];
const isPausedByTag = tags.includes('IA Inativa');

const msgText = inputBody.user_message || '';
const phone = inputBody.phone || contact.phone || '';
const direction = inputBody.direction || 'in';

if (direction !== 'in') {
  return [{ json: { run_ai: false, reason: 'Message is outbound' } }];
}

const pausePhrases = pause_phrases || [];
const matchedPhrase = pausePhrases.find(p => p && msgText.toLowerCase().includes(p.toLowerCase()));

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
    channel_id: inputBody.channel_id,
    user_message: msgText,
    system_prompt: system_prompt,
    negative_prompt: negative_prompt,
    api_key: api_key,
    model: model,
    temperature: temperature,
    updated_tags: updatedTags
  }
}];
`;

const formatNode = wf.nodes.find(n => n.name === 'Format Prompt & History');
formatNode.parameters.jsCode = `
const msgs = $input.all().map(item => item.json);
msgs.reverse();

const historyMessages = msgs.map(m => ({
  role: m.direction === 'in' ? 'user' : 'assistant',
  content: m.content || ''
}));

const routerData = $('AI Routing Decision').first().json;

let systemContent = routerData.system_prompt;
if (routerData.negative_prompt && routerData.negative_prompt !== 'null') {
  systemContent += "\\n\\nRESTRICOES IMPORTANTES (O QUE NUNCA FAZER):\\n" + routerData.negative_prompt;
}

const finalMessages = [
  { role: 'system', content: systemContent },
  ...historyMessages,
  { role: 'user', content: routerData.user_message }
];

return [{
  json: {
    api_key: routerData.api_key,
    model: routerData.model,
    temperature: routerData.temperature,
    messages: finalMessages,
    contact_id: routerData.contact_id,
    phone: routerData.phone,
    channel_id: routerData.channel_id
  }
}];
`;

const fetchContactNode = wf.nodes.find(n => n.name === 'Fetch Contact');
fetchContactNode.parameters.url = '=https://ibyterftfrqgkhktkaeg.supabase.co/rest/v1/contacts?id=eq.{{ $(\'AI Webhook Trigger\').item.json.body.contact_id }}&limit=1';

const uploadPayload = {

  name: wf.name,
  nodes: wf.nodes,
  connections: wf.connections,
  settings: wf.settings
};

fs.writeFileSync('upload_payload.json', JSON.stringify(uploadPayload, null, 2));
