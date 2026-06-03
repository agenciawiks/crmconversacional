const https = require('https');

const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYmNjYzViNWQtOTI4NS00N2I2LWJhOWUtNmZhYjQ1NDM1MTc0IiwiaWF0IjoxNzc5ODE1MjU0fQ.-l3smjKe9_ejhjXd1X7HzdnxROuC2CZQblCC7KJoJYM";
const execId = "39242";

function apiCall(path) {
  return new Promise((resolve, reject) => {
    https.get(`https://n8n-n8n.rh3fr2.easypanel.host/api/v1${path}`, {
      headers: { 'X-N8N-API-KEY': apiKey }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data || '{}')));
    }).on('error', reject);
  });
}

async function run() {
  console.log(`Fetching execution details for ID: ${execId}`);
  const detail = await apiCall(`/executions/${execId}?includeData=true`);
  const runData = detail.data?.resultData?.runData || {};
  
  for (const [nodeName, nodeExecs] of Object.entries(runData)) {
    console.log(`\n--- Node: ${nodeName} ---`);
    nodeExecs.forEach((ne, index) => {
      console.log(`Run ${index + 1}:`);
      if (ne.error) {
        console.log(`  ERROR: ${ne.error.message}`);
      }
      if (ne.data?.main?.[0]) {
        console.log("  OUTPUT DATA (first item):", JSON.stringify(ne.data.main[0], null, 2));
      } else {
        console.log("  No main output data.");
      }
    });
  }
}

run();
