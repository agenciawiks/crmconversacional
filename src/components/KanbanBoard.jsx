import React from 'react';
import { useCrm } from '../context/CrmContext';

export default function KanbanBoard() {
  const { contacts, changeContactStatus, setActiveContactId, setActiveScreen } = useCrm();

  const columns = [
    { id: 'new', title: 'Novos Leads', class: 'new' },
    { id: 'contacted', title: 'Em Contato', class: 'contacted' },
    { id: 'proposal', title: 'Propostas', class: 'proposal' },
    { id: 'won', title: 'Vendas Ganhas', class: 'won' },
    { id: 'lost', title: 'Perdidos', class: 'lost' }
  ];

  // Drag Handlers
  const handleDragStart = (e, contactId) => {
    e.dataTransfer.setData('text/plain', contactId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, statusId) => {
    e.preventDefault();
    const contactIdStr = e.dataTransfer.getData('text/plain');
    if (contactIdStr) {
      const contactId = Number(contactIdStr);
      changeContactStatus(contactId, statusId);
    }
  };

  const handleOpenChat = (contactId) => {
    setActiveContactId(contactId);
    setActiveScreen('chat');
  };

  return (
    <div className="content-wrapper animated-fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Funil de Vendas</h1>
          <p>Gerencie e mova seus leads entre as fases de venda arrastando os cartões.</p>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Total em negociação: <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
            R$ {contacts.filter(c => c.status !== 'lost').reduce((acc, c) => acc + c.value, 0).toLocaleString('pt-BR')}
          </span>
        </div>
      </div>

      {/* KANBAN SCROLLER */}
      <div className="kanban-board-container">
        {columns.map(col => {
          const colContacts = contacts.filter(c => c.status === col.id);
          const colSum = colContacts.reduce((acc, c) => acc + c.value, 0);

          return (
            <div
              key={col.id}
              className={`kanban-column ${col.class}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Header metrics */}
              <div className="kanban-column-header">
                <div className="kanban-column-title">
                  <span>{col.title}</span>
                  <span className="kanban-count-pill">{colContacts.length}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  R$ {colSum.toLocaleString('pt-BR')}
                </div>
              </div>

              {/* Stack items */}
              <div className="kanban-cards-stack">
                {colContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="kanban-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, contact.id)}
                  >
                    <div className="kanban-card-header">
                      <span className="kanban-card-name">{contact.name}</span>
                      <span className={`kanban-card-channel-icon ${contact.channel}`} title={`Canal: ${contact.channel}`}>
                        {contact.channel === 'whatsapp' && 'W'}
                        {contact.channel === 'telegram' && 'T'}
                        {contact.channel === 'webchat' && 'C'}
                      </span>
                    </div>

                    <div className="kanban-card-tags">
                      {contact.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="kanban-card-tag">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="kanban-card-footer">
                      <span className="kanban-card-value">
                        {contact.value > 0 ? `R$ ${contact.value.toLocaleString('pt-BR')}` : 'R$ ---'}
                      </span>
                      <button
                        onClick={() => handleOpenChat(contact.id)}
                        className="kanban-card-action-btn"
                      >
                        Chat ➔
                      </button>
                    </div>
                  </div>
                ))}

                {colContacts.length === 0 && (
                  <div className="kanban-empty-column-placeholder">
                    Nenhum cliente nesta fase. <br /> Arraste um cartão aqui.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
