const https = require('https');

const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYmNjYzViNWQtOTI4NS00N2I2LWJhOWUtNmZhYjQ1NDM1MTc0IiwiaWF0IjoxNzc5ODE1MjU0fQ.-l3smjKe9_ejhjXd1X7HzdnxROuC2CZQblCC7KJoJYM";
const workflowId = "QjJqgqK9HzISzMhE"; 

https.get(`https://n8n-n8n.rh3fr2.easypanel.host/api/v1/executions?workflowId=${workflowId}&limit=5`, {
  headers: { 'X-N8N-API-KEY': apiKey }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data || '{}');
    if (json.data && json.data.length > 0) {
      console.log("Recent Executions:");
      json.data.forEach(exec => {
        console.log(`ID: ${exec.id}, Status: ${exec.status}, Started: ${exec.startedAt}`);
      });
      // Fetch details of the latest one
      const latestId = json.data[0].id;
      https.get(`https://n8n-n8n.rh3fr2.easypanel.host/api/v1/executions/${latestId}`, {
        headers: { 'X-N8N-API-KEY': apiKey }
      }, (res2) => {
        let data2 = '';
        res2.on('data', chunk => data2 += chunk);
        res2.on('end', () => {
          const detail = JSON.parse(data2 || '{}');
          console.log("Latest Execution Detail:", JSON.stringify(detail, null, 2));
        });
      });
    } else {
      console.log("No recent executions found for this workflow.");
    }
  });
}).on('error', console.error);
