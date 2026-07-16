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
      value: Number(c.value) || 0,
      tags: c.tags || [],
      unread: false,
      avatarColor: `hsl(${Math.abs(this._hashCode(c.phone)) % 360}, 75%, 60%)`,
      avatar_url: c.avatar_url || null,
      avatar_updated_at: c.avatar_updated_at || null,
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
      messages: [],
      created_at: c.created_at
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
      time: new Date(msg.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ''),
      timestamp: new Date(msg.timestamp),
      channel_id: msg.channel_id,
      contact_id: msg.contact_id,
      content_type: msg.content_type,
      status: msg.status
    }));
  }

  static async resetAiMemory(contactId) {
    // Busca o channel_id atual do contato para vincular a mensagem corretamente
    const { data: channelData } = await supabase
      .from('messages')
      .select('channel_id')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(1);
      
    const channelId = channelData?.[0]?.channel_id || null;
    
    // Insere uma mensagem invisível no frontend que o n8n vai ler e usar para resetar o contexto do LLM
    const { data, error } = await supabase.from('messages').insert([{
      contact_id: contactId,
      channel_id: channelId,
      direction: 'out',
      content: '[SYSTEM_RESET] ATENÇÃO: O histórico anterior foi concluído e irrelevante. Inicie um NOVO ATENDIMENTO do zero a partir de agora, esquecendo completamente o contexto e dados anteriores.',
      content_type: 'text',
      timestamp: new Date().toISOString()
    }]).select().single();
    
    if (error) {
      console.error('[SupabaseService] resetAiMemory error:', error);
      throw error;
    }
    return data;
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

  static async updateContactName(contactId, name) {
    const { data, error } = await supabase
      .from('contacts')
      .update({ name })
      .eq('id', contactId)
      .select();

    if (error) {
      console.error('[SupabaseService] updateContactName error:', error);
      return false;
    }
    return true;
  }

  static async updateContactStatus(contactId, status) {
    const { data, error } = await supabase
      .from('contacts')
      .update({ pipeline_stage: status })
      .eq('id', contactId)
      .select();

    if (error) {
      console.error('[SupabaseService] updateContactStatus error:', error);
      return false;
    }
    return true;
  }

  static async createContact(contactData) {
    const row = {
      phone: contactData.phone.replace(/\D/g, ''),
      name: contactData.name,
      pipeline_stage: contactData.status || 'new',
      email: contactData.email || null,
      tags: contactData.tags || []
    };

    const { data, error } = await supabase
      .from('contacts')
      .insert([row])
      .select();

    if (error) {
      console.error('[SupabaseService] createContact error:', error);
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('contacts')
          .select('*')
          .eq('phone', row.phone)
          .maybeSingle();
        return existing;
      }
      return null;
    }

    return data?.[0];
  }

  static async fetchAiSettings(channelId) {
    if (!channelId) return null;
    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('channel_id', channelId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[SupabaseService] fetchAiSettings db error:', error);
        return null;
      }

      if (data) {
        const row = data;
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
          welcome_message: parsedPrompt.welcome_message ?? '',
          is_enabled: row.is_enabled ?? false
        };
      }
    } catch(e) {
      console.error('[SupabaseService] fetchAiSettings error:', e);
    }
    return null;
  }

  static async saveAiSettings(settings) {
    const systemPromptJson = JSON.stringify({
      agent_name: settings.agent_name,
      model: settings.model,
      api_key: settings.api_key,
      system_prompt: settings.system_prompt,
      negative_prompt: settings.negative_prompt,
      welcome_message: settings.welcome_message
    });

    const body = {
      tenant_id: settings.tenant_id || "11111111-1111-1111-1111-111111111111",
      channel_id: settings.channel_id,
      system_prompt: systemPromptJson,
      temperature: Number(settings.temperature) ?? 0.7,
      pause_trigger_phrases: settings.pause_trigger_phrases || [],
      is_enabled: settings.is_enabled
    };

    try {
      let query;
      if (settings.id) {
        query = supabase
          .from('ai_settings')
          .update(body)
          .eq('id', settings.id);
      } else {
        query = supabase
          .from('ai_settings')
          .insert([body]);
      }

      const { data, error } = await query.select();

      if (error) {
        console.error('[SupabaseService] saveAiSettings db error:', error);
        return false;
      }

      return data?.[0] || true;
    } catch(e) {
      console.error('[SupabaseService] saveAiSettings error:', e);
    }
    return false;
  }

  static async updateChannelStatus(channelId, status) {
    const { data, error } = await supabase
      .from('channels')
      .update({ status })
      .eq('id', channelId)
      .select();

    if (error) {
      console.error('[SupabaseService] updateChannelStatus error:', error);
      return false;
    }
    return true;
  }

  static async deleteChannel(channelId) {
    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', channelId);

    if (error) {
      console.error('[SupabaseService] deleteChannel error:', error);
      return false;
    }
    return true;
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

  static async updateContactValue(contactId, value) {
    const { data, error } = await supabase
      .from('contacts')
      .update({ value: Number(value) || 0 })
      .eq('id', contactId)
      .select();

    if (error) {
      console.error('[SupabaseService] updateContactValue error:', error);
      return false;
    }
    return true;
  }

  static async logActivity(contactId, type, title, meta) {
    const { data, error } = await supabase
      .from('activity_log')
      .insert([{ contact_id: contactId, type, title, meta }])
      .select();

    if (error) {
      console.error('[SupabaseService] logActivity error:', error);
      return null;
    }
    return data?.[0];
  }
}

export default SupabaseService;
