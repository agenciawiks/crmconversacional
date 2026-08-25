import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { useCrm } from '../context/CrmContext';
import {
  ArrowLeft, Bot, Brain, Calendar, Check, CheckCheck, ChevronDown, Clock3, FileText,
  ListChecks, Loader2, MessageSquare, Mic, MoveRight, PanelRightOpen, Paperclip,
  PenLine, Search, Send, Sparkles, Tag, Trash2, User, Users, Wifi, X, XCircle,
} from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import VoiceRecorder from './VoiceRecorder';
import TagBadge from './TagBadge';
import ErrorBoundary from './ErrorBoundary';

const tagColorsPalette = [
  '#10B981', // Emerald
  '#3B82F6', // Cobalt
  '#8B5CF6', // Amethyst
  '#EF4444', // Crimson
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#F97316', // Salmon
  '#EC4899'  // Coral
];

const sanitizeUrl = (url) => {
  if (!url) return '#';
  const trimmed = url.trim();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) {
    return '#';
  }
  return trimmed;
};

import SupabaseService from '../services/supabaseService';
import { PIPELINE_STAGES } from '../lib/contactBulkActions';
import { getResponseMetricPresentation } from '../lib/responseTimeMetrics';
import { normalizeProfilePhotoUrl, queueProfilePhotoSync } from '../services/profilePhotoService';

export default function ChatWindow() {
  const {
    contacts,
    tenantId,
    activeContact,
    setActiveContactId,
    sendMessage,
    changeContactStatus,
    bulkChangeContactStatus,
    bulkDeleteContacts,
    addNoteToContact,
    updateContactTags,
    updateContactValue,
    globalTags,
    addGlobalTag,
    updateGlobalTag,
    deleteGlobalTag,
    sendMedia,
    messageHistoryState,
    loadOlderMessages,
    retryMessageHistory
  } = useCrm();
  const activeContactId = activeContact?.id;
  const hasChatData = contacts.length > 0 && Boolean(activeContactId);

  const fileInputRef = useRef(null);
  const rootRef = useRef(null);
  const profileRef = useRef(null);
  const statusTriggerRef = useRef(null);
  const statusMenuRef = useRef(null);
  const firstEntranceFinished = useRef(false);
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [newTagText, setNewTagText] = useState('');
  
  const [isTagPanelOpen, setIsTagPanelOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [selectedNewColor, setSelectedNewColor] = useState('#10B981');
  const [editingTag, setEditingTag] = useState(null);
  const [confirmDeleteTag, setConfirmDeleteTag] = useState(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [statusMenuPosition, setStatusMenuPosition] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [bulkStage, setBulkStage] = useState('');
  const [bulkActionPending, setBulkActionPending] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState('list');
  const [failedAvatarUrls, setFailedAvatarUrls] = useState({});
  const [responseMetrics, setResponseMetrics] = useState({
    contactId: null,
    refreshKey: null,
    status: 'idle',
    first: { status: 'empty' },
    latest: { status: 'empty' }
  });
  
  const scrollRef = useRef(null);
  const preserveHistoryScrollRef = useRef(false);
  const requestedBrokenAvatarsRef = useRef(new Set());
  const latestMetricMessage = activeContact?.messages?.[activeContact.messages.length - 1];
  const responseMetricRefreshKey = latestMetricMessage
    ? `${latestMetricMessage.id || ''}:${latestMetricMessage.timestamp || latestMetricMessage.time || ''}`
    : 'empty';
  const responseMetricsAreLoading = Boolean(activeContactId && !activeContact?.is_group) && (
    responseMetrics.contactId !== activeContactId
    || responseMetrics.refreshKey !== responseMetricRefreshKey
  );

  const firstResponsePresentation = getResponseMetricPresentation(
    responseMetrics.first,
    responseMetricsAreLoading,
    responseMetrics.status === 'error'
  );
  const latestResponsePresentation = getResponseMetricPresentation(
    responseMetrics.latest,
    responseMetricsAreLoading,
    responseMetrics.status === 'error'
  );

  const getRenderableAvatarUrl = useCallback((contact) => {
    const normalizedUrl = normalizeProfilePhotoUrl(contact?.avatar_url);
    if (!normalizedUrl) return null;
    return failedAvatarUrls[String(contact.id)] === normalizedUrl ? null : normalizedUrl;
  }, [failedAvatarUrls]);

  const handleProfilePhotoError = useCallback((contact, failedUrl) => {
    if (!contact?.id || !failedUrl) return;

    const contactId = String(contact.id);
    setFailedAvatarUrls((current) => ({ ...current, [contactId]: failedUrl }));

    const requestKey = `${contactId}:${failedUrl}`;
    if (requestedBrokenAvatarsRef.current.has(requestKey)) return;
    requestedBrokenAvatarsRef.current.add(requestKey);

    queueProfilePhotoSync({ contactId: contact.id, tenantId, force: true }).catch((error) => {
      console.warn(`[Chat] Foto indisponível para ${contact.id}:`, error.message);
    });
  }, [tenantId]);

  useEffect(() => {
    if (!activeContactId || !tenantId || activeContact?.is_group) {
      return undefined;
    }

    let active = true;

    SupabaseService.fetchContactResponseMetrics(activeContactId, tenantId)
      .then((metrics) => {
        if (!active) return;
        setResponseMetrics({
          contactId: activeContactId,
          refreshKey: responseMetricRefreshKey,
          status: 'ready',
          ...metrics
        });
      })
      .catch((error) => {
        if (!active) return;
        console.error('[Chat] Falha ao calcular tempos de resposta:', error);
        setResponseMetrics({
          contactId: activeContactId,
          refreshKey: responseMetricRefreshKey,
          status: 'error',
          first: { status: 'empty' },
          latest: { status: 'empty' }
        });
      });

    return () => {
      active = false;
    };
  }, [activeContactId, tenantId, activeContact?.is_group, responseMetricRefreshKey]);

  const syncStatusMenuPosition = useCallback(() => {
    const trigger = statusTriggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 10;
    const menuWidth = Math.max(rect.width, 230);
    const menuHeight = Math.min(statusMenuRef.current?.offsetHeight || 292, window.innerHeight - (viewportPadding * 2));
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < menuHeight + 12 && rect.top > menuHeight + 12;
    const maxLeft = Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding);
    const left = Math.min(Math.max(viewportPadding, rect.left), maxLeft);
    const top = openAbove
      ? Math.max(viewportPadding, rect.top - menuHeight - 8)
      : Math.min(rect.bottom + 8, window.innerHeight - menuHeight - viewportPadding);

    setStatusMenuPosition({
      top,
      left,
      width: menuWidth,
      maxHeight: menuHeight,
      placement: openAbove ? 'top' : 'bottom',
    });
  }, []);

  const toggleStatusDropdown = useCallback(() => {
    if (!isStatusDropdownOpen) syncStatusMenuPosition();
    setIsStatusDropdownOpen((isOpen) => !isOpen);
  }, [isStatusDropdownOpen, syncStatusMenuPosition]);

  // Scroll to bottom on active message update
  useEffect(() => {
    if (scrollRef.current && !preserveHistoryScrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeContact?.messages?.length, activeContact?.id]);

  useEffect(() => {
    if (!bulkFeedback) return undefined;
    const timeoutId = window.setTimeout(() => setBulkFeedback(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [bulkFeedback]);

  useEffect(() => {
    if (!isProfileOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsProfileOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isProfileOpen]);

  useEffect(() => {
    if (!confirmDeleteTag) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setConfirmDeleteTag(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [confirmDeleteTag]);

  useLayoutEffect(() => {
    if (!hasChatData || !rootRef.current) return undefined;
    const root = rootRef.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    firstEntranceFinished.current = false;
    const context = gsap.context(() => {
      const intro = root.querySelector('.chat-intro-overlay');
      const listItems = [...root.querySelectorAll('.chat-item-row')].slice(0, 14);
      const messageItems = [...root.querySelectorAll('.message-bubble-wrapper')].slice(-24);
      const emptyConversation = root.querySelector('.chat-conversation-empty');
      const messageEntranceTargets = [...messageItems, emptyConversation].filter(Boolean);
      const targets = [
        root.querySelector('.chat-command-header'),
        root.querySelector('.chat-list-panel'), root.querySelector('.chat-active-panel'),
        root.querySelector('.chat-profile-sidebar'), ...listItems,
      ].filter(Boolean);
      gsap.set(targets, { willChange: 'transform,opacity' });
      if (intro) gsap.set(intro, { display: 'grid', yPercent: 0, autoAlpha: 1, willChange: 'transform,opacity' });
      gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          firstEntranceFinished.current = true;
          gsap.set(targets, { clearProps: 'transform,opacity,visibility,willChange' });
          if (intro) gsap.set(intro, { display: 'none', clearProps: 'transform,opacity,visibility,willChange' });
        },
      })
        .fromTo('.chat-intro-mark', { scale: .5, rotation: -16, autoAlpha: 0 }, { scale: 1, rotation: 0, autoAlpha: 1, duration: reduceMotion ? .2 : .66, ease: 'back.out(2)' }, 0)
        .fromTo('.chat-intro-copy > *', { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: reduceMotion ? .18 : .56, stagger: reduceMotion ? .04 : .1 }, reduceMotion ? .04 : .16)
        .fromTo('.chat-intro-progress i', { scaleX: 0 }, { scaleX: 1, duration: reduceMotion ? .2 : .82, ease: 'power2.inOut' }, reduceMotion ? .12 : .48)
        .to('.chat-intro-overlay', { yPercent: -104, autoAlpha: 0, duration: reduceMotion ? .25 : .88, ease: 'power4.inOut' }, reduceMotion ? .3 : 1.25)
        .fromTo('.chat-command-header', { y: -34, autoAlpha: 0, scale: .98 }, { y: 0, autoAlpha: 1, scale: 1, duration: reduceMotion ? .24 : .68 }, reduceMotion ? .32 : 1.58)
        .fromTo('.chat-list-panel', { x: -44, autoAlpha: 0, scale: .985 }, { x: 0, autoAlpha: 1, scale: 1, duration: reduceMotion ? .25 : .72 }, reduceMotion ? .36 : 1.72)
        .fromTo('.chat-active-panel', { y: 38, autoAlpha: 0, scale: .97 }, { y: 0, autoAlpha: 1, scale: 1, duration: reduceMotion ? .28 : .76 }, reduceMotion ? .4 : 1.78)
        .fromTo('.chat-profile-sidebar', { x: 44, autoAlpha: 0, scale: .985 }, { x: 0, autoAlpha: 1, scale: 1, duration: reduceMotion ? .25 : .72 }, reduceMotion ? .42 : 1.84)
        .fromTo('.chat-list-header > *', { y: -17, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: reduceMotion ? .22 : .5, stagger: reduceMotion ? .025 : .08 }, reduceMotion ? .4 : 2.02)
        .fromTo(listItems, { x: -22, autoAlpha: 0, scale: .965 }, { x: 0, autoAlpha: 1, scale: 1, duration: reduceMotion ? .2 : .42, stagger: reduceMotion ? .012 : .045 }, reduceMotion ? .44 : 2.08)
        .fromTo('.active-chat-header > *', { y: -16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: reduceMotion ? .2 : .48, stagger: reduceMotion ? .03 : .08 }, reduceMotion ? .46 : 2.12)
        .fromTo(messageEntranceTargets, { y: 20, autoAlpha: 0, scale: .98 }, { y: 0, autoAlpha: 1, scale: 1, duration: reduceMotion ? .18 : .42, stagger: reduceMotion ? .01 : .03 }, reduceMotion ? .5 : 2.25)
        .fromTo('.chat-input-footer', { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: reduceMotion ? .22 : .58 }, reduceMotion ? .52 : 2.34)
        .fromTo('.chat-profile-sidebar .profile-response-kpi, .chat-profile-sidebar .profile-section', { x: 18, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: reduceMotion ? .18 : .42, stagger: reduceMotion ? .018 : .065 }, reduceMotion ? .48 : 2.12);
    }, root);
    return () => context.revert();
  }, [hasChatData]);

  useLayoutEffect(() => {
    if (!activeContactId || !rootRef.current || !firstEntranceFinished.current) return undefined;
    const context = gsap.context(() => {
      const recentMessageBubbles = [...rootRef.current.querySelectorAll('.message-bubble-wrapper')].slice(-24);
      gsap.timeline({ defaults: { overwrite: 'auto' } })
        .fromTo('.active-contact-title', { x: -10, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .34, ease: 'power3.out' }, 0)
        .fromTo(recentMessageBubbles, { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .28, stagger: .018, ease: 'power2.out' }, .06)
        .fromTo('.profile-header-card, .profile-response-kpi, .profile-section', { x: 12, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .3, stagger: .035, ease: 'power3.out' }, .04);
    }, rootRef);
    return () => context.revert();
  }, [activeContactId]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;
    const cursorGlow = root.querySelector('.chat-cursor-glow');
    const xTo = cursorGlow ? gsap.quickTo(cursorGlow, 'x', { duration: .65, ease: 'power3.out' }) : null;
    const yTo = cursorGlow ? gsap.quickTo(cursorGlow, 'y', { duration: .65, ease: 'power3.out' }) : null;
    const findTarget = (event) => event.target.closest('.chat-gsap-action, .chat-item-row');
    const onPointerOver = (event) => {
      const target = findTarget(event);
      if (!target || !root.contains(target) || target.contains(event.relatedTarget)) return;
      gsap.to(target, { y: -2, scale: 1.012, duration: .24, ease: 'power2.out', overwrite: 'auto' });
    };
    const onPointerOut = (event) => {
      const target = findTarget(event);
      if (!target || !root.contains(target) || target.contains(event.relatedTarget)) return;
      gsap.to(target, { y: 0, scale: 1, duration: .34, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform' });
    };
    const onPointerDown = (event) => {
      const target = findTarget(event);
      if (target && root.contains(target)) gsap.to(target, { scale: .975, duration: .1, ease: 'power2.out', overwrite: 'auto' });
    };
    const onPointerUp = (event) => {
      const target = findTarget(event);
      if (target && root.contains(target)) gsap.to(target, { scale: 1.012, duration: .22, ease: 'back.out(2)', overwrite: 'auto' });
    };
    const onPointerMove = (event) => {
      xTo?.(event.clientX - 150);
      yTo?.(event.clientY - 150);
    };
    root.addEventListener('pointerover', onPointerOver);
    root.addEventListener('pointerout', onPointerOut);
    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('pointerup', onPointerUp);
    root.addEventListener('pointermove', onPointerMove);
    return () => {
      root.removeEventListener('pointerover', onPointerOver);
      root.removeEventListener('pointerout', onPointerOut);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointermove', onPointerMove);
    };
  }, [contacts.length]);

  useLayoutEffect(() => {
    if (!isStatusDropdownOpen || !statusMenuRef.current) return undefined;
    syncStatusMenuPosition();
    const menu = statusMenuRef.current;
    const context = gsap.context(() => {
      gsap.fromTo(menu, { y: statusMenuPosition?.placement === 'top' ? 9 : -9, autoAlpha: 0, scale: .97 }, { y: 0, autoAlpha: 1, scale: 1, duration: .3, ease: 'back.out(1.7)' });
      gsap.fromTo(menu.querySelectorAll('button[role="option"]'), { x: -7, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .22, stagger: .035, delay: .04, ease: 'power2.out' });
    }, menu);
    const handleViewportChange = () => syncStatusMenuPosition();
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsStatusDropdownOpen(false);
    };
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('keydown', handleEscape);
    return () => {
      context.revert();
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isStatusDropdownOpen, statusMenuPosition?.placement, syncStatusMenuPosition]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsStatusDropdownOpen(false));
    return () => window.cancelAnimationFrame(frame);
  }, [activeContactId]);

  useLayoutEffect(() => {
    if (!isTagPanelOpen || !rootRef.current) return undefined;
    const context = gsap.context(() => {
      gsap.fromTo('.chat-tag-panel', { y: -10, autoAlpha: 0, scale: .98 }, { y: 0, autoAlpha: 1, scale: 1, duration: .34, ease: 'power3.out' });
    }, rootRef);
    return () => context.revert();
  }, [isTagPanelOpen]);

  useLayoutEffect(() => {
    if (!isProfileOpen || !profileRef.current) return undefined;
    const context = gsap.context(() => {
      gsap.fromTo('.profile-header-card, .profile-response-kpi, .profile-section', { x: 16, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .32, stagger: .045, delay: .08, ease: 'power3.out' });
    }, profileRef);
    return () => context.revert();
  }, [isProfileOpen]);

  if (contacts.length === 0) {
    return (
      <div className="chat-empty-state" role="status">
        <span><MessageSquare size={24} aria-hidden="true" /></span>
        <small>Atendimento ao vivo</small>
        <h1>Caixa de Entrada Vazia</h1>
        <p>Aguardando a primeira mensagem chegar…</p>
        <em>Envie uma mensagem de teste para o canal configurado e acompanhe a conversa aqui.</em>
      </div>
    );
  }

  if (!activeContact) {
    return (
      <div className="chat-empty-state" role="status" aria-live="polite">
        <span><Loader2 size={24} className="spin" aria-hidden="true" /></span>
        <h1>Preparando suas conversas</h1>
        <p>Carregando histórico, mídias e atualizações em tempo real…</p>
      </div>
    );
  }

  // Filters contacts list
  const filteredContacts = contacts.filter(c => {
    const matchesChannel = channelFilter === 'all' || c.channel === channelFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesChannel && matchesStatus && matchesSearch;
  });

  const availableIds = new Set(contacts.map((contact) => String(contact.id)));
  const selectedIds = new Set(
    selectedContactIds.map(String).filter((id) => availableIds.has(id))
  );
  const selectedContacts = contacts.filter((contact) => selectedIds.has(String(contact.id)));
  const selectedLeadIds = selectedContacts
    .filter((contact) => !contact.is_group)
    .map((contact) => contact.id);
  const selectedGroupCount = selectedContacts.length - selectedLeadIds.length;
  const allVisibleSelected = filteredContacts.length > 0
    && filteredContacts.every((contact) => selectedIds.has(String(contact.id)));
  const unreadCount = contacts.filter((contact) => contact.unread).length;
  const groupCount = contacts.filter((contact) => contact.is_group).length;
  const humanQueueCount = contacts.filter((contact) => contact.tags?.includes('IA Inativa')).length;
  const activeAvatarUrl = getRenderableAvatarUrl(activeContact);
  const isActiveHistoryLoading = messageHistoryState?.contactId === activeContact.id
    && messageHistoryState.status === 'loading';
  const isOlderHistoryLoading = messageHistoryState?.contactId === activeContact.id
    && messageHistoryState.loadingOlder;
  const activeHistoryError = messageHistoryState?.contactId === activeContact.id
    ? messageHistoryState.error
    : null;
  const hasOlderMessages = messageHistoryState?.contactId === activeContact.id
    && messageHistoryState.hasOlder;

  const handleLoadOlderMessages = async () => {
    const scroller = scrollRef.current;
    const previousHeight = scroller?.scrollHeight || 0;
    const previousTop = scroller?.scrollTop || 0;
    preserveHistoryScrollRef.current = true;
    await loadOlderMessages(activeContact.id);
    window.requestAnimationFrame(() => {
      if (scroller) {
        scroller.scrollTop = previousTop + Math.max(0, scroller.scrollHeight - previousHeight);
      }
      preserveHistoryScrollRef.current = false;
    });
  };

  const toggleContactSelection = (contactId) => {
    const id = String(contactId);
    setSelectedContactIds((previous) => previous.includes(id)
      ? previous.filter((selectedId) => selectedId !== id)
      : [...previous, id]
    );
  };

  const toggleVisibleSelection = () => {
    const visibleIds = filteredContacts.map((contact) => String(contact.id));
    setSelectedContactIds((previous) => {
      if (allVisibleSelected) {
        const visibleSet = new Set(visibleIds);
        return previous.filter((id) => !visibleSet.has(String(id)));
      }
      return [...new Set([...previous, ...visibleIds])];
    });
  };

  const closeSelectionMode = () => {
    if (bulkActionPending) return;
    setSelectionMode(false);
    setSelectedContactIds([]);
    setBulkStage('');
  };

  const handleBulkMove = async () => {
    if (!bulkStage || selectedLeadIds.length === 0 || bulkActionPending) return;
    setBulkActionPending(true);
    setBulkFeedback(null);
    try {
      const result = await bulkChangeContactStatus(selectedLeadIds, bulkStage);
      const stage = PIPELINE_STAGES.find((item) => item.id === bulkStage);
      const ignoredGroups = selectedGroupCount > 0
        ? ` ${selectedGroupCount} grupo${selectedGroupCount > 1 ? 's foram ignorados' : ' foi ignorado'} porque grupos não entram no funil.`
        : '';
      setBulkFeedback({
        type: result.warning ? 'warning' : 'success',
        text: `${result.count} conversa${result.count > 1 ? 's movidas' : ' movida'} para ${stage?.label || 'a etapa selecionada'}.${ignoredGroups}${result.warning ? ` ${result.warning}` : ''}`
      });
      if (selectedGroupCount > 0) {
        setSelectedContactIds(selectedContacts.filter((contact) => contact.is_group).map((contact) => String(contact.id)));
      } else {
        setSelectionMode(false);
        setSelectedContactIds([]);
        setBulkStage('');
      }
    } catch (error) {
      console.error('[ChatWindow] Bulk move failed:', error);
      setBulkFeedback({ type: 'error', text: error.message || 'Não foi possível mover as conversas.' });
    } finally {
      setBulkActionPending(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || bulkActionPending) return;
    const idsToDelete = [...selectedIds];
    const count = idsToDelete.length;
    const confirmed = window.confirm(
      `Excluir permanentemente ${count} conversa${count > 1 ? 's' : ''}? Esta ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    setBulkActionPending(true);
    setBulkFeedback(null);
    try {
      const result = await bulkDeleteContacts(idsToDelete);
      setSelectionMode(false);
      setSelectedContactIds([]);
      setBulkStage('');
      setBulkFeedback({
        type: 'success',
        text: `${result.count} conversa${result.count > 1 ? 's excluídas' : ' excluída'} com sucesso.`
      });
    } catch (error) {
      console.error('[ChatWindow] Bulk delete failed:', error);
      setBulkFeedback({ type: 'error', text: error.message || 'Não foi possível excluir as conversas.' });
    } finally {
      setBulkActionPending(false);
    }
  };

  const handleSendVoice = async (file) => {
    setIsRecordingVoice(false);
    if (!activeContact) return;
    try {
      await sendMedia(activeContact.id, file);
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar áudio.');
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    sendMessage(activeContact.id, inputText, 'agent');
    setInputText('');
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (16MB = 16 * 1024 * 1024 bytes)
    if (file.size > 16 * 1024 * 1024) {
      alert("O arquivo excede o limite de 16MB. Por favor, escolha um arquivo menor.");
      e.target.value = '';
      return;
    }

    // Call sendMedia
    await sendMedia(activeContact.id, file, inputText);
    setInputText('');
    e.target.value = '';
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  const handleResetAiMemory = async () => {
    if (window.confirm("Isso fará com que a IA esqueça todo o histórico desta conversa e comece um novo atendimento do zero. Continuar?")) {
      try {
        await SupabaseService.resetAiMemory(activeContact.id);
        alert("Memória da IA resetada com sucesso para este contato!");
      } catch (e) {
        console.error(e);
        alert("Erro ao resetar memória.");
      }
    }
  };

  const handleInjectTemplate = (text) => {
    sendMessage(activeContact.id, text, 'agent');
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNoteToContact(activeContact.id, noteText);
    setNoteText('');
  };

  const handleRemoveTag = (tagToRemove) => {
    const activeTags = activeContact.tags || [];
    updateContactTags(activeContact.id, activeTags.filter(t => t !== tagToRemove));
  };

  const handleAddTagDirect = (tagName) => {
    const activeTags = activeContact.tags || [];
    if (!activeTags.includes(tagName)) {
      updateContactTags(activeContact.id, [...activeTags, tagName]);
    }
  };

  const handleSaveTagEdit = async () => {
    if (!editingTag) return;
    const cleanedNew = editingTag.newName.trim().substring(0, 24);
    if (!cleanedNew) return;

    // Check validation (remove special chars < > ")
    const regex = /[<>"]/g;
    if (regex.test(cleanedNew)) {
      alert("Caracteres especiais inválidos (<, >, \") não são permitidos.");
      return;
    }

    try {
      // Check duplicate merge
      const isNameChange = editingTag.name.toLowerCase() !== cleanedNew.toLowerCase();
      if (isNameChange && globalTags.some(t => t.name.toLowerCase() === cleanedNew.toLowerCase())) {
        const confirmMerge = window.confirm(`A etiqueta "${cleanedNew}" já existe. Deseja mesclar as duas etiquetas? Esta ação atualizará todos os contatos associados.`);
        if (!confirmMerge) return;
      }

      await updateGlobalTag(editingTag.name, cleanedNew, editingTag.color);
      setEditingTag(null);
    } catch(e) {
      alert(e.message || "Erro ao atualizar etiqueta.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTag) return;
    await deleteGlobalTag(confirmDeleteTag.name);
    setConfirmDeleteTag(null);
  };

  const getContactsWithTagCount = (tagName) => {
    return contacts.filter(c => c.tags && c.tags.includes(tagName)).length;
  };

  // Simulate client inbound message
  const handleSimulateClient = () => {
    const simulationMsgs = [
      "Quais são os prazos de entrega?",
      "Gostei muito do atendimento comercial!",
      "Vocês integram com n8n?",
      "Qual o valor final com desconto?",
      "Preciso de suporte técnico com minha hospedagem"
    ];
    const text = simulationMsgs[Math.floor(Math.random() * simulationMsgs.length)];
    sendMessage(activeContact.id, text, 'client');
  };

  const isAiPaused = activeContact.tags?.includes('IA Inativa');
  const toggleAi = () => {
    if (isAiPaused) {
      updateContactTags(activeContact.id, activeContact.tags.filter(t => t !== 'IA Inativa'));
    } else {
      updateContactTags(activeContact.id, [...activeContact.tags, 'IA Inativa']);
    }
  };

  return (
    <ErrorBoundary>
      <div ref={rootRef} className={`chat-workspace ${mobilePane === 'list' ? 'is-mobile-list' : 'is-mobile-conversation'} ${isProfileOpen ? 'is-profile-open' : ''}`}>
      <div className="chat-intro-overlay" aria-hidden="true">
        <div className="chat-intro-mark"><MessageSquare size={30} strokeWidth={2.2} /></div>
        <div className="chat-intro-copy"><small>Central inteligente</small><strong>Chat Ao Vivo</strong><span>Sincronizando conversas e atendimento…</span></div>
        <span className="chat-intro-progress"><i /></span>
      </div>
      <div className="chat-cursor-glow" aria-hidden="true" />
      <div className="chat-ambient chat-ambient--one" aria-hidden="true" />
      <div className="chat-ambient chat-ambient--two" aria-hidden="true" />

      <header className="chat-command-header">
        <div className="chat-command-copy">
          <span><Sparkles size={12} aria-hidden="true" />Central inteligente</span>
          <h1>Chat Ao Vivo</h1>
          <p>Conversas, mídias e oportunidades em um único fluxo.</p>
        </div>
        <div className="chat-command-metrics" aria-label="Resumo do atendimento">
          <div><span><MessageSquare size={15} aria-hidden="true" /></span><small>Conversas</small><strong>{contacts.length}</strong></div>
          <div><span><Wifi size={15} aria-hidden="true" /></span><small>Não lidas</small><strong>{unreadCount}</strong></div>
          <div><span><User size={15} aria-hidden="true" /></span><small>Com humano</small><strong>{humanQueueCount}</strong></div>
          <div><span><Users size={15} aria-hidden="true" /></span><small>Grupos</small><strong>{groupCount}</strong></div>
        </div>
        <div className="chat-command-live" role="status"><i /><span><strong>Tempo real ativo</strong><small>Mensagens sincronizadas</small></span></div>
      </header>
      
      {/* COLUMN 1: CHATS DIRECTORY */}
      <aside className="chat-list-panel" aria-label="Lista de conversas">
        <div className="chat-list-header">
          <div className="chat-list-title-row">
            <div className="chat-list-heading-copy">
              <span><Wifi size={11} aria-hidden="true" />Atendimento ao vivo</span>
              <h2>Conversas</h2>
              <small>{filteredContacts.length} de {contacts.length} visíveis</small>
            </div>
            {selectionMode ? (
              <button type="button" className="chat-selection-toggle chat-gsap-action active" onClick={closeSelectionMode} disabled={bulkActionPending}>
                <X size={14} aria-hidden="true" /> Cancelar
              </button>
            ) : (
              <button type="button" className="chat-selection-toggle chat-gsap-action" onClick={() => setSelectionMode(true)}>
                <ListChecks size={14} aria-hidden="true" /> Selecionar
              </button>
            )}
          </div>
          
          <div className="search-wrapper">
            <Search size={15} aria-hidden="true" />
            <label className="sr-only" htmlFor="chat-search">Buscar conversas</label>
            <input
              id="chat-search"
              name="chat_search"
              type="search"
              placeholder="Buscar por nome ou etiqueta…"
              className="glass-input chat-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="chat-channels-filter chat-channel-tabs" aria-label="Filtrar por canal">
            <button
              type="button"
              onClick={() => setChannelFilter('all')}
              className={`channel-tab-btn chat-gsap-action ${channelFilter === 'all' ? 'active' : ''}`}
              aria-pressed={channelFilter === 'all'}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('whatsapp')}
              className={`channel-tab-btn chat-gsap-action ${channelFilter === 'whatsapp' ? 'active' : ''}`}
              aria-pressed={channelFilter === 'whatsapp'}
            >
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('telegram')}
              className={`channel-tab-btn chat-gsap-action ${channelFilter === 'telegram' ? 'active' : ''}`}
              aria-pressed={channelFilter === 'telegram'}
            >
              Instagram
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('webchat')}
              className={`channel-tab-btn chat-gsap-action ${channelFilter === 'webchat' ? 'active' : ''}`}
              aria-pressed={channelFilter === 'webchat'}
            >
              TikTok
            </button>
          </div>

          <div className="chat-status-filter" aria-label="Filtrar por fase do funil">
            <span className="chat-filter-label"><Sparkles size={11} aria-hidden="true" />Fase</span>
            <div className="chat-status-filter-scroll">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`channel-tab-btn chat-gsap-action ${statusFilter === 'all' ? 'active' : ''}`}
              aria-pressed={statusFilter === 'all'}
            >
              Qualquer Fase {statusFilter === 'all' && <span style={{ opacity: 0.7, fontSize: '10px', marginLeft: '4px' }}>({filteredContacts.length})</span>}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('new')}
              className={`channel-tab-btn chat-gsap-action ${statusFilter === 'new' ? 'active' : ''}`}
              aria-pressed={statusFilter === 'new'}
              style={{ whiteSpace: 'nowrap' }}
            >
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-status-new)', marginRight: '4px' }}></span>
              Novos Leads {statusFilter === 'new' && <span style={{ opacity: 0.7, fontSize: '10px', marginLeft: '4px' }}>({filteredContacts.length})</span>}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('no_answer')}
              className={`channel-tab-btn chat-gsap-action ${statusFilter === 'no_answer' ? 'active' : ''}`}
              aria-pressed={statusFilter === 'no_answer'}
              style={{ whiteSpace: 'nowrap' }}
            >
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-status-no-answer)', marginRight: '4px' }}></span>
              Sem Resposta {statusFilter === 'no_answer' && <span style={{ opacity: 0.7, fontSize: '10px', marginLeft: '4px' }}>({filteredContacts.length})</span>}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('contacted')}
              className={`channel-tab-btn chat-gsap-action ${statusFilter === 'contacted' ? 'active' : ''}`}
              aria-pressed={statusFilter === 'contacted'}
              style={{ whiteSpace: 'nowrap' }}
            >
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-status-contacted)', marginRight: '4px' }}></span>
              Em Contato {statusFilter === 'contacted' && <span style={{ opacity: 0.7, fontSize: '10px', marginLeft: '4px' }}>({filteredContacts.length})</span>}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('proposal')}
              className={`channel-tab-btn chat-gsap-action ${statusFilter === 'proposal' ? 'active' : ''}`}
              aria-pressed={statusFilter === 'proposal'}
              style={{ whiteSpace: 'nowrap' }}
            >
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-status-proposal)', marginRight: '4px' }}></span>
              Interesse {statusFilter === 'proposal' && <span style={{ opacity: 0.7, fontSize: '10px', marginLeft: '4px' }}>({filteredContacts.length})</span>}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('won')}
              className={`channel-tab-btn chat-gsap-action ${statusFilter === 'won' ? 'active' : ''}`}
              aria-pressed={statusFilter === 'won'}
              style={{ whiteSpace: 'nowrap' }}
            >
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-status-won)', marginRight: '4px' }}></span>
              Ganho {statusFilter === 'won' && <span style={{ opacity: 0.7, fontSize: '10px', marginLeft: '4px' }}>({filteredContacts.length})</span>}
            </button>
            </div>
          </div>

          {selectionMode && (
            <div className="chat-selection-summary">
              <label className="chat-select-visible">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleVisibleSelection}
                  disabled={filteredContacts.length === 0 || bulkActionPending}
                />
                <span>{allVisibleSelected ? 'Desmarcar visíveis' : 'Selecionar visíveis'}</span>
              </label>
              <strong>{selectedIds.size} selecionada{selectedIds.size === 1 ? '' : 's'}</strong>
            </div>
          )}
        </div>

        <div className="chat-scroll-area">
          {filteredContacts.map(contact => {
            const isSelected = activeContact.id === contact.id;
            const isBulkSelected = selectedIds.has(String(contact.id));
            const lastMsg = contact.messages[contact.messages.length - 1];
            const contactAvatarUrl = getRenderableAvatarUrl(contact);
            return (
              <div
                key={contact.id}
                role="button"
                tabIndex={0}
                aria-label={`${selectionMode ? 'Selecionar' : 'Abrir'} conversa de ${contact.name || 'Sem nome'}`}
                onClick={() => {
                  if (selectionMode) {
                    toggleContactSelection(contact.id);
                    return;
                  }
                  setActiveContactId(contact.id);
                  setMobilePane('conversation');
                  contact.unread = false; // Mark read on click
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  if (selectionMode) toggleContactSelection(contact.id);
                  else {
                    setActiveContactId(contact.id);
                    setMobilePane('conversation');
                    contact.unread = false;
                  }
                }}
                className={`chat-item-row ${!selectionMode && isSelected ? 'active' : ''} ${isBulkSelected ? 'bulk-selected' : ''} ${contact.unread ? 'unread' : ''}`}
              >
                {selectionMode && (
                  <input
                    className="chat-row-checkbox"
                    type="checkbox"
                    checked={isBulkSelected}
                    onChange={() => toggleContactSelection(contact.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Selecionar conversa de ${contact.name || 'Sem nome'}`}
                    disabled={bulkActionPending}
                  />
                )}
                <div className="chat-avatar-wrapper">
                  <div className="avatar" style={{ background: contactAvatarUrl ? 'transparent' : contact.avatarColor }}>
                    {contactAvatarUrl ? (
                      <img src={contactAvatarUrl} alt="" width="44" height="44" loading="lazy" onError={() => handleProfilePhotoError(contact, contactAvatarUrl)} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : contact.is_group ? (
                      <Users size={18} strokeWidth={2.2} />
                    ) : (
                      (contact.name || 'Sem nome').substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <span className={`channel-icon-badge ${contact.channel}`}>
                    {contact.channel === 'whatsapp' && 'W'}
                    {contact.channel === 'telegram' && 'I'}
                    {contact.channel === 'webchat' && 'T'}
                  </span>
                </div>

                <div className="chat-info">
                  <div className="chat-info-header">
                    <span className="chat-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {contact.name}
                      {contact.is_group && (
                        <Users size={12} strokeWidth={2.5} color="var(--accent-primary)" title="Grupo do WhatsApp" />
                      )}
                      {contact.tags?.includes('IA Inativa') && (
                        <User size={12} strokeWidth={2.5} color="var(--warning-color)" title="Aguardando Atendente Humano" />
                      )}
                    </span>
                    <span className="chat-time">{lastMsg?.time || ''}</span>
                  </div>
                  <div className="chat-preview-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start', height: 'auto', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="chat-preview-text" style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {lastMsg ? (
                          lastMsg.sender === 'agent'
                            ? `Você: ${lastMsg.text}`
                            : lastMsg.sender === 'bot'
                              ? `Bot: ${lastMsg.text}`
                              : contact.is_group && lastMsg.sender_name
                                ? `${lastMsg.sender_name}: ${lastMsg.text}`
                                : lastMsg.text
                        ) : 'Sem mensagens'}
                      </span>
                      {contact.unread && <span className="unread-count-dot" style={{ marginLeft: '6px', flexShrink: 0 }}></span>}
                    </div>
                    {contact.tags && contact.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px', width: '100%' }}>
                        {contact.tags.map(tag => {
                          const tagColorObj = globalTags?.find(t => t.name.toLowerCase() === tag.toLowerCase());
                          const color = tagColorObj ? tagColorObj.color : '#9CA3AF';
                          return (
                            <span
                              key={tag}
                              style={{
                                padding: '1px 5px',
                                backgroundColor: `${color}15`,
                                borderColor: `${color}30`,
                                color: color,
                                border: '1px solid',
                                borderRadius: '3px',
                                fontSize: '9px',
                                fontWeight: '600',
                                lineHeight: '1.2',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredContacts.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '24px' }}>
              Nenhum contato encontrado.
            </div>
          )}
        </div>

        {selectionMode && (
          <div className="chat-bulk-actions">
            <select
              className="chat-bulk-stage-select"
              value={bulkStage}
              onChange={(event) => setBulkStage(event.target.value)}
              disabled={bulkActionPending}
              aria-label="Etapa do funil para as conversas selecionadas"
            >
              <option value="">Escolha a etapa do funil</option>
              {PIPELINE_STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>{stage.label}</option>
              ))}
            </select>
            {selectedGroupCount > 0 && (
              <span className="chat-bulk-hint">Grupos podem ser excluídos, mas não são movidos para o funil.</span>
            )}
            <div className="chat-bulk-buttons">
              <button
                type="button"
                className="chat-bulk-button chat-gsap-action move"
                onClick={handleBulkMove}
                disabled={!bulkStage || selectedLeadIds.length === 0 || bulkActionPending}
              >
                {bulkActionPending ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <MoveRight size={14} aria-hidden="true" />}
                Mover {selectedLeadIds.length || ''}
              </button>
              <button
                type="button"
                className="chat-bulk-button chat-gsap-action delete"
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || bulkActionPending}
              >
                {bulkActionPending ? <Loader2 size={14} className="spin" aria-hidden="true" /> : <Trash2 size={14} aria-hidden="true" />}
                Excluir {selectedIds.size || ''}
              </button>
            </div>
          </div>
        )}
      </aside>

      {bulkFeedback && (
        <div className={`chat-bulk-feedback ${bulkFeedback.type}`} role="status">
          {bulkFeedback.text}
        </div>
      )}

      {/* COLUMN 2: ACTIVE DIALOG PANEL */}
      <main className="chat-active-panel" aria-label={`Conversa com ${activeContact.name || 'contato'}`}>
        <div className="active-chat-header">
          <button type="button" className="chat-mobile-back chat-gsap-action" onClick={() => setMobilePane('list')} aria-label="Voltar para a lista de conversas">
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div className="active-contact-title">
            <div className="avatar" style={{ background: activeAvatarUrl ? 'transparent' : activeContact.avatarColor }}>
              {activeAvatarUrl ? (
                <img src={activeAvatarUrl} alt="" width="44" height="44" onError={() => handleProfilePhotoError(activeContact, activeAvatarUrl)} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : activeContact.is_group ? (
                <Users size={20} strokeWidth={2.2} />
              ) : (
                (activeContact.name || 'Sem nome').substring(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <span className="active-contact-name">{activeContact.name}</span>
              <div className="active-contact-channel">
                <span className="chat-live-state"><i />Tempo real</span>
                <span className={`tag tag-${activeContact.channel}`}>
                  {activeContact.channel === 'whatsapp' ? (
                    activeContact.provider === 'meta_cloud' ? 'WhatsApp Oficial' : 'WhatsApp'
                  ) : activeContact.channel === 'telegram' ? 'Instagram' :
                      activeContact.channel === 'webchat' ? 'Tiktok' : activeContact.channel}
                </span>
                {activeContact.is_group ? (
                  <span className="tag" style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={11} strokeWidth={2.4} /> Grupo
                  </span>
                ) : (
                  <span className={`tag status-${activeContact.status}`}>
                    {activeContact.status === 'new' && 'Novo Lead'}
                    {activeContact.status === 'contacted' && 'Em Contato'}
                    {activeContact.status === 'no_answer' && 'Sem Resposta'}
                    {activeContact.status === 'proposal' && 'Tem Interesse'}
                    {activeContact.status === 'won' && 'Vendido'}
                    {activeContact.status === 'lost' && 'Perdido'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="active-chat-actions">
            {!activeContact.is_group && (
              <button
                type="button"
                onClick={toggleAi}
                className={`glass-btn chat-gsap-action chat-ai-control ${isAiPaused ? 'is-human' : 'is-ai'}`}
                aria-pressed={isAiPaused}
                title={isAiPaused ? "Retornar atendimento para a Inteligência Artificial" : "Pausar IA e assumir a conversa"}
              >
                {isAiPaused ? <User size={13} strokeWidth={2.5} aria-hidden="true" /> : <Bot size={13} strokeWidth={2.5} aria-hidden="true" />}
                <span>{isAiPaused ? 'Humano Ativo' : 'IA Ativa'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSimulateClient}
              className="glass-btn chat-gsap-action secondary chat-simulate-button"
              style={{ padding: '8px 12px', fontSize: '11px', display: 'flex', gap: '6px', alignItems: 'center' }}
              title="Simula uma nova mensagem chegando do cliente"
            >
              <MessageSquare size={12} strokeWidth={2.5} aria-hidden="true" />
              Simular Cliente
            </button>
            <button type="button" className="chat-profile-toggle chat-gsap-action" onClick={() => setIsProfileOpen(true)} aria-label="Abrir perfil da conversa">
              <PanelRightOpen size={17} aria-hidden="true" />
              <span>Perfil</span>
            </button>
          </div>
        </div>

        {/* MESSAGES VIEW */}
        <div className="messages-scroller" ref={scrollRef} aria-busy={isActiveHistoryLoading || isOlderHistoryLoading}>
          {isActiveHistoryLoading && (
            <div className="chat-history-state chat-history-state--loading" role="status" aria-live="polite">
              <Loader2 size={15} className="spin-animation" aria-hidden="true" />
              <span>Sincronizando histórico…</span>
            </div>
          )}
          {!isActiveHistoryLoading && activeHistoryError && (
            <div className="chat-history-state chat-history-state--error" role="alert">
              <span>{activeHistoryError}</span>
              <button type="button" className="chat-gsap-action" onClick={retryMessageHistory}>Tentar novamente</button>
            </div>
          )}
          {!isActiveHistoryLoading && !activeHistoryError && hasOlderMessages && (
            <button
              type="button"
              className="chat-history-load-more chat-gsap-action"
              onClick={handleLoadOlderMessages}
              disabled={isOlderHistoryLoading}
            >
              {isOlderHistoryLoading ? <Loader2 size={14} className="spin-animation" aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
              {isOlderHistoryLoading ? 'Carregando mensagens…' : 'Carregar mensagens anteriores'}
            </button>
          )}
          {(activeContact.messages || []).length === 0 && !isActiveHistoryLoading && !activeHistoryError && (
            <div className="chat-conversation-empty">
              <span><MessageSquare size={22} aria-hidden="true" /></span>
              <small>Conversa selecionada</small>
              <h2>Pronto para atender</h2>
              <p>Ainda não há mensagens neste histórico. Envie a primeira mensagem ou aguarde o contato iniciar a conversa.</p>
            </div>
          )}
          {(activeContact.messages || []).map(msg => (
            <div key={msg.id} className={`message-bubble-wrapper ${msg.sender}`}>
              <div className="message-bubble">
                {activeContact.is_group && msg.sender === 'client' && (
                  <div style={{ color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 700, marginBottom: '5px' }}>
                    {msg.sender_name || 'Participante do grupo'}
                  </div>
                )}
                {msg.content_type === 'image' ? (
                  msg.media_url ? (
                    <div className="chat-media-shell">
                      <img
                        src={msg.media_url} 
                        alt="Imagem enviada" 
                        width="280"
                        height="210"
                        loading="lazy"
                        className="chat-media-image"
                        onClick={() => window.open(msg.media_url, '_blank')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') window.open(msg.media_url, '_blank');
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                      <div className="media-error-fallback" style={{ display: 'none', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px dashed var(--border-glass)', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      <XCircle size={16} aria-hidden="true" /> Mídia indisponível
                      </div>
                      {msg.text && msg.text !== '[Imagem]' && <div>{typeof msg.text === 'string' ? msg.text : JSON.stringify(msg.text)}</div>}
                    </div>
                  ) : (
                    <div style={{ marginBottom: '8px' }}>
                      <div className="media-error-fallback" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px dashed var(--border-glass)', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        <XCircle size={16} aria-hidden="true" /> Mídia indisponível
                      </div>
                      {msg.text && msg.text !== '[Imagem]' && <div>{typeof msg.text === 'string' ? msg.text : JSON.stringify(msg.text)}</div>}
                    </div>
                  )
                ) : msg.content_type === 'sticker' && msg.media_url ? (
                  <div>
                    <img
                      src={msg.media_url} 
                      alt="Figurinha enviada" 
                      width="120"
                      height="120"
                      style={{ width: '120px', height: '120px', objectFit: 'contain', background: 'transparent', display: 'block' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                ) : msg.content_type === 'audio' ? (
                  msg.media_url ? (
                    <AudioPlayer src={msg.media_url} />
                  ) : (
                    <div className="media-error-fallback" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px dashed var(--border-glass)', color: 'var(--text-secondary)' }}>
                      <XCircle size={16} aria-hidden="true" /> Áudio não disponível
                    </div>
                  )
                ) : msg.content_type === 'video' ? (
                  msg.media_url ? (
                    <div>
                      <video src={msg.media_url} controls preload="metadata" width="280" height="158" className="chat-media-video" />
                      {msg.text && msg.text !== '[Vídeo]' && <div>{typeof msg.text === 'string' ? msg.text : JSON.stringify(msg.text)}</div>}
                    </div>
                  ) : (
                    <div style={{ marginBottom: '8px' }}>
                      <div className="media-error-fallback" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px dashed var(--border-glass)', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        <XCircle size={16} aria-hidden="true" /> Vídeo não disponível
                      </div>
                      {msg.text && msg.text !== '[Vídeo]' && <div>{typeof msg.text === 'string' ? msg.text : JSON.stringify(msg.text)}</div>}
                    </div>
                  )
                ) : msg.content_type === 'document' && msg.media_url ? (
                  <div>
                    <a 
                      href={sanitizeUrl(msg.media_url)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)', textDecoration: 'underline' }}
                    >
                      <FileText size={14} strokeWidth={2.5} aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                      {typeof msg.text === 'string' ? msg.text : (msg.text ? JSON.stringify(msg.text) : 'Documento')}
                    </a>
                  </div>
                ) : (
                  typeof msg.text === 'string' ? msg.text.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      <br />
                    </React.Fragment>
                  )) : (msg.text ? JSON.stringify(msg.text) : '')
                )}
              </div>
              <div className="message-meta-row">
                <span>{msg.sender === 'agent' ? 'Agente' : msg.sender === 'bot' ? 'Automação Bot' : (activeContact.is_group ? (msg.sender_name || 'Participante') : 'Cliente')}</span>
                <span>•</span>
                <span>{msg.time}</span>
                {msg.sender === 'agent' && msg.status && (
                  <span className={`msg-status msg-status-${msg.status}`}>
                    {msg.status === 'sending' && (
                      <span className="status-sending" title="Enviando…">
                        <Loader2 size={12} strokeWidth={2.5} className="spin-animation" aria-hidden="true" />
                      </span>
                    )}
                    {msg.status === 'sent' && (
                      <span className="status-sent" title="Enviado">
                        <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                      </span>
                    )}
                    {msg.status === 'delivered' && (
                      <span className="status-delivered" title="Entregue">
                        <CheckCheck size={14} strokeWidth={2.5} aria-hidden="true" />
                      </span>
                    )}
                    {msg.status === 'read' && (
                      <span className="status-read" title="Visualizado">
                        <CheckCheck size={14} strokeWidth={2.5} aria-hidden="true" />
                      </span>
                    )}
                    {msg.status === 'played' && (
                      <span
                        className="status-played"
                        title="Áudio reproduzido"
                      >
                        <CheckCheck size={14} strokeWidth={2.5} aria-hidden="true" />
                      </span>
                    )}
                    {msg.status === 'failed' && (
                      <span className="status-failed" title="Falha ao enviar. Tente novamente.">
                        <XCircle size={12} strokeWidth={2.5} aria-hidden="true" />
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* INPUT AND QUICK TEMPLATES */}
        <div className="chat-input-footer">
          <div className="quick-reply-wrapper">
            <button
              type="button"
              onClick={() => handleInjectTemplate('Olá! Como posso te ajudar hoje?')}
              className="quick-reply-pill chat-gsap-action"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <MessageSquare size={12} strokeWidth={2.5} aria-hidden="true" />
              Saudação
            </button>
            <button
              type="button"
              onClick={() => handleInjectTemplate('Aqui está a nossa proposta comercial para o seu plano.')}
              className="quick-reply-pill chat-gsap-action"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <FileText size={12} strokeWidth={2.5} aria-hidden="true" />
              Proposta
            </button>
            <button
              type="button"
              onClick={() => handleInjectTemplate('Podemos agendar uma demonstração por vídeo amanhã às 14h?')}
              className="quick-reply-pill chat-gsap-action"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Calendar size={12} strokeWidth={2.5} aria-hidden="true" />
              Agendar Call
            </button>
            <button
              type="button"
              onClick={() => handleInjectTemplate('Perfeito! Seu contrato foi gerado. Estou enviando por e-mail.')}
              className="quick-reply-pill chat-gsap-action"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <PenLine size={12} strokeWidth={2.5} aria-hidden="true" />
              Fechamento
            </button>
          </div>

          <div className="chat-input-bar">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()} 
              className="glass-btn chat-gsap-action secondary"
              style={{ padding: '12px', borderRadius: '50%' }}
              title="Anexar arquivo"
              aria-label="Anexar arquivo"
            >
              <Paperclip size={18} strokeWidth={2.5} aria-hidden="true" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileSelect}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
              aria-label="Selecionar arquivo para enviar"
            />
            {isRecordingVoice ? (
              <VoiceRecorder 
                onSend={handleSendVoice} 
                onCancel={() => setIsRecordingVoice(false)} 
              />
            ) : (
              <>
                <input
                  id="chat-message-input"
                  name="chat_message"
                  type="text"
                  placeholder="Digite sua mensagem aqui…"
                  className="glass-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  autoComplete="off"
                  aria-label="Mensagem"
                />
                {!inputText.trim() && (
                  <button type="button" onClick={() => setIsRecordingVoice(true)} className="glass-btn chat-gsap-action secondary" style={{ padding: '12px', borderRadius: '50%' }} title="Gravar áudio" aria-label="Gravar áudio">
                    <Mic size={18} strokeWidth={2.5} aria-hidden="true" />
                  </button>
                )}
                <button type="button" onClick={handleSend} className="glass-btn chat-gsap-action chat-send-button" style={{ padding: '12px 20px' }} disabled={!inputText.trim()}>
                  <span>Enviar</span>
                  <Send size={14} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      {/* COLUMN 3: CONTACT SUMMARY PROFILE */}
      <button type="button" className="chat-profile-backdrop" onClick={() => setIsProfileOpen(false)} aria-label="Fechar perfil da conversa" tabIndex={isProfileOpen ? 0 : -1} />
      <aside ref={profileRef} className="chat-profile-sidebar" aria-label="Perfil da conversa">
        <button type="button" className="chat-profile-close chat-gsap-action" onClick={() => setIsProfileOpen(false)} aria-label="Fechar perfil da conversa"><X size={17} aria-hidden="true" /></button>
        <div className="profile-header-card">
          <div className="avatar" style={{
            width: '64px',
            height: '64px',
            fontSize: '22px',
            background: activeAvatarUrl ? 'transparent' : activeContact.avatarColor,
            border: '2px solid var(--border-glass)'
          }}>
            {activeAvatarUrl ? (
              <img src={activeAvatarUrl} alt="" width="64" height="64" onError={() => handleProfilePhotoError(activeContact, activeAvatarUrl)} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : activeContact.is_group ? (
              <Users size={28} strokeWidth={2.1} />
            ) : (
              (activeContact.name || 'Sem nome').substring(0, 2).toUpperCase()
            )}
          </div>
          <span className="profile-name">{activeContact.name}</span>
          <div className="profile-meta-chips">
            <span className={`tag tag-${activeContact.channel}`}>
              {activeContact.channel === 'whatsapp' ? (
                activeContact.provider === 'meta_cloud' ? 'WhatsApp Oficial' : 'WhatsApp'
              ) : activeContact.channel === 'telegram' ? 'Telegram' :
                  activeContact.channel === 'instagram' ? 'Instagram' :
                  activeContact.channel === 'webchat' ? 'Tiktok' : activeContact.channel}
            </span>
            {activeContact.is_group ? (
              <span className="tag" style={{ color: 'var(--accent-primary)' }}>Grupo do WhatsApp</span>
            ) : (
              <span className={`tag status-${activeContact.status}`}>
                {activeContact.status === 'new' && 'Novo Lead'}
                {activeContact.status === 'contacted' && 'Em Contato'}
                {activeContact.status === 'no_answer' && 'Sem Resposta'}
                {activeContact.status === 'proposal' && 'Tem Interesse'}
                {activeContact.status === 'won' && 'Vendido'}
                {activeContact.status === 'lost' && 'Perdido'}
              </span>
            )}
          </div>
        </div>

        {!activeContact.is_group && (
          <section className="profile-response-metrics" aria-label="Tempos de resposta do contato">
            <article className={`profile-response-kpi is-${firstResponsePresentation.state}`}>
              <span className="profile-response-icon"><Clock3 size={15} aria-hidden="true" /></span>
              <span className="profile-response-copy">
                <small>Primeira resposta</small>
                <strong>{firstResponsePresentation.value}</strong>
                <em>Da primeira mensagem até o retorno</em>
              </span>
            </article>
            <article className={`profile-response-kpi is-${latestResponsePresentation.state}`}>
              <span className="profile-response-icon"><MessageSquare size={15} aria-hidden="true" /></span>
              <span className="profile-response-copy">
                <small>Última resposta</small>
                <strong>{latestResponsePresentation.value}</strong>
                <em>Da mensagem mais recente até o retorno</em>
              </span>
            </article>
          </section>
        )}

        {/* CONTACT DATA INFO */}
        <div className="profile-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span className="profile-section-title" style={{ margin: 0 }}>{activeContact.is_group ? 'Dados do Grupo' : 'Dados do Contato'}</span>
            {!activeContact.is_group && <button 
              type="button"
              onClick={handleResetAiMemory}
              className="chat-profile-danger chat-gsap-action"
              title="Resetar Memória da IA (inicia novo atendimento)"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <Brain size={12} aria-hidden="true" /> Resetar IA
            </button>}
          </div>
          {!activeContact.is_group && <div className="profile-field">
            <span className="profile-field-label">E-mail</span>
            <span className="profile-field-value">{activeContact.email}</span>
          </div>}
          {activeContact.channel === 'telegram' ? (
            <>
              {activeContact.username ? (
                <div className="profile-field">
                  <span className="profile-field-label">Username</span>
                  <span className="profile-field-value">@{activeContact.username}</span>
                </div>
              ) : (
                <div className="profile-field">
                  <span className="profile-field-label">Username / Instagram ID</span>
                  <span className="profile-field-value">{activeContact.phone}</span>
                </div>
              )}
              {activeContact.username && (
                <div className="profile-field">
                  <span className="profile-field-label">Instagram ID</span>
                  <span className="profile-field-value">{activeContact.phone}</span>
                </div>
              )}
            </>
          ) : (
            <div className="profile-field">
              <span className="profile-field-label">{activeContact.is_group ? 'Identificador do grupo' : 'Telefone'}</span>
              <span className="profile-field-value">{activeContact.is_group ? (activeContact.whatsapp_jid || activeContact.phone) : activeContact.phone}</span>
            </div>
          )}
        </div>

        {/* PIPELINE & FINANCIAL DETAILS */}
        <div className={`profile-section profile-business-section${isStatusDropdownOpen ? ' is-stage-menu-open' : ''}`} style={{
          display: activeContact.is_group ? 'none' : undefined,
          background: 'rgba(20, 20, 28, 0.4)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 20px rgba(0, 0, 0, 0.2)'
        }}>
          <span className="profile-section-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-primary)' }}></span>
            Funil & Negócios
          </span>
          
          <div className="profile-field" style={{ position: 'relative' }}>
            <span className="profile-field-label">Fase no CRM</span>
            
            {/* MODERN CUSTOM DROPDOWN */}
            <div
              className="modern-status-selector" 
              style={{
                position: 'relative',
                width: '100%'
              }}
            >
              <button
                ref={statusTriggerRef}
                type="button"
                onClick={toggleStatusDropdown}
                className="modern-status-trigger chat-gsap-action"
                aria-haspopup="listbox"
                aria-expanded={isStatusDropdownOpen}
                aria-controls="chat-status-options"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: isStatusDropdownOpen ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isStatusDropdownOpen ? '0 0 0 3px rgba(139, 92, 246, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`tag status-${activeContact.status}`} style={{ margin: 0, padding: '2px 8px', fontSize: '11px', borderRadius: '4px' }}>
                    {activeContact.status === 'new' && 'Novos Leads'}
                    {activeContact.status === 'contacted' && 'Em Contato'}
                    {activeContact.status === 'no_answer' && 'Sem Resposta'}
                    {activeContact.status === 'proposal' && 'Tem Interesse'}
                    {activeContact.status === 'won' && 'Vendas Ganhas'}
                    {activeContact.status === 'lost' && 'Perdidos'}
                  </span>
                </div>
                <ChevronDown size={14} aria-hidden="true" style={{ transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
              </button>

            </div>
            {/* END CUSTOM DROPDOWN */}

            {isStatusDropdownOpen && statusMenuPosition && typeof document !== 'undefined' && createPortal(
              <>
                <button
                  type="button"
                  aria-label="Fechar opções de fase"
                  onClick={() => setIsStatusDropdownOpen(false)}
                  className="chat-status-backdrop"
                />
                <div
                  ref={statusMenuRef}
                  id="chat-status-options"
                  className={'modern-status-menu chat-status-portal is-' + statusMenuPosition.placement}
                  role="listbox"
                  aria-label="Fase no CRM"
                  style={{
                    top: statusMenuPosition.top,
                    left: statusMenuPosition.left,
                    width: statusMenuPosition.width,
                    maxHeight: statusMenuPosition.maxHeight,
                  }}
                >
                  {[
                    { id: 'new', label: 'Novos Leads' },
                    { id: 'no_answer', label: 'Sem Resposta' },
                    { id: 'contacted', label: 'Em Contato' },
                    { id: 'proposal', label: 'Tem Interesse' },
                    { id: 'won', label: 'Vendas Ganhas' },
                    { id: 'lost', label: 'Perdidos' },
                  ].map((stage) => (
                    <button
                      type="button"
                      key={stage.id}
                      role="option"
                      aria-selected={activeContact.status === stage.id}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        changeContactStatus(activeContact.id, stage.id);
                        setIsStatusDropdownOpen(false);
                      }}
                    >
                      <span className={'tag status-' + stage.id}>
                        {stage.label}
                      </span>
                      {activeContact.status === stage.id && (
                        <CheckCheck size={14} aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>
              </>,
              document.body
            )}
          </div>

          <div className="profile-field" style={{ marginTop: '16px' }}>
            <label className="profile-field-label" htmlFor="chat-deal-value">Valor do Negócio (R$)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)', fontWeight: 'bold' }}>R$</span>
              <input
                id="chat-deal-value"
                name="deal_value"
                type="number"
                className="glass-input modern-currency-input"
                value={activeContact.value || ''}
                onChange={(e) => updateContactValue(activeContact.id, e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                autoComplete="off"
                style={{
                  paddingLeft: '38px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'var(--border-glass)',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'var(--accent-primary)'
                }}
                onFocus={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.05)'}
                onBlur={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.02)'}
              />
            </div>
          </div>
        </div>

        {/* TAGS MANAGER */}
        <div className="profile-section chat-tag-manager" style={{ display: activeContact.is_group ? 'none' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="profile-section-title" style={{ margin: 0 }}>Tags do Contato</span>
            <button
              type="button"
              onClick={() => setIsTagPanelOpen(!isTagPanelOpen)}
              className="glass-btn chat-gsap-action"
              aria-expanded={isTagPanelOpen}
              aria-controls="chat-tag-panel"
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                height: '24px',
                background: isTagPanelOpen ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                borderColor: 'var(--border-glass)'
              }}
            >
              <Tag size={10} aria-hidden="true" />
              {isTagPanelOpen ? 'Fechar' : 'Gerenciar'}
            </button>
          </div>

          {/* Active Tags list on the contact */}
          <div className="contact-tags-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            {activeContact.tags && activeContact.tags.length > 0 ? (
              activeContact.tags.map(tagName => {
                const tagColorObj = globalTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
                const color = tagColorObj ? tagColorObj.color : '#9CA3AF';
                return (
                  <TagBadge
                    key={tagName}
                    name={tagName}
                    color={color}
                    onDelete={() => handleRemoveTag(tagName)}
                  />
                );
              })
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sem tags vinculadas.</span>
            )}
          </div>

          {/* Expansible Tag Catalog & Control Panel */}
          {isTagPanelOpen && (
            <div 
              id="chat-tag-panel"
              style={{
                marginTop: '12px',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
              className="chat-tag-panel animated-fade-in"
            >
              {/* Direct tag creation panel */}
              <div 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <label htmlFor="chat-new-tag" style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600' }}>Criar Nova Tag</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    id="chat-new-tag"
                    name="new_tag"
                    type="text"
                    placeholder="Nome da etiqueta…"
                    value={newTagText}
                    onChange={(e) => setNewTagText(e.target.value)}
                    className="glass-input"
                    autoComplete="off"
                    style={{
                      fontSize: '11px',
                      padding: '6px 10px',
                      flex: 1
                    }}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const cleaned = newTagText.trim().substring(0, 24);
                      if (!cleaned) return;
                      const regex = /[<>"]/g;
                      if (regex.test(cleaned)) {
                        alert("Caracteres especiais inválidos (<, >, \") não são permitidos.");
                        return;
                      }
                      const success = await addGlobalTag(cleaned, selectedNewColor);
                      if (success) {
                        handleAddTagDirect(cleaned);
                        setNewTagText('');
                      } else {
                        alert("Esta tag já existe ou ocorreu um erro.");
                      }
                    }}
                    className="glass-btn chat-gsap-action primary"
                    style={{
                      padding: '6px 10px',
                      fontSize: '10px',
                      fontWeight: '600',
                      background: 'var(--accent-color)',
                      color: '#000',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Criar
                  </button>
                </div>
                
                {/* Color Selector circles */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Cor:</span>
                  {tagColorsPalette.map(color => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setSelectedNewColor(color)}
                      aria-label={`Selecionar cor ${color}`}
                      aria-pressed={selectedNewColor === color}
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        border: selectedNewColor === color ? '2px solid #fff' : '1px solid rgba(255, 255, 255, 0.2)',
                        cursor: 'pointer',
                        padding: 0,
                        boxShadow: selectedNewColor === color ? '0 0 6px ' + color : 'none',
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)', margin: '2px 0' }} />

              {/* Search tag catalogue */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label htmlFor="chat-tag-search" style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600' }}>Buscar & Vincular</label>
                <input
                  id="chat-tag-search"
                  name="tag_search"
                  type="search"
                  placeholder="Buscar no catálogo…"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="glass-input"
                  autoComplete="off"
                  style={{
                    fontSize: '11px',
                    padding: '6px 10px',
                    width: '100%'
                  }}
                />
              </div>

              {/* Tag Catalog List */}
              <div 
                style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  paddingRight: '4px'
                }}
              >
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Catálogo de Tags</span>
                {globalTags
                  .filter(t => !tagSearch || t.name.toLowerCase().includes(tagSearch.toLowerCase()))
                  .map(tag => {
                    const isAttached = activeContact.tags?.some(at => at.toLowerCase() === tag.name.toLowerCase());
                    const isEditing = editingTag && editingTag.name.toLowerCase() === tag.name.toLowerCase();

                    if (isEditing) {
                      return (
                        <div 
                          key={tag.name}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            padding: '8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          <input
                            name="edit_tag_name"
                            type="text"
                            value={editingTag.newName}
                            onChange={(e) => setEditingTag({ ...editingTag, newName: e.target.value })}
                            className="glass-input"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                            maxLength={24}
                            aria-label="Editar nome da etiqueta"
                            autoComplete="off"
                          />
                          
                          {/* Color Palette Selector for Editing */}
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {tagColorsPalette.map(color => (
                              <button
                                type="button"
                                key={color}
                                onClick={() => setEditingTag({ ...editingTag, color })}
                                aria-label={`Selecionar cor ${color} para a etiqueta`}
                                aria-pressed={editingTag.color === color}
                                style={{
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  backgroundColor: color,
                                  border: editingTag.color === color ? '2px solid #fff' : '1px solid rgba(255, 255, 255, 0.2)',
                                  cursor: 'pointer',
                                  padding: 0,
                                  transition: 'border-color 0.1s ease, transform 0.1s ease'
                                }}
                              />
                            ))}
                          </div>

                          <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                            <button
                              type="button"
                              onClick={handleSaveTagEdit}
                              className="glass-btn chat-gsap-action"
                              style={{
                                padding: '4px 8px',
                                fontSize: '9px',
                                flex: 1,
                                background: 'rgba(16, 185, 129, 0.2)',
                                borderColor: 'rgba(16, 185, 129, 0.4)',
                                color: '#10B981'
                              }}
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteTag(tag)}
                              className="glass-btn chat-gsap-action"
                              style={{
                                padding: '4px 8px',
                                fontSize: '9px',
                                flex: 1,
                                background: 'rgba(239, 68, 68, 0.2)',
                                borderColor: 'rgba(239, 68, 68, 0.4)',
                                color: '#EF4444'
                              }}
                            >
                              Excluir
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTag(null)}
                              className="glass-btn chat-gsap-action"
                              style={{
                                padding: '4px 8px',
                                fontSize: '9px',
                                flex: 1
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={tag.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          background: 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flex: 1
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isAttached}
                            onChange={() => {
                              if (isAttached) handleRemoveTag(tag.name);
                              else handleAddTagDirect(tag.name);
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                          <TagBadge name={tag.name} color={tag.color} />
                        </label>

                        <button
                          type="button"
                          onClick={() => setEditingTag({ name: tag.name, newName: tag.name, color: tag.color })}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            fontSize: '10px'
                          }}
                          title="Editar etiqueta"
                          aria-label={`Editar etiqueta ${tag.name}`}
                        >
                          ✎
                        </button>
                      </div>
                    );
                  })}
                {globalTags.filter(t => !tagSearch || t.name.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
                    Nenhuma tag encontrada no catálogo.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CUSTOM NOTES REPOSITORY */}
        <div className="profile-section" style={{ borderBottom: 'none', display: activeContact.is_group ? 'none' : undefined }}>
          <span className="profile-section-title">Anotações do Cliente</span>
          
          <div className="notes-input-wrapper" style={{ marginBottom: '12px' }}>
            <input
              id="chat-note-input"
              name="contact_note"
              type="text"
              className="glass-input"
              placeholder="Escrever anotação…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              style={{ fontSize: '12px', padding: '8px 12px' }}
              autoComplete="off"
              aria-label="Nova anotação do cliente"
            />
            <button type="button" onClick={handleAddNote} className="glass-btn chat-gsap-action" style={{ padding: '8px 12px' }} disabled={!noteText.trim()}>
              Salvar
            </button>
          </div>

          <div className="notes-history-list">
            {(activeContact.notes || []).map(note => (
              <div key={note.id} className="note-bubble">
                <span className="note-text">{note.text}</span>
                <div className="note-date">{note.date}</div>
              </div>
            ))}
            {(activeContact.notes || []).length === 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', display: 'block', padding: '12px' }}>
                Nenhuma anotação registrada ainda.
              </span>
            )}
          </div>
        </div>

      </aside>

      {/* GLOBAL DELETE TAG CONFIRMATION MODAL */}
      {confirmDeleteTag && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}
        className="chat-confirm-backdrop animated-fade-in"
        role="presentation"
        >
          <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-delete-tag-title"
          style={{
            background: 'rgba(20, 20, 25, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 id="chat-delete-tag-title" style={{ margin: 0, fontSize: '18px', color: '#EF4444', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ Excluir Etiqueta Globalmente
            </h3>
            <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.8)', margin: 0 }}>
              Você tem certeza que deseja excluir a etiqueta <strong>"{confirmDeleteTag.name}"</strong>?
              <br /><br />
              Esta ação é <strong>irreversível</strong> e irá removê-la permanentemente do catálogo e de todos os contatos associados no CRM (atualmente em <strong>{getContactsWithTagCount(confirmDeleteTag.name)}</strong> contatos).
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="glass-btn chat-gsap-action"
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  borderColor: 'rgba(239, 68, 68, 0.5)',
                  color: '#EF4444',
                  fontWeight: '600',
                  fontSize: '12px'
                }}
              >
                Sim, Excluir de tudo
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteTag(null)}
                className="glass-btn chat-gsap-action"
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontWeight: '600',
                  fontSize: '12px'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
