const fs = require('fs');

const oldRef = "ibyterftfrqgkhktkaeg";
const newRef = "rjcuoxvutrrzknicyuev";

const oldUrl = `https://${oldRef}.supabase.co`;
const newUrl = `https://${newRef}.supabase.co`;

const oldServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8";
const newServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqY3VveHZ1dHJyemtuaWN5dWV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzM0ODEyMCwiZXhwIjoyMDk4OTI0MTIwfQ.p0MiiM1RHbV9K0lEBDnJwopAveSCa64T7ogUG7Cy-rE";

const files = [
  'scratch/prod_evolution_inbound.json',
  'scratch/prod_outbound_send.json',
  'scratch/prod_followup_dispatcher.json',
  'scratch/prod_central_ai_agent.json'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    console.log(`Replacing database configuration in ${f}...`);
    let content = fs.readFileSync(f, 'utf8');

    // Replace URLs and Refs
    let oldOccurrencesOfRef = (content.match(new RegExp(oldRef, 'g')) || []).length;
    let oldOccurrencesOfKey = (content.match(new RegExp(oldServiceRoleKey, 'g')) || []).length;

    content = content.split(oldUrl).join(newUrl);
    content = content.split(oldRef).join(newRef);
    content = content.split(oldServiceRoleKey).join(newServiceRoleKey);

    fs.writeFileSync(f, content);
    console.log(`  Updated: ${oldOccurrencesOfRef} ref/URL instances, ${oldOccurrencesOfKey} key instances replaced.`);
  } else {
    console.warn(`File not found: ${f}`);
  }
});

console.log("Database replacement complete!");
