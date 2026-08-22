import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import {
  BadgeDollarSign,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  FilterX,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  StickyNote,
  Tag,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { isProfilePhotoStale, normalizeProfilePhotoUrl, queueProfilePhotoSync } from '../services/profilePhotoService';
import TagBadge from './TagBadge';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todas as fases' },
  { value: 'new', label: 'Novo Lead' },
  { value: 'contacted', label: 'Em Contato' },
  { value: 'no_answer', label: 'Sem Resposta' },
  { value: 'proposal', label: 'Tem Interesse' },
  { value: 'won', label: 'Vendido' },
  { value: 'lost', label: 'Perdido' },
];

const CHANNEL_OPTIONS = [
  { value: 'all', label: 'Todos os canais' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Instagram' },
  { value: 'webchat', label: 'TikTok' },
];

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

function getStatusLabel(status) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || 'Sem fase';
}

function getChannelLabel(contact) {
  if (contact.channel === 'whatsapp') {
    if (contact.provider === 'meta_cloud') return 'WhatsApp Oficial';
    if (contact.provider === 'evolution') return 'WhatsApp Evolution';
    return 'WhatsApp';
  }
  if (contact.channel === 'telegram') return 'Instagram';
  if (contact.channel === 'webchat') return 'TikTok';
  return contact.channel ? `${contact.channel.charAt(0).toUpperCase()}${contact.channel.slice(1)}` : 'Outro canal';
}

function ContactsFilterSelect({ id, label, icon: Icon, value, options, isOpen, onToggle, onChange }) {
  const menuRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return undefined;
    const tween = gsap.fromTo(
      menuRef.current,
      { autoAlpha: 0, y: -8, scale: 0.96 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.7)', transformOrigin: 'top center' },
    );
    return () => tween.kill();
  }, [isOpen]);

  return (
    <div className={`contacts-filter-select ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="contacts-filter-trigger contacts-animated-action"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-options`}
      >
        <span className="contacts-filter-trigger-icon"><Icon size={15} aria-hidden="true" /></span>
        <span className="contacts-filter-trigger-copy"><small>{label}</small><strong>{selectedOption.label}</strong></span>
        <ChevronDown className="contacts-filter-chevron" size={15} aria-hidden="true" />
      </button>
      {isOpen && (
        <div ref={menuRef} id={`${id}-options`} className="contacts-filter-drawer" role="listbox" aria-label={label}>
          <div className="contacts-filter-drawer-heading"><span>{label}</span><small>{options.length} opções</small></div>
          <div className="contacts-filter-options">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={option.value === value ? 'is-selected' : ''}
                onClick={() => {
                  onChange(option.value);
                  onToggle(false);
                }}
              >
                <span>{option.label}</span>
                {option.value === value && <Check size={14} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ContactAvatar({ contact, size = 'regular', onNeedPhoto }) {
  const avatarRef = useRef(null);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState(null);
  const initials = (contact.name || 'Sem nome').substring(0, 2).toUpperCase();
  const avatarUrl = normalizeProfilePhotoUrl(contact.avatar_url);
  const storedAvatarInvalid = Boolean(contact.avatar_url && !avatarUrl);
  const imageFailed = Boolean(avatarUrl && failedAvatarUrl === avatarUrl);
  const shouldRequestPhoto = contact.provider === 'evolution'
    && (imageFailed || storedAvatarInvalid || isProfilePhotoStale(contact));

  useEffect(() => {
    const avatar = avatarRef.current;
    if (!avatar || !shouldRequestPhoto || !onNeedPhoto) return undefined;

    const requestPhoto = () => onNeedPhoto(contact, { force: imageFailed || storedAvatarInvalid });
    if (!('IntersectionObserver' in window)) {
      requestPhoto();
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        requestPhoto();
        observer.disconnect();
      },
      { root: avatar.closest('.contacts-page'), rootMargin: '180px 0px', threshold: 0.01 },
    );

    observer.observe(avatar);
    return () => observer.disconnect();
  }, [contact, imageFailed, onNeedPhoto, shouldRequestPhoto, storedAvatarInvalid]);

  return (
    <span
      ref={avatarRef}
      className={`contacts-avatar contacts-avatar--${size}`}
      style={{ '--contact-avatar-color': contact.avatarColor || '#1595c5' }}
      aria-hidden="true"
    >
      {avatarUrl && !imageFailed ? (
        <img
          src={avatarUrl}
          alt=""
          width={size === 'large' ? 58 : 42}
          height={size === 'large' ? 58 : 42}
          loading="lazy"
          onError={() => setFailedAvatarUrl(avatarUrl)}
        />
      ) : initials}
    </span>
  );
}

export default function ContactsList() {
  const rootRef = useRef(null);
  const filterPanelRef = useRef(null);
  const drawerRef = useRef(null);
  const drawerCloseRef = useRef(null);
  const {
    contacts,
    tenantId,
    initialDataLoaded,
    addContact,
    setActiveContactId,
    setActiveScreen,
    changeContactStatus,
    addNoteToContact,
    updateContactTags,
    updateContactName,
    updateContactValue,
    globalTags,
    dateFilter,
    setDateFilter,
    customDateRange,
    setCustomDateRange,
    getFilteredContacts,
  } = useCrm();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [openFilter, setOpenFilter] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadChannel, setNewLeadChannel] = useState('whatsapp');
  const [newLeadMsg, setNewLeadMsg] = useState('Olá, gostaria de saber mais informações.');
  const [selectedContact, setSelectedContact] = useState(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editValue, setEditValue] = useState(0);
  const [editTags, setEditTags] = useState([]);
  const [newTagText, setNewTagText] = useState('');
  const [newNoteText, setNewNoteText] = useState('');

  const dateFilteredContacts = getFilteredContacts();
  const totalLeads = dateFilteredContacts.length;
  const wonContacts = dateFilteredContacts.filter((contact) => contact.status === 'won');
  const totalRevenue = wonContacts.reduce((sum, contact) => sum + (Number(contact.value) || 0), 0);
  const conversionRate = totalLeads > 0 ? Math.round((wonContacts.length / totalLeads) * 100) : 0;

  const tagOptions = useMemo(() => {
    const names = new Set((globalTags || []).map((tag) => tag.name).filter(Boolean));
    (contacts || []).forEach((contact) => {
      (contact.tags || []).forEach((tag) => names.add(tag));
    });
    return [...names].sort((first, second) => first.localeCompare(second, 'pt-BR'));
  }, [contacts, globalTags]);

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('pt-BR');
  const filteredContacts = dateFilteredContacts.filter((contact) => {
    const matchesSearch = !normalizedSearch || [
      contact.name,
      contact.email,
      contact.phone,
      ...(contact.tags || []),
    ].some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(normalizedSearch));
    const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;
    const matchesChannel = channelFilter === 'all' || contact.channel === channelFilter;
    const matchesTag = tagFilter === 'all' || (contact.tags || []).includes(tagFilter);
    return matchesSearch && matchesStatus && matchesChannel && matchesTag;
  });

  const activeFilterCount = [statusFilter, channelFilter, tagFilter].filter((value) => value !== 'all').length
    + (dateFilter !== 'all' ? 1 : 0)
    + (normalizedSearch ? 1 : 0);

  const liveContact = selectedContact ? contacts.find((contact) => contact.id === selectedContact.id) : null;
  const notesList = liveContact?.notes || [];

  const requestProfilePhoto = useCallback((contact, { force = false } = {}) => {
    queueProfilePhotoSync({ contactId: contact.id, tenantId, force }).catch((error) => {
      console.warn(`[Contacts] Foto indisponível para ${contact.id}:`, error.message);
    });
  }, [tenantId]);

  useEffect(() => {
    if (!openFilter) return undefined;

    const handlePointerDown = (event) => {
      if (!filterPanelRef.current?.contains(event.target)) setOpenFilter(null);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpenFilter(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openFilter]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !initialDataLoaded) return undefined;

    const elements = root.querySelectorAll('[data-kpi-target]');
    const tweens = [...elements].map((element) => {
      const target = Number(element.dataset.kpiTarget) || 0;
      const format = element.dataset.kpiFormat || 'number';
      const counter = { value: 0 };
      const renderValue = () => {
        const currentValue = Math.round(counter.value);
        if (format === 'currency') element.textContent = currencyFormatter.format(currentValue);
        else if (format === 'percent') element.textContent = `${currentValue}%`;
        else element.textContent = currentValue.toLocaleString('pt-BR');
      };

      renderValue();
      return gsap.to(counter, {
        value: target,
        duration: 1.15,
        delay: 0.78,
        ease: 'power3.out',
        onUpdate: renderValue,
        onComplete: renderValue,
      });
    });

    return () => tweens.forEach((tween) => tween.kill());
  }, [conversionRate, initialDataLoaded, totalLeads, totalRevenue]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !initialDataLoaded) return undefined;

    const context = gsap.context(() => {
      const rows = gsap.utils.toArray('.contacts-table tbody tr').slice(0, 14);
      const timeline = gsap.timeline({ delay: 0.34, defaults: { ease: 'power3.out' } });

      timeline
        .from('.contacts-page-header', { autoAlpha: 0, y: 18, duration: 0.48 })
        .from('.contacts-metric-card', { autoAlpha: 0, y: 18, scale: 0.97, duration: 0.42, stagger: 0.07 }, '-=0.22')
        .from('.contacts-control-panel', { autoAlpha: 0, y: 14, duration: 0.42 }, '-=0.2')
        .from('.contacts-table-shell', { autoAlpha: 0, y: 18, duration: 0.5 }, '-=0.24')
        .from(rows, { autoAlpha: 0, x: -10, duration: 0.3, stagger: 0.025 }, '-=0.3');

      gsap.to('.contacts-ambient-ring', {
        rotation: 360,
        duration: 24,
        repeat: -1,
        ease: 'none',
        transformOrigin: 'center',
      });

      gsap.to('.contacts-metric-icon', {
        y: -3,
        rotation: (index) => index % 2 === 0 ? -4 : 4,
        duration: 1.8,
        repeat: -1,
        yoyo: true,
        stagger: 0.18,
        ease: 'sine.inOut',
      });
    }, root);

    return () => context.revert();
  }, [initialDataLoaded]);

  useEffect(() => {
    const root = rootRef.current;
    const glow = root?.querySelector('.contacts-cursor-glow');
    if (!root || !glow) return undefined;

    gsap.set(glow, { xPercent: -50, yPercent: -50 });
    const moveX = gsap.quickTo(glow, 'x', { duration: 0.55, ease: 'power3.out' });
    const moveY = gsap.quickTo(glow, 'y', { duration: 0.55, ease: 'power3.out' });
    const handlePointerMove = (event) => {
      moveX(event.clientX);
      moveY(event.clientY);
    };

    root.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => root.removeEventListener('pointermove', handlePointerMove);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !initialDataLoaded) return undefined;

    const cleanups = [];
    const actionButtons = [...root.querySelectorAll('.contacts-animated-action, .table-action-btn')];

    actionButtons.forEach((button) => {
      const handleEnter = () => gsap.to(button, { y: -3, scale: 1.045, duration: 0.24, ease: 'back.out(2)', overwrite: 'auto' });
      const handleLeave = () => gsap.to(button, { y: 0, scale: 1, duration: 0.28, ease: 'power3.out', overwrite: 'auto' });
      const handleDown = () => gsap.to(button, { y: 0, scale: 0.94, duration: 0.12, ease: 'power2.out', overwrite: 'auto' });
      const handleUp = () => gsap.to(button, { y: -2, scale: 1.03, duration: 0.2, ease: 'back.out(2)', overwrite: 'auto' });
      button.addEventListener('pointerenter', handleEnter);
      button.addEventListener('pointerleave', handleLeave);
      button.addEventListener('pointerdown', handleDown);
      button.addEventListener('pointerup', handleUp);
      cleanups.push(() => {
        button.removeEventListener('pointerenter', handleEnter);
        button.removeEventListener('pointerleave', handleLeave);
        button.removeEventListener('pointerdown', handleDown);
        button.removeEventListener('pointerup', handleUp);
      });
    });

    const metricCards = window.matchMedia('(pointer: fine)').matches
      ? [...root.querySelectorAll('.contacts-metric-card')]
      : [];

    metricCards.forEach((card) => {
      let bounds = null;
      const rotateX = gsap.quickTo(card, 'rotationX', { duration: 0.35, ease: 'power3.out' });
      const rotateY = gsap.quickTo(card, 'rotationY', { duration: 0.35, ease: 'power3.out' });
      const moveY = gsap.quickTo(card, 'y', { duration: 0.32, ease: 'power3.out' });
      const handleEnter = () => {
        bounds = card.getBoundingClientRect();
        moveY(-6);
      };
      const handleMove = (event) => {
        if (!bounds) return;
        const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
        const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
        rotateY(horizontal * 7);
        rotateX(vertical * -6);
      };
      const handleLeave = () => {
        bounds = null;
        rotateX(0);
        rotateY(0);
        moveY(0);
      };
      card.addEventListener('pointerenter', handleEnter);
      card.addEventListener('pointermove', handleMove);
      card.addEventListener('pointerleave', handleLeave);
      cleanups.push(() => {
        card.removeEventListener('pointerenter', handleEnter);
        card.removeEventListener('pointermove', handleMove);
        card.removeEventListener('pointerleave', handleLeave);
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      gsap.killTweensOf([...actionButtons, ...metricCards]);
    };
  }, [filteredContacts.length, initialDataLoaded, showAddForm]);

  useLayoutEffect(() => {
    if (!selectedContact || !drawerRef.current) return undefined;

    const context = gsap.context(() => {
      gsap.fromTo('.contacts-drawer-backdrop', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.22, ease: 'power2.out' });
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
      timeline
        .fromTo(drawerRef.current, { xPercent: 100 }, { xPercent: 0, duration: 0.48 })
        .from('.contacts-drawer-reveal', { autoAlpha: 0, x: 15, duration: 0.34, stagger: 0.045 }, '-=0.24');
    }, rootRef);

    drawerCloseRef.current?.focus();
    return () => context.revert();
  }, [selectedContact]);

  useEffect(() => {
    if (!selectedContact) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedContact(null);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedContact]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setChannelFilter('all');
    setTagFilter('all');
    setDateFilter('all');
  };

  const handleCreateLead = (event) => {
    event.preventDefault();
    if (!newLeadName.trim() || !newLeadPhone.trim()) return;

    addContact(newLeadName, newLeadChannel, newLeadPhone, newLeadMsg);
    setNewLeadName('');
    setNewLeadPhone('');
    setNewLeadMsg('Olá, gostaria de saber mais informações.');
    setShowAddForm(false);
  };

  const handleOpenChat = (contactId) => {
    setActiveContactId(contactId);
    setActiveScreen('chat');
  };

  const handleEditContact = (contact) => {
    setSelectedContact(contact);
    setEditName(contact.name || '');
    setEditStatus(contact.status || 'new');
    setEditValue(contact.value || 0);
    setEditTags(contact.tags || []);
    setNewTagText('');
    setNewNoteText('');
  };

  const handleSaveContact = () => {
    if (!selectedContact) return;
    updateContactName(selectedContact.id, editName);
    changeContactStatus(selectedContact.id, editStatus);
    updateContactValue(selectedContact.id, editValue);
    updateContactTags(selectedContact.id, editTags);
    setSelectedContact(null);
  };

  const handleAddTag = (event) => {
    event.preventDefault();
    const cleanedTag = newTagText.trim();
    if (!cleanedTag || editTags.includes(cleanedTag)) return;
    setEditTags((currentTags) => [...currentTags, cleanedTag]);
    setNewTagText('');
  };

  const handleAddSuggestedTag = (tagName) => {
    if (!tagName || editTags.includes(tagName)) return;
    setEditTags((currentTags) => [...currentTags, tagName]);
  };

  const handleRemoveTag = (tagToRemove) => {
    setEditTags((currentTags) => currentTags.filter((tag) => tag !== tagToRemove));
  };

  const handleAddNote = (event) => {
    event.preventDefault();
    if (!newNoteText.trim() || !selectedContact) return;
    addNoteToContact(selectedContact.id, newNoteText);
    setNewNoteText('');
  };

  return (
    <div ref={rootRef} className="content-wrapper contacts-page">
      <span className="contacts-cursor-glow" aria-hidden="true" />
      <span className="contacts-ambient-ring" aria-hidden="true" />

      <header className="contacts-page-header">
        <div className="contacts-title-block">
          <span className="contacts-eyebrow"><Sparkles size={13} aria-hidden="true" /> Base inteligente</span>
          <h1>Leads &amp; Contatos</h1>
          <p>Encontre, organize e acompanhe cada oportunidade em uma única visão.</p>
        </div>
        <button
          type="button"
          className={`contacts-primary-button contacts-animated-action ${showAddForm ? 'is-open' : ''}`}
          onClick={() => setShowAddForm((visible) => !visible)}
          aria-expanded={showAddForm}
          aria-controls="new-lead-form"
        >
          {showAddForm ? <X size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
          {showAddForm ? 'Fechar cadastro' : 'Cadastrar novo lead'}
        </button>
      </header>

      <section className="contacts-metrics" aria-label="Indicadores de leads">
        <article className="contacts-metric-card contacts-metric-card--blue">
          <span className="contacts-metric-icon"><Users size={19} aria-hidden="true" /></span>
          <small>Leads no período</small>
          <strong data-kpi-target={totalLeads} data-kpi-format="number">{totalLeads}</strong>
          <p>{filteredContacts.length} visíveis com os filtros atuais</p>
        </article>
        <article className="contacts-metric-card contacts-metric-card--mint">
          <span className="contacts-metric-icon"><TrendingUp size={19} aria-hidden="true" /></span>
          <small>Conversão ganha</small>
          <strong data-kpi-target={conversionRate} data-kpi-format="percent">{conversionRate}%</strong>
          <p>{wonContacts.length} {wonContacts.length === 1 ? 'venda concluída' : 'vendas concluídas'}</p>
        </article>
        <article className="contacts-metric-card contacts-metric-card--lime">
          <span className="contacts-metric-icon"><BadgeDollarSign size={19} aria-hidden="true" /></span>
          <small>Receita confirmada</small>
          <strong data-kpi-target={totalRevenue} data-kpi-format="currency">{currencyFormatter.format(totalRevenue)}</strong>
          <p>Valor acumulado em negócios ganhos</p>
        </article>
      </section>

      {showAddForm && (
        <form id="new-lead-form" className="contacts-create-card" onSubmit={handleCreateLead}>
          <div className="contacts-create-heading">
            <span><CircleUserRound size={18} aria-hidden="true" /></span>
            <div><strong>Novo lead</strong><small>Adicione um contato manualmente à base.</small></div>
          </div>
          <div className="contacts-create-grid">
            <div className="contacts-form-field">
              <label htmlFor="new-lead-name">Nome do lead</label>
              <input id="new-lead-name" name="lead-name" type="text" autoComplete="off" required placeholder="Ex.: João Souza…" value={newLeadName} onChange={(event) => setNewLeadName(event.target.value)} />
            </div>
            <div className="contacts-form-field">
              <label htmlFor="new-lead-channel">Canal de entrada</label>
              <select id="new-lead-channel" name="lead-channel" autoComplete="off" value={newLeadChannel} onChange={(event) => setNewLeadChannel(event.target.value)}>
                <option value="whatsapp">WhatsApp</option><option value="telegram">Instagram</option><option value="webchat">TikTok</option>
              </select>
            </div>
            <div className="contacts-form-field">
              <label htmlFor="new-lead-phone">Telefone ou celular</label>
              <input id="new-lead-phone" name="lead-phone" type="tel" inputMode="tel" autoComplete="off" required placeholder="Ex.: 5511999998888…" value={newLeadPhone} onChange={(event) => setNewLeadPhone(event.target.value)} />
            </div>
            <div className="contacts-form-field contacts-form-field--message">
              <label htmlFor="new-lead-message">Mensagem inicial</label>
              <input id="new-lead-message" name="lead-message" type="text" autoComplete="off" placeholder="Ex.: Olá, gostaria de saber mais…" value={newLeadMsg} onChange={(event) => setNewLeadMsg(event.target.value)} />
            </div>
            <button type="submit" className="contacts-create-submit contacts-animated-action"><Check size={17} aria-hidden="true" /> Criar lead</button>
          </div>
        </form>
      )}

      <section ref={filterPanelRef} className="contacts-control-panel" aria-label="Pesquisa e filtros">
        <div className="contacts-search-shell">
          <Search size={18} aria-hidden="true" />
          <label className="sr-only" htmlFor="contacts-search">Pesquisar contatos</label>
          <input id="contacts-search" name="contacts-search" type="search" autoComplete="off" spellCheck={false} placeholder="Busque por nome, e-mail, telefone ou etiqueta…" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
          {searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="Limpar pesquisa"><X size={15} aria-hidden="true" /></button>}
        </div>
        <div className="contacts-filter-grid">
          <ContactsFilterSelect
            id="contacts-period"
            label="Período"
            icon={CalendarDays}
            value={dateFilter}
            options={[{ value: 'all', label: 'Todo o período' }, { value: 'today', label: 'Hoje' }, { value: 'yesterday', label: 'Ontem' }, { value: '7days', label: 'Últimos 7 dias' }, { value: 'custom', label: 'Personalizado' }]}
            isOpen={openFilter === 'period'}
            onToggle={(close) => setOpenFilter((current) => close === false ? null : current === 'period' ? null : 'period')}
            onChange={setDateFilter}
          />
          <ContactsFilterSelect
            id="contacts-status"
            label="Fase do funil"
            icon={SlidersHorizontal}
            value={statusFilter}
            options={STATUS_OPTIONS}
            isOpen={openFilter === 'status'}
            onToggle={(close) => setOpenFilter((current) => close === false ? null : current === 'status' ? null : 'status')}
            onChange={setStatusFilter}
          />
          <ContactsFilterSelect
            id="contacts-channel"
            label="Canal"
            icon={MessageSquare}
            value={channelFilter}
            options={CHANNEL_OPTIONS}
            isOpen={openFilter === 'channel'}
            onToggle={(close) => setOpenFilter((current) => close === false ? null : current === 'channel' ? null : 'channel')}
            onChange={setChannelFilter}
          />
          <ContactsFilterSelect
            id="contacts-tag"
            label="Etiqueta"
            icon={Tag}
            value={tagFilter}
            options={[{ value: 'all', label: 'Todas as etiquetas' }, ...tagOptions.map((tagName) => ({ value: tagName, label: tagName }))]}
            isOpen={openFilter === 'tag'}
            onToggle={(close) => setOpenFilter((current) => close === false ? null : current === 'tag' ? null : 'tag')}
            onChange={setTagFilter}
          />
        </div>
        {dateFilter === 'custom' && (
          <div className="contacts-custom-dates">
            <label htmlFor="contacts-date-start">De</label><input id="contacts-date-start" name="contacts-date-start" type="date" autoComplete="off" value={customDateRange.start} onChange={(event) => setCustomDateRange({ ...customDateRange, start: event.target.value })} />
            <span>até</span>
            <label htmlFor="contacts-date-end">Até</label><input id="contacts-date-end" name="contacts-date-end" type="date" autoComplete="off" value={customDateRange.end} onChange={(event) => setCustomDateRange({ ...customDateRange, end: event.target.value })} />
          </div>
        )}
        <div className="contacts-results-line" aria-live="polite">
          <span><strong>{filteredContacts.length}</strong> {filteredContacts.length === 1 ? 'contato encontrado' : 'contatos encontrados'}</span>
          {activeFilterCount > 0 && <button type="button" onClick={clearFilters}><FilterX size={14} aria-hidden="true" /> Limpar {activeFilterCount} {activeFilterCount === 1 ? 'filtro' : 'filtros'}</button>}
        </div>
      </section>

      <section className="contacts-table-shell" aria-labelledby="contacts-list-title">
        <div className="contacts-table-heading">
          <div><span className="contacts-eyebrow">Base ativa</span><h2 id="contacts-list-title">Lista de contatos</h2></div>
          <span className="contacts-table-count">{filteredContacts.length} de {totalLeads}</span>
        </div>
        <div className="contacts-table-wrapper">
          <table className="contacts-table">
            <thead><tr><th>Cliente / Lead</th><th>Canal</th><th>Fase do funil</th><th>Valor comercial</th><th>Etiquetas</th><th>Ações</th></tr></thead>
            <tbody>
              {filteredContacts.map((contact) => (
                <tr key={contact.id} tabIndex="0" onClick={() => handleEditContact(contact)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleEditContact(contact); } }} aria-label={`Editar ${contact.name || 'contato sem nome'}`}>
                  <td data-label="Cliente / Lead"><div className="contact-profile-cell"><ContactAvatar contact={contact} onNeedPhoto={requestProfilePhoto} /><div className="contact-profile-copy"><span className="contact-name-bold">{contact.name || 'Sem nome'}{contact.tags?.includes('IA Inativa') && <User size={13} aria-label="Aguardando atendente humano" />}</span><span className="contact-email-sub">{contact.email || contact.phone || 'Sem e-mail cadastrado'}</span></div></div></td>
                  <td data-label="Canal"><span className="contact-channel-icon-label"><span className={`contacts-channel-mark ${contact.channel}`}>{contact.channel === 'whatsapp' ? 'W' : contact.channel === 'telegram' ? 'I' : 'T'}</span><span>{getChannelLabel(contact)}</span></span></td>
                  <td data-label="Fase do funil"><span className={`contacts-status-tag status-${contact.status}`}>{getStatusLabel(contact.status)}</span></td>
                  <td data-label="Valor comercial"><span className="contact-value-display">{contact.value > 0 ? currencyFormatter.format(contact.value) : 'R$ 0'}</span></td>
                  <td data-label="Etiquetas"><div className="contact-tags-list">{(contact.tags || []).slice(0, 3).map((tagName) => { const tagDefinition = globalTags?.find((tag) => tag.name.toLocaleLowerCase('pt-BR') === tagName.toLocaleLowerCase('pt-BR')); return <TagBadge key={tagName} name={tagName} color={tagDefinition?.color || '#75a7b1'} />; })}{(contact.tags || []).length > 3 && <span className="contacts-more-tags">+{contact.tags.length - 3}</span>}{(contact.tags || []).length === 0 && <span className="contacts-no-tags">Sem etiquetas</span>}</div></td>
                  <td data-label="Ações"><div className="contact-action-btn-row"><button type="button" className="table-action-btn table-action-btn--edit contacts-animated-action" onClick={(event) => { event.stopPropagation(); handleEditContact(contact); }} aria-label={`Editar ${contact.name || 'contato'}`}><Pencil size={14} aria-hidden="true" /></button><button type="button" className="table-action-btn contacts-animated-action" onClick={(event) => { event.stopPropagation(); handleOpenChat(contact.id); }}><MessageSquare size={14} aria-hidden="true" /> Conversar</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredContacts.length === 0 && <div className="contacts-empty-state"><span><FilterX size={25} aria-hidden="true" /></span><strong>Nenhum contato encontrado</strong><p>Ajuste a busca ou remova os filtros para visualizar a base.</p><button type="button" onClick={clearFilters}>Limpar filtros</button></div>}
        </div>
      </section>

      {selectedContact && (
        <div className="contacts-drawer-layer">
          <button type="button" className="contacts-drawer-backdrop" onClick={() => setSelectedContact(null)} aria-label="Fechar ficha do lead" />
          <aside ref={drawerRef} className="contacts-drawer" role="dialog" aria-modal="true" aria-labelledby="contact-drawer-title">
            <header className="contacts-drawer-header contacts-drawer-reveal"><div><span className="contacts-eyebrow">Edição do contato</span><h2 id="contact-drawer-title">Ficha do lead</h2></div><button ref={drawerCloseRef} type="button" className="contacts-drawer-close" onClick={() => setSelectedContact(null)} aria-label="Fechar ficha"><X size={18} aria-hidden="true" /></button></header>
            <div className="contacts-drawer-profile contacts-drawer-reveal"><ContactAvatar contact={selectedContact} size="large" onNeedPhoto={requestProfilePhoto} /><div><strong>{editName || selectedContact.name || 'Sem nome'}</strong><span><Phone size={13} aria-hidden="true" /> {selectedContact.phone || 'Telefone não cadastrado'}</span><small>{getChannelLabel(selectedContact)}</small></div></div>
            <div className="contacts-drawer-scroll">
              <section className="contacts-drawer-section contacts-drawer-reveal"><div className="contacts-section-heading"><CircleUserRound size={16} aria-hidden="true" /><div><strong>Dados comerciais</strong><small>Informações principais do lead</small></div></div><div className="contacts-edit-grid"><div className="contacts-form-field contacts-form-field--wide"><label htmlFor="edit-contact-name">Nome do lead</label><input id="edit-contact-name" name="edit-contact-name" type="text" autoComplete="off" value={editName} onChange={(event) => setEditName(event.target.value)} /></div><div className="contacts-form-field"><label htmlFor="edit-contact-value">Valor comercial</label><div className="contacts-currency-input"><span>R$</span><input id="edit-contact-value" name="edit-contact-value" type="number" inputMode="decimal" autoComplete="off" min="0" value={editValue} onChange={(event) => setEditValue(Number(event.target.value) || 0)} /></div></div><div className="contacts-form-field"><label htmlFor="edit-contact-status">Fase no funil</label><select id="edit-contact-status" name="edit-contact-status" value={editStatus} onChange={(event) => setEditStatus(event.target.value)}>{STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div></div></section>
              <section className="contacts-drawer-section contacts-drawer-reveal"><div className="contacts-section-heading"><Tag size={16} aria-hidden="true" /><div><strong>Etiquetas</strong><small>Organize e segmente este contato</small></div></div><div className="contacts-edit-tags">{editTags.map((tagName) => { const tagDefinition = globalTags?.find((tag) => tag.name.toLocaleLowerCase('pt-BR') === tagName.toLocaleLowerCase('pt-BR')); return <TagBadge key={tagName} name={tagName} color={tagDefinition?.color || '#75a7b1'} onDelete={() => handleRemoveTag(tagName)} />; })}{editTags.length === 0 && <span>Sem etiquetas vinculadas.</span>}</div>{tagOptions.filter((tagName) => !editTags.includes(tagName)).length > 0 && <div className="contacts-tag-suggestions"><small>Sugestões</small><div>{tagOptions.filter((tagName) => !editTags.includes(tagName)).slice(0, 5).map((tagName) => <button key={tagName} type="button" onClick={() => handleAddSuggestedTag(tagName)}><Plus size={12} aria-hidden="true" /> {tagName}</button>)}</div></div>}<form className="contacts-inline-form" onSubmit={handleAddTag}><label className="sr-only" htmlFor="new-contact-tag">Nova etiqueta</label><input id="new-contact-tag" name="new-contact-tag" type="text" autoComplete="off" placeholder="Adicionar nova etiqueta…" value={newTagText} onChange={(event) => setNewTagText(event.target.value)} /><button type="submit"><Plus size={15} aria-hidden="true" /> Adicionar</button></form></section>
              <section className="contacts-drawer-section contacts-drawer-reveal"><div className="contacts-section-heading"><StickyNote size={16} aria-hidden="true" /><div><strong>Anotações</strong><small>Histórico e contexto do atendimento</small></div></div><div className="contacts-notes-list">{notesList.map((note) => <article key={note.id}><header><span>Anotado</span><time>{note.date}</time></header><p>{note.text}</p></article>)}{notesList.length === 0 && <div className="contacts-notes-empty">Nenhuma anotação registrada.</div>}</div><form className="contacts-note-form" onSubmit={handleAddNote}><label className="sr-only" htmlFor="new-contact-note">Nova anotação</label><textarea id="new-contact-note" name="new-contact-note" autoComplete="off" rows="3" placeholder="Escreva uma observação sobre o cliente…" value={newNoteText} onChange={(event) => setNewNoteText(event.target.value)} /><button type="submit">Salvar observação <ChevronRight size={15} aria-hidden="true" /></button></form></section>
            </div>
            <footer className="contacts-drawer-footer contacts-drawer-reveal"><button type="button" className="contacts-drawer-cancel" onClick={() => setSelectedContact(null)}>Cancelar</button><button type="button" className="contacts-drawer-save" onClick={handleSaveContact}><Check size={17} aria-hidden="true" /> Salvar alterações</button></footer>
          </aside>
        </div>
      )}
    </div>
  );
}
