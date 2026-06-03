const fs = require('fs');
const https = require('https');

const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYmNjYzViNWQtOTI4NS00N2I2LWJhOWUtNmZhYjQ1NDM1MTc0IiwiaWF0IjoxNzc5ODE1MjU0fQ.-l3smjKe9_ejhjXd1X7HzdnxROuC2CZQblCC7KJoJYM";

const workflows = [
  { id: 'm5wmXXTYAqLiRM9c', file: 'n8n-workflows/evolution-inbound-webhook.json', name: 'Evolution' },
  { id: '88zOQbdJAT7DOaET', file: 'n8n-workflows/meta-inbound-webhook.json', name: 'Meta' },
  { id: 'QjJqgqK9HzISzMhE', file: 'n8n-workflows/instagram-inbound-webhook.json', name: 'Instagram' }
];

function deployWorkflow(wf) {
  return new Promise((resolve, reject) => {
    console.log(`Deploying workflow ${wf.name} (${wf.id}) from ${wf.file}...`);
    const workflowData = JSON.parse(fs.readFileSync(wf.file, 'utf8'));
    
    delete workflowData.id;
    delete workflowData.active;
    workflowData.settings = {};

    const dataString = JSON.stringify(workflowData);

    const options = {
      hostname: 'n8n-n8n.rh3fr2.easypanel.host',
      path: `/api/v1/workflows/${wf.id}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': apiKey,
        'Content-Length': Buffer.byteLength(dataString)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`  Successfully uploaded ${wf.name} (Status ${res.statusCode})`);
          
          // Activate workflow
          const actReq = https.request({
            hostname: 'n8n-n8n.rh3fr2.easypanel.host',
            path: `/api/v1/workflows/${wf.id}/activate`,
            method: 'POST',
            headers: { 'X-N8N-API-KEY': apiKey }
          }, (actRes) => {
            console.log(`  Activation Status for ${wf.name}: ${actRes.statusCode}`);
            resolve(actRes.statusCode === 200);
          });
          actReq.on('error', e => {
            console.error(`  Activation error for ${wf.name}`, e);
            reject(e);
          });
          actReq.end();
        } else {
          console.error(`  Error uploading ${wf.name}: ${res.statusCode} - ${responseData}`);
          resolve(false);
        }
      });
    });

    req.on('error', e => {
      console.error(`  Network error uploading ${wf.name}:`, e);
      reject(e);
    });

    req.write(dataString);
    req.end();
  });
}

async function run() {
  try {
    console.log("1. Copying working evolution_current.json base to n8n-workflows...");
    fs.copyFileSync('scratch/evolution_current.json', 'n8n-workflows/evolution-inbound-webhook.json');
    console.log("   Copy successful!");

    console.log("\n2. Requiring patch_workflows.cjs to apply the AI node injections...");
    // Require executes the file immediately since it's scripted in root scope
    require('./patch_workflows.cjs');
    console.log("   Patching successful!");

    console.log("\n3. Starting deployment of all three corrected workflows...");
    for (const wf of workflows) {
      await deployWorkflow(wf);
    }
    console.log("\nALL CORRECTIONS AND DEPLOYMENTS DONE!");
  } catch (err) {
    console.error("Execution failed:", err);
  }
}

run();
