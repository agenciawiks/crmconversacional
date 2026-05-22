// supabase.js – initialize Supabase client for the OmniCRM front‑end
// Replace the placeholder values with your actual Supabase project URL and anon public key.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_SERVICE_KEY || 'YOUR-ANON-KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to fetch messages for a given channel with realtime subscription
export const subscribeChannelMessages = (channelId, onMessage) => {
  // Initial load
  supabase
    .from('messages')
    .select('*')
    .eq('channel_id', channelId)
    .order('timestamp', { ascending: true })
    .then(({ data, error }) => {
      if (error) console.error('Supabase fetch error:', error);
      else data?.forEach(onMessage);
    });

  //Realtime subscription
  const subscription = supabase
    .channel(`public:messages:${channelId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      if (payload.new.channel_id === channelId) onMessage(payload.new);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

// Export other utilities as needed (e.g., insertMessage, updateChannelStatus)
export const insertMessage = async (msg) => {
  const { data, error } = await supabase.from('messages').insert([msg]);
  if (error) console.error('Insert message error:', error);
  return data;
};
