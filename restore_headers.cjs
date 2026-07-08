const fs = require('fs');
const path = require('path');

const workflowsDir = path.join(__dirname, 'n8n-workflows');
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8";

function restoreHeaders() {
  const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.json'));
  let updatedCount = 0;

  files.forEach(file => {
    const filePath = path.join(workflowsDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let modified = false;

    data.nodes.forEach(node => {
      // Check HTTP Request nodes and the new HTTP Request Tool
      if ((node.type === 'n8n-nodes-base.httpRequest' || node.type === 'n8n-nodes-base.httpRequestTool') && node.parameters.url && node.parameters.url.includes('supabase.co')) {
        const p = node.parameters;
        
        // Remove authentication requirement
        delete p.authentication;
        delete p.genericAuthType;
        delete node.credentials;

        // Re-add headers
        p.sendHeaders = true;
        if (!p.headerParameters) {
          p.headerParameters = { parameters: [] };
        }
        
        // Remove existing apikey or Authorization just in case
        p.headerParameters.parameters = p.headerParameters.parameters.filter(h => {
            const name = h.name.toLowerCase();
            return name !== 'apikey' && name !== 'authorization';
        });

        // Add them back
        p.headerParameters.parameters.unshift(
          { name: "apikey", value: serviceKey },
          { name: "Authorization", value: `Bearer ${serviceKey}` }
        );

        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Restored headers in ${file}`);
      updatedCount++;
    }
  });

  console.log(`\nRestored headers in ${updatedCount} workflows.`);
}

restoreHeaders();
