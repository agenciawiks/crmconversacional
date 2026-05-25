const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiYjM2NDIxYjEtMjcxMy00NDJiLTkwMDAtOTkxOWFhZmQ2MGI0IiwiaWF0IjoxNzc5Mzg1OTI2fQ.jF56nR6RvnHavWrc0pgoon_hGzQIhe0eKWERU98LCuM';

async function run() {
  const execRes = await fetch(`https://n8n-n8n.rh3fr2.easypanel.host/api/v1/executions/32866`, {
    headers: { 'X-N8N-API-KEY': API_KEY }
  });
  const execData = await execRes.json();
  const data = execData.data?.data?.resultData?.runData;
  if(data) {
    for(const nodeName in data) {
      const nodeRuns = data[nodeName];
      nodeRuns.forEach(r => {
        if(r.error) {
           console.log(`Node ${nodeName} failed:`, r.error.message);
        }
      })
    }
  }

  const execRes2 = await fetch(`https://n8n-n8n.rh3fr2.easypanel.host/api/v1/executions/32864`, {
    headers: { 'X-N8N-API-KEY': API_KEY }
  });
  const execData2 = await execRes2.json();
  const data2 = execData2.data?.data?.resultData?.runData;
  if(data2) {
    for(const nodeName in data2) {
      const nodeRuns = data2[nodeName];
      nodeRuns.forEach(r => {
        if(r.error) {
           console.log(`Outbound Node ${nodeName} failed:`, r.error.message);
        }
      })
    }
  }
}
run();
