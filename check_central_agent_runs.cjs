const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";
const wfId = "qzJptf3XgjdxpZG5"; // Central AI Agent

async function find() {
  try {
    const response = await fetch(`${baseUrl}/executions?workflowId=${wfId}&limit=10`, {
      headers: { 'X-N8N-API-KEY': apiKey }
    });
    if (!response.ok) return;
    const data = await response.json();
    console.log(`Found ${data.data.length} executions for Central AI Agent`);
    for (const exec of data.data) {
      console.log(`Execution ID: ${exec.id}, Status: ${exec.status}, StartedAt: ${exec.startedAt}, StoppedAt: ${exec.stoppedAt}`);
      
      // Let's print the detailed node outputs for this execution if it ran today
      const detailsResp = await fetch(`${baseUrl}/executions/${exec.id}?includeData=true`, {
        headers: { 'X-N8N-API-KEY': apiKey }
      });
      if (detailsResp.ok) {
        const details = await detailsResp.json();
        if (details.data && details.data.resultData && details.data.resultData.runData) {
          const runData = details.data.resultData.runData;
          for (const [nodeName, runs] of Object.entries(runData)) {
            runs.forEach((r, idx) => {
              if (nodeName === 'Send AI Response' || nodeName === 'AI Routing Decision') {
                if (r.data && r.data.main && r.data.main.length > 0 && r.data.main[0].length > 0) {
                  console.log(`  Node "${nodeName}" output:`, JSON.stringify(r.data.main[0][0].json, null, 2).substring(0, 300));
                }
              }
            });
          }
        }
      }
    }
  } catch(e) {
    console.error(e);
  }
}

find();
