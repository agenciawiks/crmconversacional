import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { useRealtimeMessages } from '../hooks/useSupabase';
import SupabaseService from '../services/supabaseService';
import N8nService from '../services/n8nService';

const CrmContext = createContext();

const META_CHANNEL_ID = '4886443e-4996-4d2a-83e1-d96f503e1a28';
const EVO_CHANNEL_ID = '50df1e49-8f4c-4f90-b3c5-e9b95e37d8ed';

const initialFlowNodes = [
  { id: '1', type: 'trigger', label: 'Mensagem Recebida', x: 80, y: 150, data: { condition: 'Qualquer palavra' } },
  { id: '2', type: 'message', label: 'Saudação Inicial', x: 300, y: 100, data: { text: 'Olá! Que bom ter você aqui. Como posso te ajudar hoje?\n1 - Vendas\n2 - Suporte' } },
  { id: '3', type: 'condition', label: 'Opção Menu', x: 520, y: 150, data: { key: '1 = Vendas, 2 = Suporte' } },
  { id: '4', type: 'message', label: 'Encaminhar Vendas', x: 740, y: 60, data: { text: 'Perfeito! Estou transferindo você para um consultor comercial agora mesmo...' } },
  { id: '5', type: 'webhook', label: 'Conexão n8n', x: 960, y: 120, data: { url: 'https://n8n.cloudcorp.com/webhook/lead' } }
];

export const CrmProvider = ({ children }) => {
  const [activeScreen, setActiveScreen] = useState(() => {
    return localStorage.getItem('crm_active_screen') || 'dashboard';
  });
  const [contacts, setContacts] = useState([]);
  const [activeContactId, setActiveContactId] = useState(() => {
    return localStorage.getItem('crm_active_contact_id') || null;
  });
  const [flowNodes, setFlowNodes] = useState(initialFlowNodes);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('crm_theme') || 'dark';
  });
  const [isBotEnabled, setIsBotEnabled] = useState(true);
  const [channels, setChannels] = useState([
    { id: '1', name: 'Whats Suporte (Evolution API)', provider: 'evolution', status: 'connected', instance: 'SuporteCorp', url: 'https://api.evolution.cloudcorp.com', apiKey: 'token_evo_suporte_xyz' },
    { id: '2', name: 'Whats Vendas (Meta Cloud API)', provider: 'meta_cloud', status: 'connected', phoneId: '1098457293847', accessToken: 'EAAd8B_meta_official_token' }
  ]);

  const lastPollRef = useRef(new Date().toISOString());
  const knownMsgIdsRef = useRef(new Set());

  // Load Initial Data from Supabase
  useEffect(() => {
    async function loadData() {
      try {
        const [dbContacts, { data: dbMessages }, dbChannels] = await Promise.all([
          SupabaseService.fetchContacts(),
          supabase.from('messages').select('*').order('timestamp', { ascending: true }),
          SupabaseService.fetchChannels()
        ]);

        if (dbChannels && dbChannels.length > 0) {
          setChannels(dbChannels);
        }

        const meta = JSON.parse(localStorage.getItem('crm_contacts_metadata') || '{}');
        const idSet = new Set();
        const mappedContacts = dbContacts.map(c => {
          const contactMeta = meta[c.id] || {};
          const cMsgs = (dbMessages || []).filter(m => m.contact_id === c.id).map(m => {
            idSet.add(m.id);
            return {
              id: m.id,
              sender: m.direction === 'in' ? 'client' : 'agent',
              text: m.content,
              time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              timestamp: new Date(m.timestamp),
              channel_id: m.channel_id,
              content_type: m.content_type,
              media_url: m.media_url,
              status: m.direction === 'out' ? 'sent' : undefined
            };
          });

          // Compute provider from last message channel_id
          const lastMsgWithChannel = [...cMsgs].reverse().find(m => m.channel_id);
          let provider = 'unknown';
          if (lastMsgWithChannel) {
            const channel = dbChannels?.find(ch => ch.id === lastMsgWithChannel.channel_id);
            if (channel) {
              provider = channel.provider === 'meta' || channel.provider === 'meta_cloud' ? 'meta_cloud' : 'evolution';
            }
          }

          let defaultStage = 'new';
          const stagesPool = ['new', 'new', 'new', 'contacted', 'contacted', 'proposal', 'won'];
          const charCodeSum = c.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          defaultStage = stagesPool[charCodeSum % stagesPool.length];
          
          let defaultValue = 0;

          const resolvedStatus = contactMeta.status || c.status || defaultStage;
          const resolvedValue = contactMeta.value !== undefined ? contactMeta.value : (c.value || defaultValue);
          const resolvedName = contactMeta.name || c.name;
          const resolvedTags = contactMeta.tags || c.tags || [];

          return { 
            ...c, 
            name: resolvedName,
            tags: resolvedTags,
            status: resolvedStatus,
            value: resolvedValue,
            notes: contactMeta.notes || c.notes || [],
            messages: cMsgs, 
            provider 
          };
        });

        knownMsgIdsRef.current = idSet;
        console.log("CRM loadData mappedContacts status breakdown:", mappedContacts.map(c => ({ id: c.id, status: c.status, value: c.value })));
        setContacts(mappedContacts);
        
        if (mappedContacts.length > 0) {
          const persistedId = localStorage.getItem('crm_active_contact_id');
          if (persistedId && mappedContacts.some(c => c.id === persistedId)) {
            setActiveContactId(persistedId);
          } else {
            setActiveContactId(mappedContacts[0].id);
          }
        }

        // Prevent clock-skew bug by using latest database created_at timestamp
        if (dbMessages && dbMessages.length > 0) {
          lastPollRef.current = dbMessages[dbMessages.length - 1].created_at;
        } else {
          lastPollRef.current = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        }
      } catch (e) {
        console.error("[CrmContext] Error loading initial data:", e);
      }
    }
    loadData();
  }, []);

  // Synchronize state changes to localStorage
  useEffect(() => {
    localStorage.setItem('crm_active_screen', activeScreen);
  }, [activeScreen]);

  useEffect(() => {
    if (activeContactId) {
      localStorage.setItem('crm_active_contact_id', activeContactId);
    } else {
      localStorage.removeItem('crm_active_contact_id');
    }
  }, [activeContactId]);

  useEffect(() => {
    localStorage.setItem('crm_theme', theme);
  }, [theme]);

  // Merge a new message into contacts state (deduplicating by id)
  const mergeMessage = useCallback((newMsg) => {
    if (knownMsgIdsRef.current.has(newMsg.id)) return; // Already known
    knownMsgIdsRef.current.add(newMsg.id);

    // Resolve provider for the incoming message
    const channel = channels.find(ch => ch.id === newMsg.channel_id);
    const resolvedProvider = channel 
      ? (channel.provider === 'meta' || channel.provider === 'meta_cloud' ? 'meta_cloud' : 'evolution')
      : 'unknown';

    setContacts(prev => {
      let exists = false;
      const updated = prev.map(c => {
        if (c.id === newMsg.contact_id) {
          exists = true;
          
          // Look for matching optimistic temp message to replace
          const optIdx = c.messages.findIndex(m => 
            typeof m.id === 'string' && m.id.startsWith('temp-') &&
            m.sender === newMsg.sender &&
            m.text === newMsg.text
          );

          if (optIdx !== -1) {
            const newMsgs = [...c.messages];
            newMsgs[optIdx] = newMsg;
            return {
              ...c,
              messages: newMsgs,
              provider: resolvedProvider !== 'unknown' ? resolvedProvider : c.provider
            };
          }

          const existsMsg = c.messages.find(m => m.id === newMsg.id);
          if (!existsMsg) {
            return {
              ...c,
              unread: newMsg.sender === 'client',
              messages: [...c.messages, newMsg],
              provider: resolvedProvider !== 'unknown' ? resolvedProvider : c.provider
            };
          }
        }
        return c;
      });
      
      if (!exists) {
        // Fetch contact info for brand new contacts
        SupabaseService.fetchContacts().then(dbContacts => {
          const freshC = dbContacts.find(dc => dc.id === newMsg.contact_id);
          if (freshC) {
            const meta = JSON.parse(localStorage.getItem('crm_contacts_metadata') || '{}');
            const contactMeta = meta[freshC.id] || {};
            let defaultStage = 'new';
            const stagesPool = ['new', 'new', 'new', 'contacted', 'contacted', 'proposal', 'won'];
            const charCodeSum = freshC.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            defaultStage = stagesPool[charCodeSum % stagesPool.length];
            
            let defaultValue = 0;

            const mappedFreshC = {
              ...freshC,
              name: contactMeta.name || freshC.name,
              tags: contactMeta.tags || freshC.tags || [],
              status: contactMeta.status || freshC.status || defaultStage,
              value: contactMeta.value !== undefined ? contactMeta.value : (freshC.value || defaultValue),
              notes: contactMeta.notes || freshC.notes || []
            };

            setContacts(prev2 => {
              const existing = prev2.find(c => c.id === mappedFreshC.id);
              if (existing) {
                if (existing.name === 'Novo Contato') {
                   return prev2.map(c => c.id === mappedFreshC.id ? { ...mappedFreshC, messages: c.messages, provider: resolvedProvider, unread: true } : c);
                }
                return prev2;
              }
              return [{ ...mappedFreshC, messages: [newMsg], provider: resolvedProvider, unread: true }, ...prev2];
            });
          }
        });
        // For now, add a placeholder
        const freshContact = {
          id: newMsg.contact_id,
          name: 'Novo Contato',
          email: '',
          phone: 'Carregando...',
          status: 'new',
          channel: 'whatsapp',
          value: 0,
          tags: ['Novo Lead'],
          unread: true,
          avatarColor: `hsl(200, 80%, 65%)`,
          notes: [],
          messages: [newMsg],
          provider: resolvedProvider
        };
        return [freshContact, ...updated];
      }
      return updated;
    });
  }, [channels]);

  // Robust direct realtime subscription (bypasses hook state-array batching)
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('public:messages:direct')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new;
          console.log('[Supabase Realtime] Direct message insert received:', newMsg);
          
          mergeMessage({
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
          });
        }
      )
      .subscribe((status) => {
        console.log('[Supabase Realtime] Direct channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mergeMessage]);

  // Polling fallback: fetch new messages every 5 seconds (uses DB created_at to avoid clock skew)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data: newMsgs } = await supabase
          .from('messages')
          .select('*')
          .gt('created_at', lastPollRef.current)
          .order('timestamp', { ascending: true });

        if (newMsgs && newMsgs.length > 0) {
          // Update lastPollRef to the database-generated timestamp of the last message
          lastPollRef.current = newMsgs[newMsgs.length - 1].created_at;

          for (const m of newMsgs) {
            mergeMessage({
              id: m.id,
              sender: m.direction === 'in' ? 'client' : 'agent',
              text: m.content,
              time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              timestamp: new Date(m.timestamp),
              channel_id: m.channel_id,
              contact_id: m.contact_id,
              content_type: m.content_type,
              media_url: m.media_url,
              status: m.direction === 'out' ? 'sent' : undefined
            });
          }

          // Also check for new contacts we don't have yet
          const contactIds = [...new Set(newMsgs.map(m => m.contact_id))];
          setContacts(prev => {
            const missing = contactIds.filter(cid => !prev.find(c => c.id === cid));
            if (missing.length > 0) {
              SupabaseService.fetchContacts().then(dbContacts => {
                const meta = JSON.parse(localStorage.getItem('crm_contacts_metadata') || '{}');
                setContacts(prev2 => {
                  const toAdd = dbContacts.filter(dc => missing.includes(dc.id) && !prev2.find(c => c.id === dc.id));
                  if (toAdd.length > 0) {
                    const mappedToAdd = toAdd.map(c => {
                      const contactMeta = meta[c.id] || {};
                      let defaultStage = 'new';
                      const stagesPool = ['new', 'new', 'new', 'contacted', 'contacted', 'proposal', 'won'];
                      const charCodeSum = c.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                      defaultStage = stagesPool[charCodeSum % stagesPool.length];
                      
                      let defaultValue = 0;

                      return {
                        ...c,
                        name: contactMeta.name || c.name,
                        tags: contactMeta.tags || c.tags || [],
                        status: contactMeta.status || c.status || defaultStage,
                        value: contactMeta.value !== undefined ? contactMeta.value : (c.value || defaultValue),
                        notes: contactMeta.notes || c.notes || [],
                        unread: true
                      };
                    });
                    return [...mappedToAdd, ...prev2];
                  }
                  return prev2;
                });
              });
            }
            return prev;
          });
        }
      } catch (e) {
        // Silently ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [mergeMessage]);

  const addChannel = async (name, provider, details) => {
    const channelData = {
      name,
      provider,
      url: details.url,
      instance: details.instance,
      apiKey: details.apiKey,
      phoneId: details.phoneId,
      accessToken: details.accessToken
    };

    const newDbChannel = await SupabaseService.addChannel(channelData);
    if (newDbChannel) {
      const mappedChannel = {
        id: newDbChannel.id,
        name: newDbChannel.name,
        provider: newDbChannel.provider === 'meta' ? 'meta_cloud' : 'evolution',
        status: newDbChannel.status,
        url: newDbChannel.url,
        instance: newDbChannel.instance,
        apiKey: newDbChannel.api_key,
        phoneId: newDbChannel.phone_id,
        accessToken: newDbChannel.access_token
      };

      setChannels(prev => [...prev, mappedChannel]);
      return mappedChannel;
    }
  };

  const toggleChannelStatus = (id) => {
    setChannels(prev => prev.map(c => (c.id === id ? { ...c, status: c.status === 'connected' ? 'disconnected' : 'connected' } : c)));
  };

  const deleteChannel = (id) => {
    setChannels(prev => prev.filter(c => c.id !== id));
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  const changeContactStatus = (contactId, newStatus) => {
    setContacts(prev => prev.map(c => (c.id === contactId ? { ...c, status: newStatus } : c)));
    const meta = JSON.parse(localStorage.getItem('crm_contacts_metadata') || '{}');
    if (!meta[contactId]) meta[contactId] = {};
    meta[contactId].status = newStatus;
    localStorage.setItem('crm_contacts_metadata', JSON.stringify(meta));
  };

  const addNoteToContact = async (contactId, text) => {
    if (!text.trim()) return;
    
    setContacts(prev => {
      const contact = prev.find(c => c.id === contactId);
      if (!contact) return prev;
      
      const newNote = { id: Date.now(), text, date: new Date().toISOString().replace('T', ' ').substring(0, 16) };
      const updatedNotes = [...contact.notes, newNote];
      
      const meta = JSON.parse(localStorage.getItem('crm_contacts_metadata') || '{}');
      if (!meta[contactId]) meta[contactId] = {};
      meta[contactId].notes = updatedNotes;
      localStorage.setItem('crm_contacts_metadata', JSON.stringify(meta));
      
      return prev.map(c => (c.id === contactId ? { ...c, notes: updatedNotes } : c));
    });
  };

  const updateContactTags = (contactId, tags) => {
    setContacts(prev => prev.map(c => (c.id === contactId ? { ...c, tags } : c)));
    const meta = JSON.parse(localStorage.getItem('crm_contacts_metadata') || '{}');
    if (!meta[contactId]) meta[contactId] = {};
    meta[contactId].tags = tags;
    localStorage.setItem('crm_contacts_metadata', JSON.stringify(meta));
  };

  const updateContactName = (contactId, name) => {
    if (!name.trim()) return;
    setContacts(prev => prev.map(c => (c.id === contactId ? { ...c, name } : c)));
    const meta = JSON.parse(localStorage.getItem('crm_contacts_metadata') || '{}');
    if (!meta[contactId]) meta[contactId] = {};
    meta[contactId].name = name;
    localStorage.setItem('crm_contacts_metadata', JSON.stringify(meta));
  };

  const updateContactValue = (contactId, value) => {
    const valNum = Number(value) || 0;
    setContacts(prev => prev.map(c => (c.id === contactId ? { ...c, value: valNum } : c)));
    const meta = JSON.parse(localStorage.getItem('crm_contacts_metadata') || '{}');
    if (!meta[contactId]) meta[contactId] = {};
    meta[contactId].value = valNum;
    localStorage.setItem('crm_contacts_metadata', JSON.stringify(meta));
  };

  const addContact = (name, channel, initialText = 'Olá!') => {
    const id = Date.now().toString();
    const hue = Math.floor(Math.random() * 360);
    const newContact = {
      id, name, email: `${name.toLowerCase().replace(/\s+/g, '.')}@email.com`, phone: '(11) 99999-8888',
      status: 'new', channel, value: 0, tags: ['Novo Lead'], unread: true, avatarColor: `hsl(${hue}, 80%, 65%)`,
      notes: [], messages: [{ id: 1, sender: 'client', text: initialText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), timestamp: new Date() }]
    };
    setContacts(prev => [newContact, ...prev]);
    setActiveContactId(id);
    setActiveScreen('chat');
  };

  const sendMessage = async (contactId, text, sender = 'agent') => {
    if (!text.trim()) return;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tempId = 'temp-' + Date.now().toString();
    
    // Optimistic UI update with "sending" status
    const newMessage = { id: tempId, sender, text, time, timestamp: new Date(), status: sender === 'agent' ? 'sending' : undefined };

    setContacts(prev => prev.map(c => {
      if (c.id === contactId) {
        return { ...c, messages: [...c.messages, newMessage], unread: sender === 'client' };
      }
      return c;
    }));

    // Send to n8n Outbound Router if sender is agent
    if (sender === 'agent') {
      const activeC = contacts.find(c => c.id === contactId);
      if (activeC) {
        try {
          // Determine channel from the contact's most recent message, or default to Meta
          const lastMsg = activeC.messages?.findLast(m => m.channel_id);
          const channelId = lastMsg?.channel_id || META_CHANNEL_ID;

          await N8nService.sendOutboundMessage(
            channelId,
            activeC.id,
            activeC.phone,
            text
          );

          // Mark as sent
          setContacts(prev => prev.map(c => {
            if (c.id === contactId) {
              return {
                ...c,
                messages: c.messages.map(m => m.id === tempId ? { ...m, status: 'sent' } : m)
              };
            }
            return c;
          }));
        } catch (e) {
          console.error("Failed sending outbound msg:", e);
          // Mark as failed
          setContacts(prev => prev.map(c => {
            if (c.id === contactId) {
              return {
                ...c,
                messages: c.messages.map(m => m.id === tempId ? { ...m, status: 'failed' } : m)
              };
            }
            return c;
          }));
        }
      }
    }
  };

  // Sort contacts by the most recent message timestamp descending (WhatsApp-like order)
  const sortedContacts = [...contacts].sort((a, b) => {
    const lastMsgA = a.messages && a.messages.length > 0 ? a.messages[a.messages.length - 1] : null;
    const lastMsgB = b.messages && b.messages.length > 0 ? b.messages[b.messages.length - 1] : null;
    
    const timeA = lastMsgA ? new Date(lastMsgA.timestamp).getTime() : 0;
    const timeB = lastMsgB ? new Date(lastMsgB.timestamp).getTime() : 0;
    
    return timeB - timeA;
  });

  const activeContact = sortedContacts.find(c => c.id === activeContactId) || sortedContacts[0];

  const updateNodePosition = (id, dx, dy) => setFlowNodes(prev => prev.map(n => (n.id === id ? { ...n, x: n.x + dx, y: n.y + dy } : n)));
  const updateNodeData = (id, field, value) => setFlowNodes(prev => prev.map(n => (n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n)));
  const addFlowNode = (type) => {
    const id = (flowNodes.length + 1).toString();
    let label = 'Novo Bloco'; let defaultData = {};
    switch (type) {
      case 'message': label = 'Enviar Mensagem'; defaultData = { text: 'Olá!' }; break;
      case 'condition': label = 'Condição'; defaultData = { key: 'Se resposta contém "sim"' }; break;
      case 'webhook': label = 'Webhook'; defaultData = { url: 'https://api.com' }; break;
      default: break;
    }
    setFlowNodes(prev => [...prev, { id, type, label, x: 100, y: 100, data: defaultData }]);
  };
  const deleteFlowNode = (id) => setFlowNodes(prev => prev.filter(n => n.id !== id));

  return (
    <CrmContext.Provider value={{
      activeScreen, setActiveScreen, contacts: sortedContacts, activeContactId, setActiveContactId, activeContact,
      flowNodes, theme, toggleTheme, changeContactStatus, addNoteToContact, updateContactTags, updateContactName,
      updateContactValue, addContact, sendMessage, isBotEnabled, setIsBotEnabled, updateNodePosition,
      updateNodeData, addFlowNode, deleteFlowNode, channels, addChannel, toggleChannelStatus, deleteChannel
    }}>
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = () => useContext(CrmContext);
