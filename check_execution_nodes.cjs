const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyN2Y2NjgzMS1iNjE2LTQwZGEtYjZkYS05MGQzZWExMmE0NmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjNkZGI1ZTAtOWU1ZS00ZWVmLTk3MGYtMTg1NTM1MDE4YmYyIiwiaWF0IjoxNzgwOTU1OTI0fQ.2BsiFzbIzF_LMSEqi5TOY50YY9U4ugBDOQaocKZ89xg";
const baseUrl = "https://n8n-n8n.rh3fr2.easypanel.host/api/v1";

async function getExecutionData(id) {
  try {
    const response = await fetch(`${baseUrl}/executions/${id}?includeData=true`, {
      headers: {
        'X-N8N-API-KEY': apiKey
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${id}:`, response.status);
      return;
    }

    const data = await response.json();
    console.log(`Execution ${id} Nodes:`);
    if (data.data && data.data.resultData && data.data.resultData.runData) {
      const runData = data.data.resultData.runData;
      
      const nodesToCheck = ['AI Webhook Trigger', 'Fetch Contact', 'AI Routing Decision'];
      nodesToCheck.forEach(nodeName => {
        const nodeRuns = runData[nodeName];
        if (nodeRuns) {
          console.log(`\nNode: "${nodeName}"`);
          nodeRuns.forEach((run, idx) => {
            console.log(`  Run #${idx + 1}:`);
            if (run.data && run.data.main) {
              run.data.main.forEach((branch, bIdx) => {
                console.log(`    Branch #${bIdx}:`);
                if (branch) {
                  console.log(JSON.stringify(branch.slice(0, 5), null, 2));
                } else {
                  console.log('      (empty)');
                }
              });
            }
          });
        } else {
          console.log(`Node "${nodeName}" did not execute.`);
        }
      });
    }
  } catch (e) {
    console.error(e);
  }
}

getExecutionData('76105');
