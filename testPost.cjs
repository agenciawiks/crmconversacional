const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.LEAKED_KEY_REMOVED';

async function testPost() {
  const url = 'https://ibyterftfrqgkhktkaeg.supabase.co/rest/v1/ai_settings';
  const systemPromptJson = JSON.stringify({
    agent_name: 'Barbearia',
    model: 'gpt-4o-mini',
    api_key: 'test',
    system_prompt: 'Barbearia prompt',
    negative_prompt: '',
    is_enabled: true
  });
  const body = {
    tenant_id: '11111111-1111-1111-1111-111111111111',
    channel_id: '50df1e49-8f4c-4f90-b3c5-e9b95e37d8ed',
    system_prompt: systemPromptJson,
    temperature: 0.7,
    pause_trigger_phrases: []
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(body)
  });
  if (response.ok) {
    console.log('POST SUCCESS:', await response.json());
  } else {
    console.log('POST FAILED:', response.status, await response.text());
  }
}
testPost();
