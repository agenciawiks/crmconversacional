const fs = require('fs');
const https = require('https');

const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYmNjYzViNWQtOTI4NS00N2I2LWJhOWUtNmZhYjQ1NDM1MTc0IiwiaWF0IjoxNzc5ODE1MjU0fQ.-l3smjKe9_ejhjXd1X7HzdnxROuC2CZQblCC7KJoJYM";

const workflows = [
  { id: 'm5wmXXTYAqLiRM9c', file: 'n8n-workflows/evolution-inbound-webhook.json', name: 'Evolution' },
  { id: '88zOQbdJAT7DOaET', file: 'n8n-workflows/meta-inbound-webhook.json', name: 'Meta' },
  { id: 'QjJqgqK9HzISzMhE', file: 'n8n-workflows/instagram-inbound-webhook.json', name: 'Instagram' }
];

console.log("1. Copying working evolution base...");
fs.copyFileSync('scratch/evolution_current.json', 'n8n-workflows/evolution-inbound-webhook.json');
console.log("   Copy successful!");

console.log("\n2. Patching workflows with AI settings...");
require('./patch_workflows.cjs');

console.log("\n3. Launching asynchronous deployments...");
workflows.forEach(wf => {
  console.log(`Uploading ${wf.name} (${wf.id})...`);
  const workflowData = JSON.parse(fs.readFileSync(wf.file, 'utf8'));
  delete workflowData.id;
  delete workflowData.active;
  workflowData.settings = {};

  const dataString = JSON.stringify(workflowData);

  const req = https.request({
    hostname: 'n8n-n8n.rh3fr2.easypanel.host',
    path: `/api/v1/workflows/${wf.id}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': apiKey,
      'Content-Length': Buffer.byteLength(dataString)
    }
  }, (res) => {
    let responseData = '';
    res.on('data', chunk => responseData += chunk);
    res.on('end', () => {
      console.log(`-> ${wf.name} Upload Status: ${res.statusCode}`);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Activate
        const actReq = https.request({
          hostname: 'n8n-n8n.rh3fr2.easypanel.host',
          path: `/api/v1/workflows/${wf.id}/activate`,
          method: 'POST',
          headers: { 'X-N8N-API-KEY': apiKey }
        }, (actRes) => {
          console.log(`-> ${wf.name} Activation Status: ${actRes.statusCode}`);
        });
        actReq.on('error', e => console.error(`-> ${wf.name} Activation Error:`, e.message));
        actReq.end();
      } else {
        console.error(`-> ${wf.name} Upload Failed:`, responseData);
      }
    });
  });

  req.on('error', e => console.error(`-> ${wf.name} Network Error:`, e.message));
  req.write(dataString);
  req.end();
});
