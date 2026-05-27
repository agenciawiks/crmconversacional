const https = require('https');
const supabaseUrl = "https://ibyterftfrqgkhktkaeg.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8";
const metaChannelId = "4886443e-4996-4d2a-83e1-d96f503e1a28";

function fetchChannel() {
  return new Promise((resolve, reject) => {
    https.get(`${supabaseUrl}/rest/v1/channels?id=eq.${metaChannelId}&select=*`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d || '[]')));
    }).on('error', reject);
  });
}

async function run() {
  const data = await fetchChannel();
  console.log("Channel Data:", JSON.stringify(data, null, 2));
}
run();
