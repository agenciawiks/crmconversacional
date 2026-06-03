const https = require('https');

const supabaseUrl = 'https://ibyterftfrqgkhktkaeg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8';

const payload = JSON.stringify({
  name: "Instagram Caio",
  provider: "instagram",
  status: "connected",
  phone_id: "2049423789310349",
  access_token: "EAAOFwaqMDFoBRhMYWNS5sC0HObyQHvbhOcpZAKFBikrZCFFBzLBDRenYQzajYLqN4QUujwse8R51eBrY1b8ZBa7O4CXRZAMLKWvrbZBst4rZCFGWPfazXvKYDtb3y3vpG5mnYR0NqSixTAi5ncYrX5fW25dT4LsTpIWRWJX8mEKTZBo2Jr1fZAUEhA8nxP0OyL3qPwZDZD",
  credentials: { app_secret: "1d55f1aa0f86f5ec065ba097edf0a14e" }
});

const req = https.request(`${supabaseUrl}/rest/v1/channels`, {
  method: 'POST',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
});

req.on('error', console.error);
req.write(payload);
req.end();
