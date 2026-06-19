import { supabase } from '../supabase';

export const fetchRules = async () => {
  const { data, error } = await supabase
    .from('followup_rules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[followUpService] fetchRules error:', error);
    return [];
  }
  return data || [];
};

export const createRule = async (payload) => {
  const { data, error } = await supabase
    .from('followup_rules')
    .insert([payload])
    .select();

  if (error) {
    console.error('[followUpService] createRule error:', error);
    return null;
  }
  return data?.[0] || null;
};

export const updateRule = async (id, patch) => {
  const { data, error } = await supabase
    .from('followup_rules')
    .update(patch)
    .eq('id', id)
    .select();

  if (error) {
    console.error('[followUpService] updateRule error:', error);
    return null;
  }
  return data?.[0] || null;
};

export const deleteRule = async (id) => {
  const { error } = await supabase
    .from('followup_rules')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[followUpService] deleteRule error:', error);
    return false;
  }
  return true;
};

export const fetchQueue = async (filters = {}) => {
  let query = supabase
    .from('followup_queue')
    .select(`
      *,
      contacts:contact_id ( id, name, phone ),
      channels:channel_id ( id, name, provider )
    `)
    .order('scheduled_at', { ascending: true });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.contact_id) {
    query = query.eq('contact_id', filters.contact_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[followUpService] fetchQueue error:', error);
    return [];
  }
  return data || [];
};

export const cancelQueueItem = async (id, reason) => {
  const { data, error } = await supabase
    .from('followup_queue')
    .update({
      status: 'cancelled',
      cancel_reason: reason
    })
    .eq('id', id)
    .select();

  if (error) {
    console.error('[followUpService] cancelQueueItem error:', error);
    return null;
  }
  return data?.[0] || null;
};

export const fetchSettings = async () => {
  const { data, error } = await supabase
    .from('crm_settings')
    .select('*');

  if (error) {
    console.error('[followUpService] fetchSettings error:', error);
    return [];
  }
  return data || [];
};

export const updateSetting = async (key, value) => {
  const { data, error } = await supabase
    .from('crm_settings')
    .upsert({ key, value })
    .select();

  if (error) {
    console.error('[followUpService] updateSetting error:', error);
    return null;
  }
  return data?.[0] || null;
};
