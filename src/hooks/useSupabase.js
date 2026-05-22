// useSupabase.js – Custom hooks for Supabase Realtime integration
// Provides realtime message subscriptions, channel sync, and outbound send via n8n

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return SUPABASE_URL && !SUPABASE_URL.includes('YOUR-PROJECT');
};

// ─── Hook: Realtime Messages ────────────────────────────────
// Subscribes to new messages on the 'messages' table in realtime
export function useRealtimeMessages() {
  const [realtimeMessages, setRealtimeMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    // Subscribe to INSERT events on messages table
    const channel = supabase
      .channel('realtime:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new;
          setRealtimeMessages(prev => [...prev, {
            id: newMsg.id,
            sender: newMsg.direction === 'in' ? 'client' : 'agent',
            text: newMsg.content,
            time: new Date(newMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(newMsg.timestamp),
            channel_id: newMsg.channel_id,
            contact_id: newMsg.contact_id,
            content_type: newMsg.content_type,
            media_url: newMsg.media_url,
            status: newMsg.status
          }]);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return { realtimeMessages, isConnected };
}

// ─── Hook: Realtime Channel Status ─────────────────────────
// Watches for channel status changes (connected/disconnected/expired)
export function useRealtimeChannels() {
  const [channelUpdates, setChannelUpdates] = useState([]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('realtime:channels')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channels' },
        (payload) => {
          setChannelUpdates(prev => [...prev, {
            type: payload.eventType, // INSERT, UPDATE, DELETE
            data: payload.new || payload.old
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { channelUpdates };
}

// ─── Fetch: Load message history from Supabase ──────────────
export async function fetchMessages(channelId) {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('channel_id', channelId)
    .order('timestamp', { ascending: true })
    .limit(200);

  if (error) {
    console.error('[Supabase] fetchMessages error:', error);
    return [];
  }

  return (data || []).map(msg => ({
    id: msg.id,
    sender: msg.direction === 'in' ? 'client' : 'agent',
    text: msg.content,
    time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: new Date(msg.timestamp),
    channel_id: msg.channel_id,
    contact_id: msg.contact_id,
    content_type: msg.content_type,
    status: msg.status
  }));
}

// ─── Fetch: Load channels from Supabase ─────────────────────
export async function fetchChannels() {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] fetchChannels error:', error);
    return [];
  }

  return (data || []).map(ch => ({
    id: ch.id,
    name: ch.name,
    provider: ch.provider === 'meta' ? 'meta_cloud' : 'evolution',
    status: ch.status,
    url: ch.url,
    instance: ch.instance,
    apiKey: ch.api_key,
    phoneId: ch.phone_id,
    accessToken: ch.access_token,
    webhookUrl: ch.webhook_url,
    lastSeen: ch.last_seen
  }));
}

// ─── Fetch: Load contacts from Supabase ─────────────────────
export async function fetchContacts() {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[Supabase] fetchContacts error:', error);
    return [];
  }

  return (data || []).map(c => ({
    id: c.id,
    name: c.name || c.phone,
    email: c.email || '',
    phone: c.phone,
    status: c.pipeline_stage || 'new',
    channel: 'whatsapp',
    value: 0,
    tags: c.tags || [],
    unread: false,
    avatarColor: `hsl(${Math.abs(hashCode(c.phone)) % 360}, 75%, 60%)`,
    notes: c.notes ? [{ id: 1, text: c.notes, date: c.updated_at }] : [],
    messages: []
  }));
}

// ─── Action: Send message via n8n webhook ───────────────────
export async function sendMessageViaWebhook(channelId, phone, content) {
  if (!N8N_WEBHOOK_URL) {
    console.warn('[n8n] Webhook URL not configured. Message not sent externally.');
    return { success: false, reason: 'N8N_WEBHOOK_URL not configured' };
  }

  try {
    const response = await fetch(`${N8N_WEBHOOK_URL}/webhook/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel_id: channelId,
        phone: phone,
        content: content
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (err) {
    console.error('[n8n] sendMessage error:', err);
    return { success: false, reason: err.message };
  }
}

// ─── Action: Add channel to Supabase ────────────────────────
export async function addChannelToSupabase(channelData) {
  if (!isSupabaseConfigured()) return null;

  const row = {
    name: channelData.name,
    provider: channelData.provider === 'meta_cloud' ? 'meta' : 'evolution',
    status: 'connected',
    url: channelData.url || null,
    instance: channelData.instance || null,
    api_key: channelData.apiKey || null,
    phone_id: channelData.phoneId || null,
    access_token: channelData.accessToken || null,
    webhook_url: channelData.webhookUrl || null
  };

  const { data, error } = await supabase
    .from('channels')
    .insert([row])
    .select();

  if (error) {
    console.error('[Supabase] addChannel error:', error);
    return null;
  }

  return data?.[0];
}

// Simple string hash for generating consistent avatar colors
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}
