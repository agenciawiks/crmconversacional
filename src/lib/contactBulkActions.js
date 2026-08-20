export const PIPELINE_STAGES = [
  { id: 'new', label: 'Novos Leads' },
  { id: 'no_answer', label: 'Sem Resposta' },
  { id: 'contacted', label: 'Em Contato' },
  { id: 'proposal', label: 'Tem Interesse' },
  { id: 'won', label: 'Vendas Ganhas' },
  { id: 'lost', label: 'Perdidos' }
];

export const normalizeContactIds = (contactIds) => [
  ...new Set((contactIds || []).filter(Boolean).map(String))
];

export const applyBulkStage = (contact, selectedIds, newStatus) => {
  if (!selectedIds.has(String(contact.id))) return contact;

  const tags = Array.isArray(contact.tags) ? contact.tags : [];
  const shouldPauseAi = ['won', 'lost'].includes(newStatus) && !tags.includes('IA Inativa');

  return {
    ...contact,
    status: newStatus,
    tags: shouldPauseAi ? [...tags, 'IA Inativa'] : tags
  };
};

export const removeContactsFromList = (contacts, contactIds) => {
  const selectedIds = new Set(normalizeContactIds(contactIds));
  return (contacts || []).filter((contact) => !selectedIds.has(String(contact.id)));
};

export const getNextActiveContactId = (contacts, deletedIds, activeContactId) => {
  const remaining = removeContactsFromList(contacts, deletedIds);
  const deleted = new Set(normalizeContactIds(deletedIds));

  if (activeContactId && !deleted.has(String(activeContactId))) {
    return activeContactId;
  }

  return remaining[0]?.id || null;
};
