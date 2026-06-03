const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8";
const supabaseUrl = "https://ibyterftfrqgkhktkaeg.supabase.co";
const channelId = "15d09eea-b9b9-42f5-8231-8248dbb5fe7a"; // Instagram channel ID
const correctPhoneId = "17841406536284681"; // The real Instagram Business ID from the webhook

async function run() {
  console.log(`Updating Instagram channel ${channelId} with correct phone_id: ${correctPhoneId}...`);
  
  const resp = await fetch(`${supabaseUrl}/rest/v1/channels?id=eq.${channelId}`, {
    method: 'PATCH',
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      phone_id: correctPhoneId
    })
  });
  
  const result = await resp.json();
  console.log("Response status:", resp.status);
  console.log("Response body:", JSON.stringify(result, null, 2));
}

run().catch(console.error);
