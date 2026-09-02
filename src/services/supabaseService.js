import { supabase } from '../supabase';
import { buildResponseMetric } from '../lib/responseTimeMetrics';

class SupabaseService {
  static async fetchContacts(tenantId) {
    let query = supabase
      .from('contacts')
      .select('*, messages(*)');

    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data, error } = await query
      .order('updated_at', { ascending: false })
      .order('created_at', { referencedTable: 'messages', ascending: false })
      .limit(3, { referencedTable: 'messages' });

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
      is_group: Boolean(c.is_group),
      whatsapp_jid: c.whatsapp_jid || null,
      tenant_id: c.tenant_id || null,
      notes: (function() {
        if (!c.notes) return [];
        try {
          const parsed = JSON.parse(c.notes);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // not json, fallback
        }
        return [{ id: 1, text: c.notes, date: c.updated_at }];
      })(),
      initial_messages: (c.messages || []).filter((message) => !String(message.content || '').startsWith('[SYSTEM_RESET]')),
      messages: [],
      created_at: c.created_at
    }));
  }

  static async fetchMessages(channelId, tenantId) {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('channel_id', channelId);

    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data, error } = await query
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
      whatsapp_msg_id: msg.whatsapp_msg_id,
      status: msg.status,
      delivered_at: msg.delivered_at,
      read_at: msg.read_at,
      played_at: msg.played_at,
      is_group: Boolean(msg.is_group),
      chat_jid: msg.chat_jid || null,
      sender_jid: msg.sender_jid || null,
      sender_name: msg.sender_name || null,
      tenant_id: msg.tenant_id || null
    }));
  }

  static async fetchContactResponseMetrics(contactId, tenantId) {
    if (!contactId || !tenantId) {
      return {
        first: { status: 'empty' },
        latest: { status: 'empty' }
      };
    }

    const fetchInboundAnchor = async (ascending) => {
      const { data, error } = await supabase
        .from('messages')
        .select('id,timestamp')
        .eq('contact_id', contactId)
        .eq('tenant_id', tenantId)
        .eq('direction', 'in')
        .order('timestamp', { ascending })
        .limit(1);

      if (error) throw error;
      return data?.[0] || null;
    };

    const fetchFirstReplyAfter = async (inboundMessage) => {
      if (!inboundMessage?.timestamp) return { status: 'empty' };

      const { data, error } = await supabase
        .from('messages')
        .select('id,timestamp,content')
        .eq('contact_id', contactId)
        .eq('tenant_id', tenantId)
        .eq('direction', 'out')
        .gt('timestamp', inboundMessage.timestamp)
        .order('timestamp', { ascending: true })
        .limit(100);

      if (error) throw error;
      const reply = (data || []).find((message) => !String(message.content || '').startsWith('[SYSTEM_RESET]'));
      return buildResponseMetric(inboundMessage.timestamp, reply?.timestamp || null);
    };

    const [firstInbound, latestInbound] = await Promise.all([
      fetchInboundAnchor(true),
      fetchInboundAnchor(false)
    ]);

    if (!firstInbound) {
      return {
        first: { status: 'empty' },
        latest: { status: 'empty' }
      };
    }

    const firstReplyPromise = fetchFirstReplyAfter(firstInbound);
    const latestReplyPromise = latestInbound?.id === firstInbound.id
      ? firstReplyPromise
      : fetchFirstReplyAfter(latestInbound);
    const [first, latest] = await Promise.all([firstReplyPromise, latestReplyPromise]);

    return { first, latest };
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

  static async fetchChannelsSafe() {
    const { data, error } = await supabase
      .from('channels_safe')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SupabaseService] fetchChannelsSafe error:', error);
      return [];
    }

    return (data || []).map(ch => ({
      id: ch.id,
      name: ch.name,
      provider: ch.provider === 'meta' ? 'meta_cloud' : (ch.provider === 'instagram' ? 'instagram' : 'evolution'),
      status: ch.status
      // View removes sensitive columns like api_key, access_token, webhook_url
    }));
  }

  static async fetchChannels(tenantId) {
    let query = supabase
      .from('channels')
      .select('id,name,provider,status,url,instance,phone_id,webhook_url,tenant_id,created_at,updated_at');

    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data, error } = await query
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
      phoneId: ch.phone_id,
      webhookUrl: ch.webhook_url,
      tenantId: ch.tenant_id
    }));
  }

  static async addChannel(channelData, tenantId) {
    const row = {
      name: channelData.name,
      provider: channelData.provider === 'meta_cloud' ? 'meta' : (channelData.provider === 'instagram' ? 'instagram' : 'evolution'),
      status: 'connected',
      url: channelData.url || null,
      instance: channelData.instance || null,
      api_key: channelData.apiKey || null,
      phone_id: channelData.phoneId || null,
      access_token: channelData.accessToken || null,
      webhook_url: channelData.webhookUrl || null,
      tenant_id: tenantId || channelData.tenant_id || null
    };

    const { data, error } = await supabase
      .from('channels')
      .insert([row])
      .select('id,name,provider,status,url,instance,phone_id,webhook_url,tenant_id,created_at,updated_at');

    if (error) {
      console.error('[SupabaseService] addChannel error:', error);
      return null;
    }

    return data?.[0];
  }

  static async updateContactNotes(contactId, notesText) {
    const { error } = await supabase
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
    const { error } = await supabase
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
    const { error } = await supabase
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
    const { error } = await supabase
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

  static async updateContactsStatus(contactIds, status, tenantId) {
    const ids = [...new Set((contactIds || []).filter(Boolean).map(String))];
    if (ids.length === 0) return [];
    if (!tenantId) throw new Error('Cliente não identificado para movimentação em massa.');

    const { data, error } = await supabase
      .from('contacts')
      .update({ pipeline_stage: status })
      .in('id', ids)
      .eq('tenant_id', tenantId)
      .select('id');

    if (error) {
      console.error('[SupabaseService] updateContactsStatus error:', error);
      throw error;
    }

    const updatedIds = (data || []).map((row) => String(row.id));
    if (updatedIds.length !== ids.length) {
      throw new Error('Nem todos os contatos selecionados puderam ser atualizados.');
    }
    return updatedIds;
  }

  static async updateContactsTags(contactUpdates, tenantId) {
    if (!tenantId) throw new Error('Cliente não identificado para atualização das etiquetas.');

    const results = await Promise.all((contactUpdates || []).map(async ({ id, tags }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update({ tags })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select('id');

      if (error) throw error;
      return data?.[0]?.id || null;
    }));

    if (results.some((id) => !id)) {
      throw new Error('Nem todas as etiquetas dos contatos puderam ser atualizadas.');
    }
    return results;
  }

  static async deleteContacts(contactIds, tenantId) {
    const ids = [...new Set((contactIds || []).filter(Boolean).map(String))];
    if (ids.length === 0) return [];
    if (!tenantId) throw new Error('Cliente não identificado para exclusão em massa.');

    const { data, error } = await supabase
      .from('contacts')
      .delete()
      .in('id', ids)
      .eq('tenant_id', tenantId)
      .select('id');

    if (error) {
      console.error('[SupabaseService] deleteContacts error:', error);
      throw error;
    }

    const deletedIds = (data || []).map((row) => String(row.id));
    if (deletedIds.length !== ids.length) {
      throw new Error('Nem todas as conversas selecionadas puderam ser excluídas.');
    }
    return deletedIds;
  }

  static async createContact(contactData, tenantId) {
    const row = {
      phone: contactData.phone.replace(/\D/g, ''),
      name: contactData.name,
      pipeline_stage: contactData.status || 'new',
      email: contactData.email || null,
      tags: contactData.tags || [],
      tenant_id: tenantId || contactData.tenant_id || null
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
          .eq('tenant_id', row.tenant_id)
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
        .rpc('get_ai_settings_safe', { p_channel_id: channelId });

      if (error) {
        console.error('[SupabaseService] fetchAiSettings db error:', error);
        return null;
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        return {
          id: row.id,
          tenant_id: row.tenant_id,
          channel_id: row.channel_id,
          temperature: row.temperature ?? 0.7,
          pause_trigger_phrases: row.pause_trigger_phrases ?? [],
          agent_name: row.agent_name ?? 'Agente de IA',
          model: row.model ?? 'gpt-4o-mini',
          api_key: '',
          api_key_configured: row.api_key_configured === true,
          system_prompt: row.system_prompt ?? '',
          negative_prompt: row.negative_prompt ?? '',
          welcome_message: row.welcome_message ?? '',
          is_enabled: row.is_enabled ?? false
        };
      }
    } catch(e) {
      console.error('[SupabaseService] fetchAiSettings error:', e);
    }
    return null;
  }

  static async fetchAiSettingsSafe(channelId) {
    if (!channelId) return null;
    try {
      const { data, error } = await supabase
        .from('ai_settings_safe')
        .select('*')
        .eq('channel_id', channelId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[SupabaseService] fetchAiSettingsSafe db error:', error);
        return null;
      }
      return data;
    } catch (e) {
      console.error('[SupabaseService] fetchAiSettingsSafe error:', e);
    }
    return null;
  }

  static async saveAiSettings(settings) {
    try {
      const { data, error } = await supabase.rpc('upsert_ai_settings_secure', {
        p_channel_id: settings.channel_id,
        p_is_enabled: Boolean(settings.is_enabled),
        p_agent_name: settings.agent_name,
        p_model: settings.model,
        p_api_key: settings.api_key?.trim() || null,
        p_temperature: Number(settings.temperature ?? 0.7),
        p_system_prompt: settings.system_prompt,
        p_negative_prompt: settings.negative_prompt,
        p_welcome_message: settings.welcome_message,
        p_pause_trigger_phrases: settings.pause_trigger_phrases || []
      });

      if (error) {
        console.error('[SupabaseService] saveAiSettings db error:', error);
        return false;
      }

      return Array.isArray(data) ? data[0] : data;
    } catch(e) {
      console.error('[SupabaseService] saveAiSettings error:', e);
    }
    return false;
  }

  static async updateChannelStatus(channelId, status) {
    const { error } = await supabase
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
    const { error } = await supabase
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
