const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8";
const supabaseUrl = "https://ibyterftfrqgkhktkaeg.supabase.co";
const channelId = "15d09eea-b9b9-42f5-8231-8248dbb5fe7a"; // Instagram channel ID
const pageAccessToken = "EAAOFwaqMDFoBRlAm6eXdsU7NZBj2ZCNfd6z90MyJbsREtG1MCvxtWaZArBft3ZAgijKbyZAS4rdXkaNfx4RPixOmBm19nnlAqZBICDFYJ9wWvwuZBUALloaQCglVYYJ6KzLyXtlxzxemmGZBVfS5HTmuWargNjIoCO3ZAgh2PdMaeMudIfv5FA8ZBM5YDzXoZAdi8PGXzutBJkZD";

async function run() {
  console.log(`Updating Instagram channel ${channelId} with Page Access Token...`);
  
  const resp = await fetch(`${supabaseUrl}/rest/v1/channels?id=eq.${channelId}`, {
    method: 'PATCH',
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      access_token: pageAccessToken
    })
  });
  
  const result = await resp.json();
  console.log("Response status:", resp.status);
  console.log("Response body:", JSON.stringify(result, null, 2));
}

run().catch(console.error);
