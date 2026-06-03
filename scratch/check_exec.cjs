const https = require('https');

const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYmNjYzViNWQtOTI4NS00N2I2LWJhOWUtNmZhYjQ1NDM1MTc0IiwiaWF0IjoxNzc5ODE1MjU0fQ.-l3smjKe9_ejhjXd1X7HzdnxROuC2CZQblCC7KJoJYM";
const workflowId = "NFkf4R8DDJ2o7Sqx";

function apiCall(path) {
  return new Promise((resolve, reject) => {
    https.get(`https://n8n-n8n.rh3fr2.easypanel.host/api/v1${path}`, {
      headers: { 'X-N8N-API-KEY': apiKey }
    }, (res) => {
      let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => resolve(JSON.parse(data || '{}')));
    }).on('error', reject);
  });
}

async function run() {
  const result = await apiCall(`/executions?workflowId=${workflowId}&limit=30`);
  const execs = result.data || [];
  console.log(`Scanning last ${execs.length} executions for Outbound workflow to find WhatsApp/Meta events...`);
  
  let foundMeta = 0;
  for (const ex of execs) {
    const detail = await apiCall(`/executions/${ex.id}?includeData=true`);
    const rd = detail.data?.resultData || {};
    const runData = rd.runData || {};
    
    let provider = 'unknown';
    if (runData['Fetch Channel from DB']) {
      const channelOut = runData['Fetch Channel from DB'][0]?.data?.main?.[0]?.[0]?.json;
      provider = channelOut?.provider || 'unknown';
    }
    
    console.log(`Execution ${ex.id}: Provider = ${provider} | Status = ${ex.status}`);
    
    if (provider === 'meta') {
      foundMeta++;
      console.log(`\n--- FOUND META OUTBOUND EXECUTION ${ex.id} ---`);
      if (runData['Send Message Trigger']) {
        console.log(`- Trigger Input:`, JSON.stringify(runData['Send Message Trigger'][0]?.data?.main?.[0]?.[0]?.json, null, 2));
      }
      if (runData['Send via Meta API']) {
        const nodeRun = runData['Send via Meta API'][0];
        console.log(`- Send via Meta API Executed!`);
        if (nodeRun.error) {
          console.log(`  ERROR:`, JSON.stringify(nodeRun.error, null, 2));
        }
        if (nodeRun.data?.main?.[0]) {
          console.log(`  Output:`, JSON.stringify(nodeRun.data.main[0], null, 2));
        }
      }
      console.log(`-------------------------------------------\n`);
    }
  }
  
  console.log(`Scan completed. Found ${foundMeta} Meta/WhatsApp outbound executions out of ${execs.length}.`);
}

run().catch(console.error);
