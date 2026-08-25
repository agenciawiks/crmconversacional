import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useCrm } from '../context/CrmContext';
import { useAuth } from '../context/AuthContext';
import { resolveUserDisplayName } from '../utils/userIdentity';
import {
  Bell, BellOff, Bot, Building2, Calendar, Check, ChevronDown, ChevronRight,
  Clock, Kanban, LayoutDashboard, Link2, LogOut, Menu, MessageSquare,
  Moon, PanelLeftClose, RotateCw, Shield, Sun, Users, Volume2, VolumeX,
  Wifi, WifiOff, X
} from 'lucide-react';

const NAVIGATION_GROUPS = [
  {
    label: 'Visão Geral',
    items: [
      { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard, permission: 'view_dashboard' },
      { id: 'chat', label: 'Chat Ao Vivo', icon: MessageSquare, permission: 'view_chat' }
    ]
  },
  {
    label: 'Comercial',
    items: [
      { id: 'kanban', label: 'Funil Comercial', icon: Kanban, permission: 'view_kanban' },
      { id: 'calendar', label: 'Agenda', icon: Calendar, permission: 'view_calendar' },
      { id: 'contacts', label: 'Leads & Contatos', icon: Users, permission: 'view_contacts' }
    ]
  },
  {
    label: 'Automação',
    items: [
      { id: 'builder', label: 'Agente de IA', icon: Bot, permission: 'manage_ai_agent' },
      { id: 'followup', label: 'Follow-Up', icon: Clock, permission: 'manage_followup' },
      { id: 'channels', label: 'Conectar Canais', icon: Link2, permission: 'manage_channels' }
    ]
  },
  {
    label: 'Gestão',
    items: [
      { id: 'users', label: 'Usuários & Acessos', icon: Shield, permission: 'manage_users' },
      { id: 'provision', label: 'Novo Cliente', icon: Building2, superAdminOnly: true }
    ]
  }
];

export default function Sidebar() {
  const sidebarRef = useRef(null);
  const tenantPickerRef = useRef(null);
  const tenantDrawerRef = useRef(null);
  const {
    activeScreen, setActiveScreen, theme, toggleTheme,
    soundEnabled, setSoundEnabled, notificationsEnabled, setNotificationsEnabled, requestNotificationPermission,
    realtimeStatus, reconnectRealtime
  } = useCrm();
  const {
    user,
    profile,
    permissions,
    tenants,
    selectedTenantId,
    isSuperAdmin,
    switchTenant,
    signOut
  } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('crm_sidebar_collapsed') === 'true');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const [tenantPickerOpen, setTenantPickerOpen] = useState(false);
  const displayName = resolveUserDisplayName(profile, user);
  const displayInitials = (displayName || 'UA').substring(0, 2).toUpperCase();
  const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
  const tenantName = selectedTenant?.name || selectedTenant?.slug || 'Selecionar cliente';

  const canViewItem = (item) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.permission && permissions && permissions[item.permission] !== true) return false;
    return true;
  };

  const visibleGroups = NAVIGATION_GROUPS
    .map((group) => ({ ...group, items: group.items.filter(canViewItem) }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)');
    const handleViewportChange = (event) => {
      setIsMobileViewport(event.matches);
      if (!event.matches) setIsMobileOpen(false);
    };
    mediaQuery.addEventListener('change', handleViewportChange);
    return () => mediaQuery.removeEventListener('change', handleViewportChange);
  }, []);

  useEffect(() => {
    if (!isMobileOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsMobileOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isMobileOpen]);

  useEffect(() => {
    if (!tenantPickerOpen) return undefined;
    const handleOutsidePointer = (event) => {
      if (!tenantPickerRef.current?.contains(event.target)) setTenantPickerOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setTenantPickerOpen(false);
    };
    document.addEventListener('pointerdown', handleOutsidePointer);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [tenantPickerOpen]);

  useLayoutEffect(() => {
    if (!tenantPickerOpen || !tenantDrawerRef.current) return undefined;
    const context = gsap.context(() => {
      gsap.fromTo(tenantDrawerRef.current, { y: -10, autoAlpha: 0, scale: .96 }, { y: 0, autoAlpha: 1, scale: 1, duration: .34, ease: 'back.out(1.7)' });
      gsap.fromTo('.crm-sidebar-tenant-option', { x: -9, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .25, stagger: .035, delay: .04, ease: 'power2.out' });
    }, tenantPickerRef);
    return () => context.revert();
  }, [tenantPickerOpen]);

  useLayoutEffect(() => {
    const root = sidebarRef.current;
    if (!root) return undefined;

    const context = gsap.context(() => {
      const brand = root.querySelector('.crm-sidebar-brand');
      const tenant = root.querySelector('.crm-sidebar-tenant');
      const navItems = root.querySelectorAll('.crm-sidebar-nav-item');
      const footerItems = root.querySelectorAll('.crm-sidebar-footer > *');
      const connectingDot = root.querySelector('.crm-sidebar-status-dot.is-connecting');
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (brand) timeline.from(brand, { x: -22, autoAlpha: 0, duration: 0.48, clearProps: 'transform,opacity,visibility' }, 0);
      if (tenant) timeline.from(tenant, { x: -18, autoAlpha: 0, duration: 0.42, clearProps: 'transform,opacity,visibility' }, 0.12);
      if (navItems.length) timeline.from(navItems, { x: -18, autoAlpha: 0, duration: 0.38, stagger: 0.045, clearProps: 'transform,opacity,visibility' }, 0.16);
      if (footerItems.length) timeline.from(footerItems, { y: 14, autoAlpha: 0, duration: 0.4, stagger: 0.07, clearProps: 'transform,opacity,visibility' }, 0.34);

      if (connectingDot) {
        gsap.to(connectingDot, {
          scale: 1.55,
          autoAlpha: 0.45,
          duration: 0.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut'
        });
      }
    }, root);

    return () => context.revert();
  }, []);

  useLayoutEffect(() => {
    const activeItem = sidebarRef.current?.querySelector('.crm-sidebar-nav-item.is-active');
    if (!activeItem) return undefined;

    const tween = gsap.fromTo(
      activeItem,
      { x: -4, scale: 0.985 },
      { x: 0, scale: 1, duration: 0.34, ease: 'back.out(1.7)', clearProps: 'transform' }
    );
    return () => tween.kill();
  }, [activeScreen]);

  const toggleCollapsed = () => {
    setIsCollapsed((current) => {
      const next = !current;
      localStorage.setItem('crm_sidebar_collapsed', String(next));
      return next;
    });
  };

  const navigateTo = (screen) => {
    setActiveScreen(screen);
    setIsMobileOpen(false);
    setTenantPickerOpen(false);
  };

  const toggleTenantPicker = () => {
    if (isCollapsed && !isMobileViewport) {
      setIsCollapsed(false);
      localStorage.setItem('crm_sidebar_collapsed', 'false');
    }
    setTenantPickerOpen((current) => !current);
  };

  const selectTenant = (tenantId) => {
    if (tenantId && tenantId !== selectedTenantId) switchTenant(tenantId);
    setTenantPickerOpen(false);
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      await requestNotificationPermission();
      return;
    }
    setNotificationsEnabled(false);
  };

  const realtimeCopy = realtimeStatus === 'connected'
    ? { label: 'Tempo real ativo', detail: 'WebSocket', icon: Wifi }
    : realtimeStatus === 'connecting'
      ? { label: 'Reconectando…', detail: 'Sincronizando', icon: RotateCw }
      : { label: 'Sem tempo real', detail: 'Polling ativo', icon: WifiOff };
  const RealtimeIcon = realtimeCopy.icon;

  return (
    <>
      <button
        type="button"
        className="crm-mobile-sidebar-trigger"
        aria-label={isMobileOpen ? 'Fechar menu principal' : 'Abrir menu principal'}
        aria-expanded={isMobileOpen}
        aria-controls="crm-primary-sidebar"
        onClick={() => setIsMobileOpen((current) => !current)}
      >
        {isMobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
      </button>

      <button
        type="button"
        className={`crm-sidebar-backdrop ${isMobileOpen ? 'is-visible' : ''}`}
        aria-label="Fechar menu principal"
        tabIndex={isMobileOpen ? 0 : -1}
        onClick={() => setIsMobileOpen(false)}
      />

      <aside
        id="crm-primary-sidebar"
        ref={sidebarRef}
        className={`crm-sidebar ${isCollapsed ? 'is-collapsed' : ''} ${isMobileOpen ? 'is-mobile-open' : ''}`}
        aria-label="Navegação principal"
        aria-hidden={isMobileViewport && !isMobileOpen ? true : undefined}
        inert={isMobileViewport && !isMobileOpen ? true : undefined}
      >
        <header className="crm-sidebar-brand">
          <div className="crm-sidebar-logo-shell">
            <img src="/logo-mess.svg" alt="CRM Mess" width="38" height="38" />
          </div>
          <div className="crm-sidebar-brand-copy">
            <strong translate="no">CRM Mess</strong>
            <span>Conversacional</span>
          </div>
          <button
            type="button"
            className="crm-sidebar-collapse"
            aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-expanded={!isCollapsed}
            onClick={toggleCollapsed}
          >
            {isCollapsed ? <ChevronRight size={17} aria-hidden="true" /> : <PanelLeftClose size={17} aria-hidden="true" />}
          </button>
          <button type="button" className="crm-sidebar-mobile-close" aria-label="Fechar menu principal" onClick={() => setIsMobileOpen(false)}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {isSuperAdmin && (
          <section ref={tenantPickerRef} className={`crm-sidebar-tenant ${tenantPickerOpen ? 'is-open' : ''}`} aria-label="Cliente em visualização">
            <div className="crm-sidebar-tenant-heading">
              <span><Building2 size={14} aria-hidden="true" />Cliente em visualização</span>
              <em>Superadmin</em>
            </div>
            <button
              type="button"
              id="superadmin-tenant-selector"
              className="crm-sidebar-tenant-trigger"
              aria-label="Selecionar cliente em visualização"
              aria-haspopup="listbox"
              aria-expanded={tenantPickerOpen}
              aria-controls="superadmin-tenant-options"
              onClick={toggleTenantPicker}
            >
              <span className="crm-sidebar-tenant-trigger-icon"><Building2 size={15} aria-hidden="true" /></span>
              <span className="crm-sidebar-tenant-trigger-copy"><strong>{tenantName}</strong><small>{selectedTenant?.slug || 'Ambiente do cliente'}</small></span>
              <ChevronDown size={15} aria-hidden="true" />
            </button>
            <button type="button" className="crm-sidebar-tenant-compact" title={tenantName} aria-label={`Trocar cliente: ${tenantName}`} aria-haspopup="listbox" aria-expanded={tenantPickerOpen} onClick={toggleTenantPicker}><Building2 size={18} aria-hidden="true" /></button>
            {tenantPickerOpen && (
              <div ref={tenantDrawerRef} id="superadmin-tenant-options" className="crm-sidebar-tenant-drawer" role="listbox" aria-label="Clientes disponíveis">
                <div className="crm-sidebar-tenant-drawer-header"><span>Trocar ambiente</span><strong>{tenants.length} {tenants.length === 1 ? 'cliente' : 'clientes'}</strong></div>
                <div className="crm-sidebar-tenant-options">
                  {tenants.length === 0 ? <p>Nenhum cliente encontrado.</p> : tenants.map((tenant) => {
                    const isSelected = tenant.id === selectedTenantId;
                    const name = tenant.name || tenant.slug || tenant.id;
                    return (
                      <button key={tenant.id} type="button" role="option" aria-selected={isSelected} className={`crm-sidebar-tenant-option ${isSelected ? 'is-selected' : ''}`} onClick={() => selectTenant(tenant.id)}>
                        <span>{name.slice(0, 2).toUpperCase()}</span>
                        <span><strong>{name}</strong><small>{tenant.slug || tenant.plan || 'Cliente CRM'}</small></span>
                        {isSelected && <Check size={15} aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        <nav className="crm-sidebar-nav" aria-label="Áreas do CRM">
          {visibleGroups.map((group) => (
            <section className="crm-sidebar-nav-group" key={group.label} aria-label={group.label}>
              <span className="crm-sidebar-nav-heading">{group.label}</span>
              <div className="crm-sidebar-nav-list">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeScreen === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`crm-sidebar-nav-item ${isActive ? 'is-active' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={isCollapsed ? item.label : undefined}
                      title={isCollapsed ? item.label : undefined}
                      onClick={() => navigateTo(item.id)}
                    >
                      <span className="crm-sidebar-nav-icon"><Icon size={18} strokeWidth={2} aria-hidden="true" /></span>
                      <span className="crm-sidebar-nav-label">{item.label}</span>
                      <ChevronRight className="crm-sidebar-nav-arrow" size={14} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <footer className="crm-sidebar-footer">
          <div className="crm-sidebar-quick-controls" aria-label="Preferências rápidas">
            <button
              type="button"
              className={soundEnabled ? 'is-enabled' : 'is-disabled'}
              aria-label={soundEnabled ? 'Desativar alertas sonoros' : 'Ativar alertas sonoros'}
              aria-pressed={soundEnabled}
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
              <span className="crm-sidebar-control-label">{soundEnabled ? 'Som ativo' : 'Sem som'}</span>
            </button>
            <button
              type="button"
              className={notificationsEnabled ? 'is-enabled' : 'is-disabled'}
              aria-label={notificationsEnabled ? 'Desativar notificações' : 'Ativar notificações'}
              aria-pressed={notificationsEnabled}
              onClick={toggleNotifications}
            >
              {notificationsEnabled ? <Bell size={16} aria-hidden="true" /> : <BellOff size={16} aria-hidden="true" />}
              <span className="crm-sidebar-control-label">{notificationsEnabled ? 'Notificações' : 'Sem notificações'}</span>
            </button>
            <button
              type="button"
              className="is-enabled"
              aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
              <span className="crm-sidebar-control-label">{theme === 'dark' ? 'Tema escuro' : 'Tema claro'}</span>
            </button>
          </div>

          <div className={`crm-sidebar-realtime is-${realtimeStatus}`} role="status" aria-live="polite">
            <span className={`crm-sidebar-status-dot is-${realtimeStatus}`} aria-hidden="true" />
            <span className="crm-sidebar-realtime-icon"><RealtimeIcon size={15} aria-hidden="true" /></span>
            <span className="crm-sidebar-realtime-copy"><strong>{realtimeCopy.label}</strong><small>{realtimeCopy.detail}</small></span>
            {realtimeStatus === 'disconnected' && (
              <button type="button" aria-label="Reconectar tempo real" title="Reconectar tempo real" onClick={reconnectRealtime}>
                <RotateCw size={13} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="crm-sidebar-account">
            <span className="crm-sidebar-avatar" aria-hidden="true">{displayInitials}</span>
            <span className="crm-sidebar-account-copy">
              <strong title={displayName}>{displayName}</strong>
              <small><i />Conta conectada</small>
            </span>
            <button type="button" className="crm-sidebar-logout" aria-label="Sair da conta" title="Sair da conta" onClick={signOut}>
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}
