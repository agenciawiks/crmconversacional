const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.LEAKED_KEY_REMOVED';

async function testPatch() {
  const url = 'https://ibyterftfrqgkhktkaeg.supabase.co/rest/v1/ai_settings?id=eq.5ad62696-f635-4af9-bae0-90e6ae4d1f66';
  const body = {
    temperature: 0.71
  };
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(body)
  });
  if (response.ok) {
    console.log('PATCH SUCCESS:', await response.json());
  } else {
    console.log('PATCH FAILED:', response.status, await response.text());
  }
}
testPatch();
