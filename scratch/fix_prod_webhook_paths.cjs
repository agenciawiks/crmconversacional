const fs = require('fs');

const filesToFix = [
  { file: 'scratch/prod_evolution_inbound.json', nodeName: 'Evolution Webhook Trigger', newPath: 'evolution-prod' },
  { file: 'scratch/prod_outbound_send.json', nodeName: 'Send Message Trigger', newPath: 'send-prod' },
  { file: 'scratch/prod_central_ai_agent.json', nodeName: 'AI Webhook Trigger', newPath: 'central-agent-prod' }
];

filesToFix.forEach(f => {
  if (fs.existsSync(f.file)) {
    const data = JSON.parse(fs.readFileSync(f.file, 'utf8'));
    const node = data.nodes.find(n => n.name === f.nodeName);
    if (node) {
      console.log(`Fixing node "${f.nodeName}" in ${f.file}...`);
      if (!node.parameters) node.parameters = {};
      node.parameters.path = f.newPath;
      fs.writeFileSync(f.file, JSON.stringify(data, null, 2));
      console.log(`Updated path to "${f.newPath}"`);
    } else {
      console.warn(`Node "${f.nodeName}" not found in ${f.file}`);
    }
  }
});
