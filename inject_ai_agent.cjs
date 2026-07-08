const fs = require('fs');
const path = require('path');

const workflowsDir = path.join(__dirname, 'n8n-workflows');

function updateWorkflows() {
  const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.json'));
  let updatedCount = 0;

  files.forEach(file => {
    const filePath = path.join(workflowsDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let modified = false;

    // Find nodes
    const formatNodeIdx = data.nodes.findIndex(n => n.name === 'Format Prompt & History');
    const openAiNodeIdx = data.nodes.findIndex(n => n.name === 'Call OpenAI API');
    const extractNodeIdx = data.nodes.findIndex(n => n.name === 'Extract AI Answer');

    if (formatNodeIdx !== -1 && openAiNodeIdx !== -1 && extractNodeIdx !== -1) {
      // 1. Update Format Prompt & History
      let formatCode = data.nodes[formatNodeIdx].parameters.jsCode;
      
      // We rewrite Format Prompt & History to output chatInput and systemMessage
      formatCode = `
const msgs = $input.all().map(item => item.json);
const inboundMsgs = msgs.filter(m => m.direction === 'in');
const routerData = $('AI Routing Decision').first().json;
const welcomeMessage = routerData.welcome_message || '';

if (inboundMsgs.length <= 1 && welcomeMessage.trim() !== '') {
  return [{
    json: {
      is_welcome: true,
      contact_id: routerData.contact_id,
      phone: routerData.phone,
      channel_id: routerData.channel_id,
      content: welcomeMessage
    }
  }];
}

msgs.reverse();

const historyText = msgs.map(m => {
  const role = m.direction === 'in' ? 'USER' : 'ASSISTANT';
  return \`\${role}: \${m.content || ''}\`;
}).join('\\n\\n');

const systemContent = \`\${routerData.system_prompt}\\n\\nRESTRISÇÕES IMPORTANTES (O QUE NUNCA FAZER):\\n\${routerData.negative_prompt}\`;

const systemMessage = \`\${systemContent}\\n\\nCONVERSATION HISTORY:\\n\${historyText}\`;

return [{
  json: {
    is_welcome: false,
    api_key: routerData.api_key,
    model: routerData.model,
    temperature: routerData.temperature,
    chatInput: routerData.user_message,
    systemMessage: systemMessage,
    contact_id: routerData.contact_id,
    phone: routerData.phone,
    channel_id: routerData.channel_id
  }
}];
`;
      data.nodes[formatNodeIdx].parameters.jsCode = formatCode.trim();

      // 2. Remove Call OpenAI API node
      data.nodes.splice(openAiNodeIdx, 1);

      // 3. Add AI Agent, Chat Model, and Tool
      const agentNodeId = 'agent-' + Math.random().toString(36).substring(7);
      const modelNodeId = 'model-' + Math.random().toString(36).substring(7);
      const toolNodeId = 'tool-' + Math.random().toString(36).substring(7);

      data.nodes.push({
        "parameters": {
          "text": "={{ $json.chatInput }}",
          "options": {
            "systemMessage": "={{ $json.systemMessage }}\n\nIMPORTANT TOOL RULES: Para mover o lead para 'won', é OBRIGATÓRIO haver um agendamento concreto (data e hora aceitos pelo lead). Confirmações genéricas não são suficientes."
          }
        },
        "id": agentNodeId,
        "name": "AI Agent",
        "type": "@n8n/n8n-nodes-langchain.agent",
        "typeVersion": 3.1,
        "position": [1400, 400]
      });

      data.nodes.push({
        "parameters": {
          "model": {
            "__rl": true,
            "value": "={{ $('Format Prompt & History').first().json.model || 'gpt-4o-mini' }}",
            "mode": "id"
          },
          "options": {
            "temperature": "={{ $('Format Prompt & History').first().json.temperature || 0.7 }}"
          }
        },
        "id": modelNodeId,
        "name": "OpenAI Chat Model",
        "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
        "typeVersion": 1.3,
        "position": [1300, 600],
        "credentials": {
          "openAiApi": {
            "id": "",
            "name": "OpenAi account"
          }
        }
      });

      data.nodes.push({
        "parameters": {
          "name": "atualizar_funil_vendas",
          "description": "Atualiza o estágio do lead no funil de vendas (pipeline_stage). OBRIGATÓRIO: só mova para 'won' se houver agendamento concreto de data e hora.",
          "method": "PATCH",
          "url": "=https://ibyterftfrqgkhktkaeg.supabase.co/rest/v1/contacts?id=eq.{{ $('AI Routing Decision').first().json.contact_id }}",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              { "name": "Content-Type", "value": "application/json" }
            ]
          },
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={\"pipeline_stage\": \"{{ $fromAI('pipeline_stage', 'Estágio do funil: new, contacted, proposal, won, lost', 'string') }}\"}",
          "options": {},
          "authentication": "genericCredentialType",
          "genericAuthType": "httpHeaderAuth"
        },
        "id": toolNodeId,
        "name": "Atualizar Funil",
        "type": "n8n-nodes-base.httpRequestTool",
        "typeVersion": 4.4,
        "position": [1500, 600],
        "credentials": {
          "httpHeaderAuth": {
            "id": "",
            "name": "Header Auth account"
          }
        }
      });

      // 4. Update Extract AI Answer
      const extractNode = data.nodes.find(n => n.name === 'Extract AI Answer');
      extractNode.parameters.jsCode = `
const resp = $input.first().json;
const answer = resp.output || resp.text || resp.content || JSON.stringify(resp);
const inputData = $('Format Prompt & History').first().json;
return [{
  json: {
    contact_id: inputData.contact_id,
    phone: inputData.phone,
    channel_id: inputData.channel_id,
    content: answer
  }
}];
`.trim();

      // 5. Update Connections
      // First, remove old connections to/from 'Call OpenAI API'
      if (data.connections['Format Prompt & History']) {
        const fphConn = data.connections['Format Prompt & History']['main'][0];
        // replace the one that went to 'Call OpenAI API' or 'If Welcome?'
        // Actually, if it goes to If Welcome?, If Welcome? routes to Call OpenAI API.
        // Let's check If Welcome?
      }
      
      const ifWelcomeNodeIdx = data.nodes.findIndex(n => n.name === 'If Welcome?');
      if (ifWelcomeNodeIdx !== -1) {
        // If Welcome? false branch went to Call OpenAI API
        if (data.connections['If Welcome?'] && data.connections['If Welcome?']['main'] && data.connections['If Welcome?']['main'][1]) {
           data.connections['If Welcome?']['main'][1] = [{
             "node": "AI Agent",
             "type": "main",
             "index": 0
           }];
        }
      } else {
        // If there's no If Welcome, Format Prompt goes to Agent directly
        if (data.connections['Format Prompt & History'] && data.connections['Format Prompt & History']['main']) {
           data.connections['Format Prompt & History']['main'][0] = [{
             "node": "AI Agent",
             "type": "main",
             "index": 0
           }];
        }
      }

      delete data.connections['Call OpenAI API'];

      // Connect Agent to Extract AI Answer
      data.connections['AI Agent'] = {
        "main": [
          [{
            "node": "Extract AI Answer",
            "type": "main",
            "index": 0
          }]
        ]
      };

      // Connect Langchain inputs to Agent
      data.connections['OpenAI Chat Model'] = {
        "ai_languageModel": [
          [{
            "node": "AI Agent",
            "type": "ai_languageModel",
            "index": 0
          }]
        ]
      };

      data.connections['Atualizar Funil'] = {
        "ai_tool": [
          [{
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }]
        ]
      };

      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Injected AI Agent into ${file}`);
      updatedCount++;
    }
  });

  console.log(`\nUpdated ${updatedCount} workflows with AI Agent.`);
}

updateWorkflows();
