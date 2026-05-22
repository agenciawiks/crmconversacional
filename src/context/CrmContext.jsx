import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../supabase';
import { fetchContacts, useRealtimeMessages } from '../hooks/useSupabase';

const CrmContext = createContext();

const initialFlowNodes = [
  { id: '1', type: 'trigger', label: 'Mensagem Recebida', x: 80, y: 150, data: { condition: 'Qualquer palavra' } },
  { id: '2', type: 'message', label: 'Saudação Inicial', x: 300, y: 100, data: { text: 'Olá! Que bom ter você aqui. Como posso te ajudar hoje?\n1 - Vendas\n2 - Suporte' } },
  { id: '3', type: 'condition', label: 'Opção Menu', x: 520, y: 150, data: { key: '1 = Vendas, 2 = Suporte' } },
  { id: '4', type: 'message', label: 'Encaminhar Vendas', x: 740, y: 60, data: { text: 'Perfeito! Estou transferindo você para um consultor comercial agora mesmo...' } },
  { id: '5', type: 'webhook', label: 'Conexão n8n', x: 960, y: 120, data: { url: 'https://n8n.cloudcorp.com/webhook/lead' } }
];

export const CrmProvider = ({ children }) => {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [contacts, setContacts] = useState([]);
  const [activeContactId, setActiveContactId] = useState(null);
  const [flowNodes, setFlowNodes] = useState(initialFlowNodes);
  const [theme, setTheme] = useState('dark');
  const [isBotEnabled, setIsBotEnabled] = useState(true);
  const [channels, setChannels] = useState([
    { id: '1', name: 'Whats Suporte (Evolution API)', provider: 'evolution', status: 'connected', instance: 'SuporteCorp', url: 'https://api.evolution.cloudcorp.com', apiKey: 'token_evo_suporte_xyz' },
    { id: '2', name: 'Whats Vendas (Meta Cloud API)', provider: 'meta_cloud', status: 'connected', phoneId: '1098457293847', accessToken: 'EAAd8B_meta_official_token' }
  ]);

  const { realtimeMessages } = useRealtimeMessages();

  // Load Initial Data from Supabase
  useEffect(() => {
    async function loadData() {
      const dbContacts = await fetchContacts();
      const { data: dbMessages } = await supabase.from('messages').select('*').order('timestamp', { ascending: true });
      
      const mappedContacts = dbContacts.map(c => {
         const cMsgs = (dbMessages || []).filter(m => m.contact_id === c.id).map(m => ({
            id: m.id,
            sender: m.direction === 'in' ? 'client' : 'agent',
            text: m.content,
            time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(m.timestamp)
         }));
         return { ...c, messages: cMsgs };
      });
      setContacts(mappedContacts);
      if (mappedContacts.length > 0) setActiveContactId(mappedContacts[0].id);
    }
    loadData();
  }, []);

  // Listen to realtime messages
  useEffect(() => {
     if (realtimeMessages.length > 0) {
        const newMsg = realtimeMessages[realtimeMessages.length - 1];
        setContacts(prev => {
           let exists = false;
           const updated = prev.map(c => {
              if (c.id === newMsg.contact_id) {
                 exists = true;
                 const existsMsg = c.messages.find(m => m.id === newMsg.id);
                 if (!existsMsg) {
                    return {
                       ...c,
                       unread: newMsg.sender === 'client',
                       messages: [...c.messages, newMsg]
                    };
                 }
              }
              return c;
           });
           
           if (!exists) {
              // Create new contact entry dynamically if not loaded
              const freshContact = {
                id: newMsg.contact_id,
                name: newMsg.contact_id, // Fallback, would need fetch
                email: '',
                phone: 'Novo Contato',
                status: 'new',
                channel: 'whatsapp',
                value: 0,
                tags: ['Novo Lead'],
                unread: true,
                avatarColor: `hsl(200, 80%, 65%)`,
                notes: [],
                messages: [newMsg]
              };
              return [freshContact, ...updated];
           }
           return updated;
        });
     }
  }, [realtimeMessages]);

  const addChannel = (name, provider, details) => {
    const newChannel = { id: Date.now().toString(), name, provider, status: 'connected', ...details };
    setChannels(prev => [...prev, newChannel]);
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
  };

  const addNoteToContact = (contactId, text) => {
    if (!text.trim()) return;
    const newNote = { id: Date.now(), text, date: new Date().toISOString().replace('T', ' ').substring(0, 16) };
    setContacts(prev => prev.map(c => (c.id === contactId ? { ...c, notes: [newNote, ...c.notes] } : c)));
  };

  const updateContactTags = (contactId, tags) => {
    setContacts(prev => prev.map(c => (c.id === contactId ? { ...c, tags } : c)));
  };

  const updateContactValue = (contactId, value) => {
    setContacts(prev => prev.map(c => (c.id === contactId ? { ...c, value: Number(value) || 0 } : c)));
  };

  const addContact = (name, channel, initialText = 'Olá!') => {
    // This is a UI-only mock for manual adding, you can hook it up to Supabase later
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
    
    // Optimistic UI update
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessage = { id: Date.now().toString(), sender, text, time, timestamp: new Date() };

    setContacts(prev => prev.map(c => {
      if (c.id === contactId) {
        return { ...c, messages: [...c.messages, newMessage], unread: sender === 'client' };
      }
      return c;
    }));

    // Send to webhook/supabase if sender is agent
    if (sender === 'agent') {
      const activeC = contacts.find(c => c.id === contactId);
      if (activeC) {
        // Find channel configured for this
        const N8N_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
        if(N8N_URL) {
            try {
               await fetch(`${N8N_URL}/webhook/outbound`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                     channel_id: activeC.channel_id,
                     contact_id: activeC.id,
                     phone: activeC.phone,
                     content: text
                  })
               });
            } catch(e) {
               console.error("Failed sending outbound msg", e);
            }
        }
      }
    }
  };

  const activeContact = contacts.find(c => c.id === activeContactId) || contacts[0];

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
      activeScreen, setActiveScreen, contacts, activeContactId, setActiveContactId, activeContact,
      flowNodes, theme, toggleTheme, changeContactStatus, addNoteToContact, updateContactTags,
      updateContactValue, addContact, sendMessage, isBotEnabled, setIsBotEnabled, updateNodePosition,
      updateNodeData, addFlowNode, deleteFlowNode, channels, addChannel, toggleChannelStatus, deleteChannel
    }}>
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = () => useContext(CrmContext);
