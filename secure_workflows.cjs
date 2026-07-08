const fs = require('fs');
const path = require('path');

const workflowsDir = path.join(__dirname, 'n8n-workflows');

function secureWorkflows() {
  const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.json'));
  let updatedCount = 0;

  files.forEach(file => {
    const filePath = path.join(workflowsDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let modified = false;

    data.nodes.forEach(node => {
      // Check HTTP Request nodes
      if (node.type === 'n8n-nodes-base.httpRequest') {
        const p = node.parameters;
        
        // Remove hardcoded headers
        if (p.sendHeaders && p.headerParameters && p.headerParameters.parameters) {
          const originalLen = p.headerParameters.parameters.length;
          p.headerParameters.parameters = p.headerParameters.parameters.filter(h => {
            const name = h.name.toLowerCase();
            return name !== 'apikey' && name !== 'authorization';
          });
          
          if (p.headerParameters.parameters.length === 0) {
            delete p.headerParameters;
            // p.sendHeaders = false; // Don't turn off if they might add it manually, or just leave it
          }
          
          if (originalLen !== (p.headerParameters?.parameters?.length || 0)) {
            modified = true;
          }
        }

        // Only add credentials if the node interacts with Supabase
        // We'll check the URL if it contains supabase.co
        if (p.url && p.url.includes('supabase.co')) {
          p.authentication = 'genericCredentialType';
          p.genericAuthType = 'httpHeaderAuth';

          node.credentials = {
            "httpHeaderAuth": {
              "id": "",
              "name": "Header Auth account"
            }
          };
          modified = true;
        }
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Secured ${file}`);
      updatedCount++;
    }
  });

  console.log(`\nUpdated ${updatedCount} workflows.`);
}

secureWorkflows();
