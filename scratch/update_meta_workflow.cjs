const https = require('https');
const fs = require('fs');

const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYmNjYzViNWQtOTI4NS00N2I2LWJhOWUtNmZhYjQ1NDM1MTc0IiwiaWF0IjoxNzc5ODE1MjU0fQ.-l3smjKe9_ejhjXd1X7HzdnxROuC2CZQblCC7KJoJYM";
const workflowId = "88zOQbdJAT7DOaET";

async function run() {
  const workflowData = JSON.parse(fs.readFileSync('n8n-workflows/meta-inbound-webhook.json', 'utf8'));
  
  delete workflowData.id;
  delete workflowData.active;
  workflowData.settings = {};

  const dataString = JSON.stringify(workflowData);

  const options = {
    hostname: 'n8n-n8n.rh3fr2.easypanel.host',
    path: `/api/v1/workflows/${workflowId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': apiKey,
      'Content-Length': Buffer.byteLength(dataString)
    }
  };

  const req = https.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      const respJson = JSON.parse(responseData || '{}');
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log("Success! Meta Workflow updated.");
        
        // Ensure it's active
        const actReq = https.request({
          hostname: 'n8n-n8n.rh3fr2.easypanel.host',
          path: `/api/v1/workflows/${workflowId}/activate`,
          method: 'POST',
          headers: { 'X-N8N-API-KEY': apiKey }
        }, (actRes) => {
          console.log(`Activation Status: ${actRes.statusCode}`);
        });
        actReq.on('error', (e) => console.error("Activation error", e));
        actReq.end();
      } else {
        console.error("Error updating workflow:", responseData);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.write(dataString);
  req.end();
}

run();
