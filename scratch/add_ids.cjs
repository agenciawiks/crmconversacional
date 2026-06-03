const fs = require('fs');
const crypto = require('crypto');

const file = 'c:\\Users\\CAIO\\Desktop\\Antigravityy\\crm_conversacional\\n8n-workflows\\instagram-inbound-webhook.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

for (const node of data.nodes) {
  if (!node.id) {
    node.id = crypto.randomUUID();
  }
}

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Added IDs to nodes');
