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
    console.log(`\n==================================================`);
    console.log(`Execution ${id} Data Details (Workflow: ${data.workflowId}):`);
    console.log(`==================================================`);
    if (data.data && data.data.resultData && data.data.resultData.runData) {
      const runData = data.data.resultData.runData;
      for (const [nodeName, nodeRuns] of Object.entries(runData)) {
        console.log(`\nNode: "${nodeName}"`);
        nodeRuns.forEach((run, idx) => {
          console.log(`  Run #${idx + 1}:`);
          if (run.error) {
            console.log(`    ERROR:`, run.error);
          }
          if (run.data && run.data.main && run.data.main.length > 0) {
            const firstBranch = run.data.main[0];
            if (firstBranch && firstBranch.length > 0) {
              const item = firstBranch[0];
              console.log(`    Output item:`, JSON.stringify(item, null, 2).substring(0, 1000));
            } else {
              console.log(`    Output branch [0] is empty`);
            }
          } else {
            console.log(`    No output main data`);
          }
        });
      }
    } else {
      console.log('No result run data found.');
    }
  } catch (e) {
    console.error(e);
  }
}

async function run() {
  await getExecutionData('64753');
}

run();
