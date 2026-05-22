const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjM2NDIxYjEtMjcxMy00NDJiLTkwMDAtOTkxOWFhZmQ2MGI0IiwiaWF0IjoxNzc5Mzg1OTI2fQ.jF56nR6RvnHavWrc0pgoon_hGzQIhe0eKWERU98LCuM';
const WF_URL = 'https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows/88zOQbdJAT7DOaET';

const SUPA_URL = 'https://ibyterftfrqgkhktkaeg.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8';

// =====================================================
// NODE DEFINITIONS
// =====================================================

const nodes = [
  // 1. Webhook POST (recebe o payload do Meta)
  {
    parameters: {
      httpMethod: 'POST',
      path: 'meta-inbound',
      responseMode: 'lastNode',
      options: {}
    },
    id: 'node-webhook',
    name: 'Meta Webhook',
    type: 'n8n-nodes-base.webhook',
    typeVersion: 2,
    position: [200, 300],
    webhookId: 'meta-inbound'
  },

  // 2. Code node - APENAS formata o payload (sem chamadas API)
  {
    parameters: {
      jsCode: `// Parse Meta Payload - APENAS formatacao, sem chamadas API
const body = $input.first().json.body || $input.first().json;

const entry   = body.entry?.[0];
const changes = entry?.changes?.[0];
const value   = changes?.value;
const message = value?.messages?.[0];
const contact = value?.contacts?.[0];

if (!message) {
  return [{ json: { skip: true, reason: 'Sem mensagem no payload' } }];
}

return [{
  json: {
    whatsapp_msg_id: message.id,
    phone:           message.from,
    contact_name:    contact?.profile?.name || message.from,
    direction:       'in',
    content:         message.text?.body || message.caption || '[media]',
    content_type:    message.type || 'text',
    media_url:       null,
    timestamp:       new Date(parseInt(message.timestamp) * 1000).toISOString()
  }
}];`,
      mode: 'runOnceForAllItems'
    },
    id: 'node-parse',
    name: 'Parse Meta Payload',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [420, 300]
  },

  // 3. IF node - filtra skip=true
  {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '' },
        conditions: [
          {
            id: 'cond-skip',
            leftValue: '={{ $json.skip }}',
            rightValue: true,
            operator: {
              type: 'boolean',
              operation: 'equals',
              name: 'filter.operator.equals'
            }
          }
        ],
        combinator: 'and'
      },
      options: {}
    },
    id: 'node-if',
    name: 'Has Message?',
    type: 'n8n-nodes-base.if',
    typeVersion: 2,
    position: [640, 300]
  },

  // 4. HTTP Request - Upsert Contact no Supabase
  {
    parameters: {
      method: 'POST',
      url: SUPA_URL + '/rest/v1/contacts',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'apikey', value: SUPA_KEY },
          { name: 'Authorization', value: 'Bearer ' + SUPA_KEY },
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Prefer', value: 'resolution=merge-duplicates,return=representation' }
        ]
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={\n  "phone": "{{ $json.phone }}",\n  "name": "{{ $json.contact_name }}"\n}',
      options: {}
    },
    id: 'node-upsert',
    name: 'Upsert Contact',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [860, 400]
  },

  // 5. Code node - Monta o payload da mensagem (junta dados do Parse + contact_id)
  {
    parameters: {
      jsCode: `// Monta payload para inserir mensagem
// Input 0 = resultado do Upsert Contact (array com o contato)
// Precisamos pegar o contact_id do upsert e os campos originais

const upsertResult = $input.first().json;

// O Supabase retorna um array, pegamos o primeiro
let contactId = null;
if (Array.isArray(upsertResult)) {
  contactId = upsertResult[0]?.id || null;
} else {
  contactId = upsertResult?.id || null;
}

// Pega os dados originais do item anterior via $('Parse Meta Payload')
const original = $('Parse Meta Payload').first().json;

return [{
  json: {
    whatsapp_msg_id: original.whatsapp_msg_id,
    contact_id:      contactId,
    content:         original.content,
    content_type:    original.content_type,
    direction:       original.direction,
    timestamp:       original.timestamp,
    media_url:       original.media_url,
    channel:         'whatsapp'
  }
}];`,
      mode: 'runOnceForAllItems'
    },
    id: 'node-build-msg',
    name: 'Build Message Payload',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1080, 400]
  },

  // 6. HTTP Request - Insert Message no Supabase
  {
    parameters: {
      method: 'POST',
      url: SUPA_URL + '/rest/v1/messages',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'apikey', value: SUPA_KEY },
          { name: 'Authorization', value: 'Bearer ' + SUPA_KEY },
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Prefer', value: 'return=representation' }
        ]
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={\n  "whatsapp_msg_id": "{{ $json.whatsapp_msg_id }}",\n  "contact_id": "{{ $json.contact_id }}",\n  "content": "{{ $json.content }}",\n  "content_type": "{{ $json.content_type }}",\n  "direction": "{{ $json.direction }}",\n  "timestamp": "{{ $json.timestamp }}",\n  "media_url": {{ $json.media_url ? \'"\' + $json.media_url + \'"\' : \'null\' }},\n  "channel": "{{ $json.channel }}"\n}',
      options: {}
    },
    id: 'node-insert-msg',
    name: 'Insert Message',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [1300, 400]
  },

  // 7. Respond to Webhook (retorna 200 pro Meta)
  {
    parameters: {
      respondWith: 'json',
      responseBody: '={ "status": "ok" }',
      options: {}
    },
    id: 'node-respond',
    name: 'Respond OK',
    type: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1.1,
    position: [1520, 400]
  },

  // 8. Webhook GET (verificacao do Meta)
  {
    parameters: {
      httpMethod: 'GET',
      path: 'meta-inbound',
      responseMode: 'lastNode',
      options: {}
    },
    id: 'node-webhook-get',
    name: 'Meta Verification GET',
    type: 'n8n-nodes-base.webhook',
    typeVersion: 2,
    position: [200, 560],
    webhookId: 'meta-inbound-get'
  },

  // 9. Respond Challenge (verificacao do Meta)
  {
    parameters: {
      respondWith: 'text',
      responseBody: '={{ $json.query["hub.challenge"] }}',
      options: {
        responseCode: 200
      }
    },
    id: 'node-challenge',
    name: 'Respond Challenge',
    type: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1.1,
    position: [420, 560]
  }
];

// =====================================================
// CONNECTIONS
// =====================================================
const connections = {
  'Meta Webhook': {
    main: [[{ node: 'Parse Meta Payload', type: 'main', index: 0 }]]
  },
  'Parse Meta Payload': {
    main: [[{ node: 'Has Message?', type: 'main', index: 0 }]]
  },
  'Has Message?': {
    main: [
      // True branch (skip=true) -> nada
      [],
      // False branch (skip!=true) -> Upsert Contact
      [{ node: 'Upsert Contact', type: 'main', index: 0 }]
    ]
  },
  'Upsert Contact': {
    main: [[{ node: 'Build Message Payload', type: 'main', index: 0 }]]
  },
  'Build Message Payload': {
    main: [[{ node: 'Insert Message', type: 'main', index: 0 }]]
  },
  'Insert Message': {
    main: [[{ node: 'Respond OK', type: 'main', index: 0 }]]
  },
  'Meta Verification GET': {
    main: [[{ node: 'Respond Challenge', type: 'main', index: 0 }]]
  }
};

// =====================================================
// UPDATE WORKFLOW
// =====================================================
async function rebuild() {
  // Fetch current to get name
  const res = await fetch(WF_URL, { headers: { 'X-N8N-API-KEY': API_KEY } });
  const wf = await res.json();

  console.log('Workflow atual:', wf.name);
  console.log('Nodes atuais:', wf.nodes.length);

  const payload = {
    name: wf.name,
    nodes: nodes,
    connections: connections,
    settings: {}
  };

  const updateRes = await fetch(WF_URL, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const result = await updateRes.json();
  if (result.id) {
    console.log('\n✅ Workflow reconstruido com sucesso!');
    console.log('ID:', result.id);
    console.log('Nodes:', result.nodes.length);
    result.nodes.forEach((n, i) => {
      console.log(`  [${i}] ${n.name} (${n.type})`);
    });
  } else {
    console.log('\n❌ Erro:', JSON.stringify(result, null, 2));
  }
}

rebuild();
