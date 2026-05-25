const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ibyterftfrqgkhktkaeg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixDuplicates() {
  console.log('=== FIXING DUPLICATE CONTACTS ===\n');

  // 1. Get all contacts
  const { data: contacts, error: cErr } = await supabase.from('contacts').select('*').order('created_at', { ascending: true });
  if (cErr) { console.error('Error fetching contacts:', cErr); return; }
  console.log(`Total contacts: ${contacts.length}`);

  // 2. Group by phone
  const byPhone = {};
  for (const c of contacts) {
    if (!byPhone[c.phone]) byPhone[c.phone] = [];
    byPhone[c.phone].push(c);
  }

  for (const [phone, dupes] of Object.entries(byPhone)) {
    if (dupes.length <= 1) continue;
    
    console.log(`\nPhone ${phone}: ${dupes.length} duplicates`);
    
    // Keep the first one (oldest)
    const keep = dupes[0];
    const removeIds = dupes.slice(1).map(d => d.id);
    
    console.log(`  Keeping: ${keep.id} (${keep.name})`);
    console.log(`  Removing: ${removeIds.length} duplicates`);

    // 3. Update all messages pointing to duplicate contact_ids to point to the keeper
    for (const removeId of removeIds) {
      const { data: updated, error: uErr } = await supabase
        .from('messages')
        .update({ contact_id: keep.id })
        .eq('contact_id', removeId);
      
      if (uErr) console.error(`  Error updating messages for ${removeId}:`, uErr);
    }

    // 4. Delete duplicate contacts
    const { error: dErr } = await supabase
      .from('contacts')
      .delete()
      .in('id', removeIds);
    
    if (dErr) console.error(`  Error deleting duplicates:`, dErr);
    else console.log(`  ✅ Deleted ${removeIds.length} duplicates, kept ${keep.id}`);
  }

  // 5. Add UNIQUE constraint on phone column
  console.log('\n=== ADDING UNIQUE CONSTRAINT ON phone ===');
  const { error: sqlErr } = await supabase.rpc('exec_sql', {
    query: 'ALTER TABLE public.contacts ADD CONSTRAINT contacts_phone_unique UNIQUE (phone);'
  });
  
  if (sqlErr) {
    console.log('Could not add via RPC (expected). You need to run this SQL in Supabase Dashboard:');
    console.log('  ALTER TABLE public.contacts ADD CONSTRAINT contacts_phone_unique UNIQUE (phone);');
    console.log('\nAlternatively, trying via REST...');
    
    // Try direct SQL via PostgREST
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: 'ALTER TABLE public.contacts ADD CONSTRAINT contacts_phone_unique UNIQUE (phone);' })
    });
    const resText = await res.text();
    console.log('SQL result:', res.status, resText);
  } else {
    console.log('✅ UNIQUE constraint added!');
  }

  // 6. Verify
  const { data: finalContacts } = await supabase.from('contacts').select('*');
  const { data: finalMessages } = await supabase.from('messages').select('id, contact_id');
  console.log(`\n=== FINAL STATE ===`);
  console.log(`Contacts: ${finalContacts?.length}`);
  console.log(`Messages: ${finalMessages?.length}`);
  
  // Check orphaned messages
  const contactIds = new Set(finalContacts?.map(c => c.id));
  const orphaned = finalMessages?.filter(m => m.contact_id && !contactIds.has(m.contact_id));
  console.log(`Orphaned messages: ${orphaned?.length || 0}`);
}

fixDuplicates();
