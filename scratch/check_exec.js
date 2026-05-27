const https = require('https');
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYmNjYzViNWQtOTI4NS00N2I2LWJhOWUtNmZhYjQ1NDM1MTc0IiwiaWF0IjoxNzc5ODE1MjU0fQ.-l3smjKe9_ejhjXd1X7HzdnxROuC2CZQblCC7KJoJYM";

function apiCall(method, path) {
  return new Promise((resolve, reject) => {
    const opt = { method, hostname:"n8n-n8n.rh3fr2.easypanel.host", path:"/api/v1"+path, headers:{'X-N8N-API-KEY':apiKey} };
    const req = https.request(opt, (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(JSON.parse(d||'{}'))); });
    req.on('error',reject); req.end();
  });
}

async function run() {
  const data = await apiCall("GET", "/executions/34455?includeData=true");
  console.log("Status:", data.data?.status);
  const resultData = data.data?.resultData || {};
  if (resultData.error) {
    console.log("Global Error:", resultData.error);
  }
  const runData = resultData.runData || {};
  for (const [nodeName, nodeExecs] of Object.entries(runData)) {
    for (const exec of nodeExecs) {
      if (exec.error) {
        console.log(`Node "${nodeName}" error:`, exec.error);
      }
    }
  }
}
run();
