const https = require('https');

const data = JSON.stringify({
  "object": "instagram",
  "entry": [
    {
      "id": "2049423789310349",
      "time": Date.now(),
      "messaging": [
        {
          "sender": { "id": "1530247715083924" },
          "recipient": { "id": "2049423789310349" },
          "timestamp": Date.now(),
          "message": {
            "mid": "mid." + Date.now(),
            "text": "Hello this is a test from the system"
          }
        }
      ]
    }
  ]
});

const options = {
  hostname: 'n8n-n8n.rh3fr2.easypanel.host',
  path: '/webhook/instagram',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log('Body:', responseData);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
