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
      notes: (function() {
        if (!c.notes) return [];
        try {
          const parsed = JSON.parse(c.notes);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          // not json, fallback
        }
        return [{ id: 1, text: c.notes, date: c.updated_at }];
      })(),
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
      provider: ch.provider === 'meta' ? 'meta_cloud' : (ch.provider === 'instagram' ? 'instagram' : 'evolution'),
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
      provider: channelData.provider === 'meta_cloud' ? 'meta' : (channelData.provider === 'instagram' ? 'instagram' : 'evolution'),
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

  static async updateContactNotes(contactId, notesText) {
    const { data, error } = await supabase
      .from('contacts')
      .update({ notes: notesText })
      .eq('id', contactId)
      .select();

    if (error) {
      console.error('[SupabaseService] updateContactNotes error:', error);
      return false;
    }
    return true;
  }

  static async updateContactTags(contactId, tags) {
    const { data, error } = await supabase
      .from('contacts')
      .update({ tags: tags })
      .eq('id', contactId)
      .select();

    if (error) {
      console.error('[SupabaseService] updateContactTags error:', error);
      return false;
    }
    return true;
  }

  static async fetchAiSettings(channelId) {
    if (!channelId) return null;
    const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8";
    try {
      const response = await fetch(`https://ibyterftfrqgkhktkaeg.supabase.co/rest/v1/ai_settings?channel_id=eq.${channelId}&limit=1`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        }
      });
      if (response.ok) {
        const list = await response.json();
        if (list && list.length > 0) {
          const row = list[0];
          let parsedPrompt = {};
          try {
            parsedPrompt = JSON.parse(row.system_prompt || '{}');
          } catch(e) {
            parsedPrompt = { system_prompt: row.system_prompt };
          }
          return {
            id: row.id,
            tenant_id: row.tenant_id,
            channel_id: row.channel_id,
            temperature: row.temperature ?? 0.7,
            pause_trigger_phrases: row.pause_trigger_phrases ?? [],
            agent_name: parsedPrompt.agent_name ?? 'Agente de IA',
            model: parsedPrompt.model ?? 'gpt-4o-mini',
            api_key: parsedPrompt.api_key ?? '',
            system_prompt: parsedPrompt.system_prompt ?? '',
            negative_prompt: parsedPrompt.negative_prompt ?? '',
            is_enabled: parsedPrompt.is_enabled ?? false
          };
        }
      }
    } catch(e) {
      console.error('[SupabaseService] fetchAiSettings error:', e);
    }
    return null;
  }

  static async saveAiSettings(settings) {
    const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlieXRlcmZ0ZnJxZ2toa3RrYWVnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ0OTgwMywiZXhwIjoyMDk0MDI1ODAzfQ.9ObjlZum0x9XQuZYVxBZJGzLKA_jbaz1wqxC4lMj_M8";
    
    const systemPromptJson = JSON.stringify({
      agent_name: settings.agent_name,
      model: settings.model,
      api_key: settings.api_key,
      system_prompt: settings.system_prompt,
      negative_prompt: settings.negative_prompt,
      is_enabled: settings.is_enabled
    });

    const body = {
      tenant_id: settings.tenant_id || "11111111-1111-1111-1111-111111111111",
      channel_id: settings.channel_id,
      system_prompt: systemPromptJson,
      temperature: Number(settings.temperature) ?? 0.7,
      pause_trigger_phrases: settings.pause_trigger_phrases || []
    };

    if (settings.id) {
      body.id = settings.id;
    }

    try {
      const url = settings.id 
        ? `https://ibyterftfrqgkhktkaeg.supabase.co/rest/v1/ai_settings?id=eq.${settings.id}`
        : `https://ibyterftfrqgkhktkaeg.supabase.co/rest/v1/ai_settings`;

      const response = await fetch(url, {
        method: settings.id ? 'PATCH' : 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        return data?.[0] || true;
      } else {
        console.error('[SupabaseService] saveAiSettings response error:', await response.text());
      }
    } catch(e) {
      console.error('[SupabaseService] saveAiSettings error:', e);
    }
    return false;
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
