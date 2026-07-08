const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";

async function getDetails(id) {
  try {
    const response = await fetch(`${baseUrl}/executions/${id}?includeData=true`, {
      headers: { 'X-N8N-API-KEY': apiKey }
    });
    if (!response.ok) return;
    const data = await response.json();
    console.log(`\n================== DETAILS FOR ${id} ==================`);
    if (data.data && data.data.resultData && data.data.resultData.runData) {
      const runData = data.data.resultData.runData;
      for (const [nodeName, runs] of Object.entries(runData)) {
        runs.forEach((r, idx) => {
          if (nodeName === 'Call OpenAI API' || nodeName === 'Extract AI Answer' || nodeName === 'Send AI Response') {
            if (r.data && r.data.main) {
              console.log(`Node "${nodeName}" (Run #${idx+1}) output length: ${r.data.main.length}`);
              r.data.main.forEach((branch, bIdx) => {
                console.log(`  Branch #${bIdx+1} has ${branch.length} items.`);
                branch.forEach((item, iIdx) => {
                  console.log(`    Item #${iIdx+1}:`, JSON.stringify(item.json, null, 2));
                });
              });
            }
          }
        });
      }
    }
  } catch(e) {
    console.error(e);
  }
}

async function run() {
  await getDetails('67658'); // Meta Inbound
  await getDetails('67659'); // Central Agent
}

run();
