import { supabase } from '../supabase';

class SupabaseService {
  static async fetchContacts() {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[SupabaseService] fetchContacts error:', error);
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
      avatarColor: `hsl(${Math.abs(this._hashCode(c.phone)) % 360}, 75%, 60%)`,
      notes: c.notes ? [{ id: 1, text: c.notes, date: c.updated_at }] : [],
      messages: []
    }));
  }

  static async fetchMessages(channelId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('timestamp', { ascending: true })
      .limit(200);

    if (error) {
      console.error('[SupabaseService] fetchMessages error:', error);
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

  static async fetchChannels() {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SupabaseService] fetchChannels error:', error);
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

  static async addChannel(channelData) {
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
      console.error('[SupabaseService] addChannel error:', error);
      return null;
    }

    return data?.[0];
  }

  static _hashCode(str) {
    let hash = 0;
    for (let i = 0; i < (str || '').length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash;
  }
}

export default SupabaseService;
