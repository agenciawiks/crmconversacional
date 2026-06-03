const fs = require('fs');
const crypto = require('crypto');

const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8";

const webhookNode = {
  parameters: {
    httpMethod: "POST",
    path: "ai-agent",
    options: {}
  },
  id: crypto.randomUUID(),
  name: "AI Webhook Trigger",
  type: "n8n-nodes-base.webhook",
  typeVersion: 1,
  position: [0, 300]
};

const fetchSettingsNode = {
  parameters: {
    method: "GET",
    url: "https://ibyterftfrqgkhktkaeg.supabase.co/rest/v1/ai_settings?limit=1",
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: "apikey", value: serviceKey },
        { name: "Authorization", value: `Bearer ${serviceKey}` }
      ]
    },
    options: {}
  },
  id: crypto.randomUUID(),
  name: "Fetch AI Settings",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 3,
  position: [200, 300]
};

const fetchContactNode = {
  parameters: {
    method: "GET",
    url: "=https://ibyterftfrqgkhktkaeg.supabase.co/rest/v1/contacts?id=eq.{{ $('AI Webhook Trigger').item.json.body.contact_id }}&limit=1",
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: "apikey", value: serviceKey },
        { name: "Authorization", value: `Bearer ${serviceKey}` }
      ]
    },
    options: {}
  },
  id: crypto.randomUUID(),
  name: "Fetch Contact",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 3,
  position: [400, 300]
};

const codeDecisionJS = `
const settings = $('Fetch AI Settings').first()?.json || {};
const contactArray = $('Fetch Contact').first()?.json || [];
const contact = contactArray[0] || {};
const inputBody = $('AI Webhook Trigger').first()?.json?.body || {};

if (!settings.is_enabled) {
  return [{ json: { run_ai: false, reason: 'No settings found or disabled globally' } }];
}

const tags = contact.tags || [];
const isPausedByTag = tags.includes('IA Inativa');

const systemPrompt = settings.system_prompt || '';
const negativePrompt = settings.negative_prompt || '';
const apiKey = settings.api_key || '';
const model = settings.model || 'gpt-4o-mini';
const temperature = settings.temperature ?? 0.7;

const msgText = inputBody.user_message || '';
const phone = inputBody.phone || contact.phone || '';
const direction = inputBody.direction || 'in';

if (direction !== 'in') {
  return [{ json: { run_ai: false, reason: 'Message is outbound' } }];
}

const pausePhrases = settings.pause_trigger_phrases || [];
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
    channel_id: inputBody.channel_id,
    user_message: msgText,
    system_prompt: systemPrompt,
    negative_prompt: negativePrompt,
    api_key: apiKey,
    model: model,
    temperature: temperature,
    updated_tags: updatedTags
  }
}];
`;

const decisionNode = {
  parameters: {
    jsCode: codeDecisionJS
  },
  id: crypto.randomUUID(),
  name: "AI Routing Decision",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [600, 300]
};

const ifPauseNode = {
  parameters: {
    conditions: {
      boolean: [
        {
          value1: "={{ $json.pause_bot }}",
          value2: true
        }
      ]
    }
  },
  id: crypto.randomUUID(),
  name: "If Pause AI?",
  type: "n8n-nodes-base.if",
  typeVersion: 1,
  position: [800, 200]
};

const pauseContactNode = {
  parameters: {
    method: "PATCH",
    url: "=https://ibyterftfrqgkhktkaeg.supabase.co/rest/v1/contacts?id=eq.{{ $json.contact_id }}",
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: "apikey", value: serviceKey },
        { name: "Authorization", value: `Bearer ${serviceKey}` },
        { name: "Content-Type", value: "application/json" }
      ]
    },
    sendBody: true,
    specifyBody: "json",
    jsonBody: "={\"tags\": {{ JSON.stringify($json.updated_tags) }} }",
    options: {}
  },
  id: crypto.randomUUID(),
  name: "Pause Contact AI",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 3,
  position: [1000, 100]
};

const ifRunNode = {
  parameters: {
    conditions: {
      boolean: [
        {
          value1: "={{ $json.run_ai }}",
          value2: true
        }
      ]
    }
  },
  id: crypto.randomUUID(),
  name: "If Run AI?",
  type: "n8n-nodes-base.if",
  typeVersion: 1,
  position: [800, 400]
};

const fetchHistoryNode = {
  parameters: {
    method: "GET",
    url: "=https://ibyterftfrqgkhktkaeg.supabase.co/rest/v1/messages?contact_id=eq.{{ $json.contact_id }}&order=timestamp.desc&limit=10",
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: "apikey", value: serviceKey },
        { name: "Authorization", value: `Bearer ${serviceKey}` }
      ]
    },
    options: {}
  },
  id: crypto.randomUUID(),
  name: "Fetch Conversation History",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 3,
  position: [1000, 400]
};

const formatPromptNode = {
  parameters: {
    jsCode: `
const msgs = $input.all().map(item => item.json);
msgs.reverse();

const historyMessages = msgs.map(m => ({
  role: m.direction === 'in' ? 'user' : 'assistant',
  content: m.content || ''
}));

const routerData = $('AI Routing Decision').first().json;

const systemContent = \`\${routerData.system_prompt}\\n\\nRESTRISÇÕES IMPORTANTES (O QUE NUNCA FAZER):\\n\${routerData.negative_prompt}\`;

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
`
  },
  id: crypto.randomUUID(),
  name: "Format Prompt & History",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [1200, 400]
};

const callOpenAINode = {
  parameters: {
    method: "POST",
    url: "https://api.openai.com/v1/chat/completions",
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: "Authorization", value: "=Bearer {{ $json.api_key }}" },
        { name: "Content-Type", value: "application/json" }
      ]
    },
    sendBody: true,
    specifyBody: "json",
    jsonBody: "={\"model\": \"{{ $json.model }}\", \"temperature\": {{ $json.temperature }}, \"messages\": {{ JSON.stringify($json.messages) }} }",
    options: {}
  },
  id: crypto.randomUUID(),
  name: "Call OpenAI API",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 3,
  position: [1400, 400]
};

const extractAnswerNode = {
  parameters: {
    jsCode: `
const resp = $input.first().json;
const answer = resp.choices?.[0]?.message?.content || '';
const inputData = $('Format Prompt & History').first().json;
return [{
  json: {
    contact_id: inputData.contact_id,
    phone: inputData.phone,
    channel_id: inputData.channel_id,
    content: answer
  }
}];
`
  },
  id: crypto.randomUUID(),
  name: "Extract AI Answer",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [1600, 400]
};

const sendResponseNode = {
  parameters: {
    method: "POST",
    url: "https://n8n-n8n.rh3fr2.easypanel.host/webhook/send",
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: "Content-Type", value: "application/json" }
      ]
    },
    sendBody: true,
    specifyBody: "json",
    jsonBody: "={\"channel_id\": \"{{ $json.channel_id }}\", \"contact_id\": \"{{ $json.contact_id }}\", \"phone\": \"{{ $json.phone }}\", \"content\": \"{{ $json.content }}\"}",
    options: {}
  },
  id: crypto.randomUUID(),
  name: "Send AI Response",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 3,
  position: [1800, 400]
};

const nodes = [
  webhookNode,
  fetchSettingsNode,
  fetchContactNode,
  decisionNode,
  ifPauseNode,
  pauseContactNode,
  ifRunNode,
  fetchHistoryNode,
  formatPromptNode,
  callOpenAINode,
  extractAnswerNode,
  sendResponseNode
];

const connections = {
  "AI Webhook Trigger": { main: [[{ node: "Fetch AI Settings", type: "main", index: 0 }]] },
  "Fetch AI Settings": { main: [[{ node: "Fetch Contact", type: "main", index: 0 }]] },
  "Fetch Contact": { main: [[{ node: "AI Routing Decision", type: "main", index: 0 }]] },
  "AI Routing Decision": { main: [[{ node: "If Pause AI?", type: "main", index: 0 }, { node: "If Run AI?", type: "main", index: 0 }]] },
  "If Pause AI?": { main: [[{ node: "Pause Contact AI", type: "main", index: 0 }], []] },
  "If Run AI?": { main: [[{ node: "Fetch Conversation History", type: "main", index: 0 }], []] },
  "Fetch Conversation History": { main: [[{ node: "Format Prompt & History", type: "main", index: 0 }]] },
  "Format Prompt & History": { main: [[{ node: "Call OpenAI API", type: "main", index: 0 }]] },
  "Call OpenAI API": { main: [[{ node: "Extract AI Answer", type: "main", index: 0 }]] },
  "Extract AI Answer": { main: [[{ node: "Send AI Response", type: "main", index: 0 }]] }
};

const workflowData = {
  name: "Central AI Agent",
  nodes,
  connections,
  settings: {}
};

fs.writeFileSync('n8n-workflows/central-ai-agent-deploy.json', JSON.stringify(workflowData));
console.log('Successfully generated central-ai-agent-deploy.json');
