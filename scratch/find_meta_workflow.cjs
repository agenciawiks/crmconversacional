const https = require('https');

const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYmNjYzViNWQtOTI4NS00N2I2LWJhOWUtNmZhYjQ1NDM1MTc0IiwiaWF0IjoxNzc5ODE1MjU0fQ.-l3smjKe9_ejhjXd1X7HzdnxROuC2CZQblCC7KJoJYM";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1/workflows";

function makeRequest() {
  return new Promise((resolve, reject) => {
    https.get(baseUrl, { headers: { 'X-N8N-API-KEY': apiKey } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(JSON.parse(data || '{}'));
      });
    }).on('error', reject);
  });
}

async function run() {
  const result = await makeRequest();
  const workflows = result.data || [];
  const metaWorkflow = workflows.find(w => w.name.includes("WhatsApp Meta Official"));
  if (metaWorkflow) {
    console.log("Found Meta Workflow!");
    console.log("ID:", metaWorkflow.id);
    console.log("Name:", metaWorkflow.name);
    console.log("Active:", metaWorkflow.active);
  } else {
    console.log("Meta Workflow not found in list.");
  }
}

run().catch(console.error);
