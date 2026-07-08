const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";

async function getExecution(id) {
  try {
    const response = await fetch(`${baseUrl}/executions/${id}?includeData=true`, {
      headers: { 'X-N8N-API-KEY': apiKey }
    });
    if (!response.ok) return;
    const data = await response.json();
    console.log(`\n=== EXECUTION ${id} ===`);
    if (data.data && data.data.resultData && data.data.resultData.runData) {
      const runData = data.data.resultData.runData;
      for (const [nodeName, runs] of Object.entries(runData)) {
        runs.forEach((r, idx) => {
          if (r.data && r.data.main && r.data.main.length > 0 && r.data.main[0].length > 0) {
            const out = r.data.main[0][0].json;
            // Print nodes that make HTTP requests or perform actions
            if (nodeName.includes('Send') || nodeName.includes('Call') || nodeName.includes('AI') || nodeName.includes('Response')) {
              console.log(`Node "${nodeName}" (Run #${idx+1}) output:`, JSON.stringify(out, null, 2).substring(0, 500));
            }
          }
        });
      }
    }
  } catch(e) {
    console.error(e);
  }
}

async function check() {
  await getExecution('67688');
  await getExecution('67687');
  await getExecution('67686');
  await getExecution('67685');
}

check();
