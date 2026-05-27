const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('crm_conversacional/supabase_schema.json', 'utf8'));
console.log("Available paths in Supabase:");
console.log(Object.keys(schema.paths).filter(p => p.startsWith('/')));
