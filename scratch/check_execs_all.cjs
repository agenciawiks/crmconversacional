const https = require('https');
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYmNjYzViNWQtOTI4NS00N2I2LWJhOWUtNmZhYjQ1NDM1MTc0IiwiaWF0IjoxNzc5ODE1MjU0fQ.-l3smjKe9_ejhjXd1X7HzdnxROuC2CZQblCC7KJoJYM";

function apiCall(path) {
  return new Promise((resolve, reject) => {
    https.get(`https://n8n-n8n.rh3fr2.easypanel.host/api/v1${path}`, { headers: { 'X-N8N-API-KEY': apiKey } }, (res) => {
      let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => resolve(JSON.parse(data || '{}')));
    }).on('error', reject);
  });
}

const wfs = {
  meta: "88zOQbdJAT7DOaET",
  evolution: "m5wmXXTYAqLiRM9c",
  instagram: "QjJqgqK9HzISzMhE"
};

async function run() {
  for (const [name, id] of Object.entries(wfs)) {
    console.log(`\n==========================================`);
    console.log(`Workflow: ${name.toUpperCase()} (${id})`);
    console.log(`==========================================`);
    
    const result = await apiCall(`/executions?workflowId=${id}&limit=2`);
    const execs = result.data || [];
    if (execs.length === 0) {
      console.log("No recent executions found.");
      continue;
    }
    
    for (const ex of execs) {
      console.log(`\n  - Exec ID: ${ex.id} (${ex.startedAt})`);
      console.log(`    Status: ${ex.status}`);
      
      const detail = await apiCall(`/executions/${ex.id}?includeData=true`);
      const rd = detail.data?.resultData || {};
      
      if (rd.error) {
        console.log(`    Error Message: ${rd.error.message}`);
        console.log(`    Error Node: ${rd.error.nodeName}`);
      }
      
      if (rd.runData) {
        const nodesExecuted = Object.keys(rd.runData);
        console.log(`    Nodes executed: ${nodesExecuted.join(' -> ')}`);
        
        // Print decision node output
        const decisionNode = rd.runData['AI Routing Decision'];
        if (decisionNode) {
          console.log(`    AI Routing Decision Output:`, JSON.stringify(decisionNode[0]?.data?.main?.[0], null, 2));
        }
        
        // Print call openai input/output
        const callOpenAI = rd.runData['Call OpenAI API'];
        if (callOpenAI) {
          console.log(`    Call OpenAI API Error/Data:`, JSON.stringify(callOpenAI[0]?.error || callOpenAI[0]?.data?.main?.[0], null, 2));
        }

        // Print send response input/output
        const sendResponse = rd.runData['Send AI Response'];
        if (sendResponse) {
          console.log(`    Send AI Response Output:`, JSON.stringify(sendResponse[0]?.error || sendResponse[0]?.data?.main?.[0], null, 2));
        }
      }
    }
  }
}

run();
