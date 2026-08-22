import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import {
  AlertCircle, Check, CheckCircle2, ChevronDown, Crown, Eye, EyeOff, KeyRound,
  Loader2, LockKeyhole, Mail, Search, Shield, ShieldCheck, Sparkles,
  UserCheck, UserPlus, Users, UserX, X,
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

const EMPTY_USER = { full_name: '', email: '', password: '', role_id: '' };
const AVAILABLE_PERMISSIONS = [
  ['view_dashboard', 'Painel Geral', 'Visualização'], ['view_chat', 'Chat Ao Vivo', 'Visualização'],
  ['view_kanban', 'Funil Comercial', 'Visualização'], ['view_calendar', 'Agenda', 'Visualização'],
  ['view_contacts', 'Contatos', 'Visualização'], ['manage_channels', 'Canais', 'Gestão'],
  ['manage_ai_agent', 'Agente de IA', 'Gestão'], ['manage_followup', 'Follow-Up', 'Gestão'],
  ['manage_users', 'Usuários e acessos', 'Gestão'], ['export_contacts', 'Exportar contatos', 'Dados'],
  ['delete_contacts', 'Excluir contatos', 'Dados'],
].map(([key, label, group]) => ({ key, label, group }));
const TABS = [{ id: 'users', label: 'Perfis', icon: Users }, { id: 'permissions', label: 'Permissões', icon: KeyRound }];

export default function UsersManager() {
  const { permissions, effectiveTenantId, isSuperAdmin, tenants } = useAuth();
  const rootRef = useRef(null);
  const modalRef = useRef(null);
  const pickerRef = useRef(null);
  const confirmRef = useRef(null);
  const firstEntranceFinished = useRef(false);
  const statusTimerRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUserData, setNewUserData] = useState(EMPTY_USER);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [actionUserId, setActionUserId] = useState('');
  const [updatingPermission, setUpdatingPermission] = useState('');
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const selectedTenant = useMemo(() => tenants.find((tenant) => tenant.id === effectiveTenantId) || null, [effectiveTenantId, tenants]);
  const tenantName = selectedTenant?.name || (isSuperAdmin ? 'Nenhum cliente selecionado' : 'Seu ambiente');
  const activeUsers = users.filter((user) => user.is_active).length;
  const inactiveUsers = users.length - activeUsers;
  const enabledPermissions = rolePermissions.filter((permission) => permission.allowed).length;
  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('pt-BR');
    return users.filter((user) => {
      const statusMatches = statusFilter === 'all' || (statusFilter === 'active' ? user.is_active : !user.is_active);
      const searchable = `${user.full_name || ''} ${user.email || ''} ${user.roles?.name || ''}`.toLocaleLowerCase('pt-BR');
      return statusMatches && (!query || searchable.includes(query));
    });
  }, [searchTerm, statusFilter, users]);

  const showStatus = useCallback((type, text) => {
    window.clearTimeout(statusTimerRef.current);
    setStatusMsg({ type, text });
    statusTimerRef.current = window.setTimeout(() => setStatusMsg({ type: '', text: '' }), 4500);
  }, []);

  const fetchData = useCallback(async () => {
    if (!effectiveTenantId) {
      setUsers([]); setRoles([]); setRolePermissions([]);
      setLoadError(isSuperAdmin ? 'Selecione um cliente na barra lateral para gerenciar os acessos.' : 'Não foi possível identificar o seu ambiente.');
      setLoading(false);
      return;
    }
    setLoading(true); setLoadError('');
    try {
      const [profilesResult, rolesResult, permissionsResult] = await Promise.all([
        supabase.from('profiles').select('*, roles(name)').eq('tenant_id', effectiveTenantId).order('full_name', { ascending: true }),
        supabase.from('roles').select('*').order('name', { ascending: true }),
        supabase.from('role_permissions').select('*'),
      ]);
      if (profilesResult.error) throw profilesResult.error;
      if (rolesResult.error) throw rolesResult.error;
      if (permissionsResult.error) throw permissionsResult.error;
      setUsers(profilesResult.data || []); setRoles(rolesResult.data || []); setRolePermissions(permissionsResult.data || []);
    } catch (error) {
      console.error('[UsersManager] Failed to load access data:', error);
      setLoadError('Não foi possível carregar os usuários e permissões. Tente novamente.');
    } finally { setLoading(false); }
  }, [effectiveTenantId, isSuperAdmin]);

  useEffect(() => {
    const fetchTimer = window.setTimeout(fetchData, 0);
    return () => window.clearTimeout(fetchTimer);
  }, [fetchData]);
  useEffect(() => () => window.clearTimeout(statusTimerRef.current), []);

  useLayoutEffect(() => {
    if (loading || !rootRef.current || firstEntranceFinished.current) return undefined;
    const root = rootRef.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .fromTo('.users-page-header', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: reduceMotion ? 0.28 : 0.58 })
        .fromTo('.users-tenant-strip', { y: 18, opacity: 0, scale: 0.985 }, { y: 0, opacity: 1, scale: 1, duration: reduceMotion ? 0.24 : 0.46 }, '-=.28')
        .fromTo('.users-metric-card', { y: 32, opacity: 0, rotateX: -8 }, { y: 0, opacity: 1, rotateX: 0, duration: reduceMotion ? 0.25 : 0.55, stagger: reduceMotion ? 0.035 : 0.09 }, '-=.2')
        .fromTo('.users-workspace', { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: reduceMotion ? 0.26 : 0.55 }, '-=.27')
        .fromTo('.users-active-panel > *', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: reduceMotion ? 0.22 : 0.42, stagger: reduceMotion ? 0.025 : 0.055 }, '-=.28');
      firstEntranceFinished.current = true;
      const xTo = gsap.quickTo('.users-cursor-glow', 'x', { duration: 0.55, ease: 'power3.out' });
      const yTo = gsap.quickTo('.users-cursor-glow', 'y', { duration: 0.55, ease: 'power3.out' });
      const onPointerMove = (event) => { xTo(event.clientX - 150); yTo(event.clientY - 150); };
      root.addEventListener('pointermove', onPointerMove);
      root._usersPointerCleanup = () => root.removeEventListener('pointermove', onPointerMove);
      if (!reduceMotion) {
        gsap.to('.users-orbit--one', { rotate: 360, duration: 24, repeat: -1, ease: 'none' });
        gsap.to('.users-orbit--two', { rotate: -360, duration: 31, repeat: -1, ease: 'none' });
      }
    }, root);
    return () => { root._usersPointerCleanup?.(); ctx.revert(); };
  }, [loading]);

  useLayoutEffect(() => {
    if (loading || !firstEntranceFinished.current || !rootRef.current) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => gsap.fromTo('.users-active-panel > *',
      { y: reduceMotion ? 7 : 18, opacity: 0 },
      { y: 0, opacity: 1, duration: reduceMotion ? 0.22 : 0.42, stagger: reduceMotion ? 0.02 : 0.05, ease: 'power3.out', clearProps: 'transform' }), rootRef);
    return () => ctx.revert();
  }, [activeTab, loading]);

  useLayoutEffect(() => {
    if (!showCreateModal || !modalRef.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo('.users-modal-backdrop', { opacity: 0 }, { opacity: 1, duration: 0.22 });
      gsap.fromTo('.users-modal-card', { y: 34, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.42, ease: 'back.out(1.55)' });
      gsap.fromTo('.users-form-field', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.32, stagger: 0.05, delay: 0.08 });
    }, modalRef);
    return () => ctx.revert();
  }, [showCreateModal]);

  useLayoutEffect(() => {
    if (!pendingUser || !confirmRef.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo('.users-confirm-backdrop', { opacity: 0 }, { opacity: 1, duration: 0.2 });
      gsap.fromTo('.users-confirm-card', { y: 24, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.38, ease: 'back.out(1.6)' });
    }, confirmRef);
    return () => ctx.revert();
  }, [pendingUser]);

  useLayoutEffect(() => {
    if (!rolePickerOpen || !pickerRef.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo('.users-role-drawer', { y: -10, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.32, ease: 'back.out(1.7)' });
      gsap.fromTo('.users-role-option', { x: -8, opacity: 0 }, { x: 0, opacity: 1, duration: 0.24, stagger: 0.035 });
    }, pickerRef);
    return () => ctx.revert();
  }, [rolePickerOpen]);

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false); setRolePickerOpen(false); setShowPassword(false); setNewUserData(EMPTY_USER); setFormErrors({});
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (rolePickerOpen) setRolePickerOpen(false);
      else if (pendingUser) setPendingUser(null);
      else if (showCreateModal) closeCreateModal();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeCreateModal, pendingUser, rolePickerOpen, showCreateModal]);

  const animatePress = (event) => gsap.fromTo(event.currentTarget, { scale: 0.97 }, { scale: 1, duration: 0.35, ease: 'back.out(2.2)' });
  const animatePrimaryActionEnter = (event) => {
    const button = event.currentTarget;
    gsap.to(button, { y: -3, scale: 1.025, duration: 0.28, ease: 'power2.out', overwrite: 'auto' });
    gsap.to(button.querySelector('svg'), { rotation: -9, scale: 1.12, duration: 0.32, ease: 'back.out(2)', overwrite: 'auto' });
    gsap.fromTo(button.querySelector('.users-action-shine'), { xPercent: -130, autoAlpha: 0 }, { xPercent: 430, autoAlpha: 0.8, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
  };
  const animatePrimaryActionLeave = (event) => {
    const button = event.currentTarget;
    gsap.to(button, { y: 0, scale: 1, duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
    gsap.to(button.querySelector('svg'), { rotation: 0, scale: 1, duration: 0.3, ease: 'power3.out', overwrite: 'auto' });
  };
  const animateMetric = (event) => {
    const card = event.currentTarget;
    gsap.to(card, { y: -5, rotateX: 2, rotateY: -2, duration: 0.3 });
    const shine = card.querySelector('.users-metric-shine');
    if (shine) gsap.fromTo(shine, { xPercent: -90, opacity: 0 }, { xPercent: 390, opacity: 0.72, duration: 0.85 });
  };
  const resetMetric = (event) => gsap.to(event.currentTarget, { y: 0, rotateX: 0, rotateY: 0, duration: 0.4, ease: 'power3.out' });

  const togglePermission = async (roleId, permissionKey, currentValue) => {
    if (updatingPermission) return;
    const mutationKey = `${roleId}:${permissionKey}`;
    const nextValue = !currentValue;
    setUpdatingPermission(mutationKey);
    setRolePermissions((current) => {
      const existing = current.find((entry) => entry.role_id === roleId && entry.permission_key === permissionKey);
      if (existing) return current.map((entry) => entry === existing ? { ...entry, allowed: nextValue } : entry);
      return [...current, { role_id: roleId, permission_key: permissionKey, allowed: nextValue }];
    });
    try {
      const { error } = await supabase.from('role_permissions').upsert({ role_id: roleId, permission_key: permissionKey, allowed: nextValue }, { onConflict: 'role_id,permission_key' });
      if (error) throw error;
      showStatus('success', 'Permissão atualizada com sucesso.');
    } catch (error) {
      console.error('[UsersManager] Failed to update permission:', error);
      showStatus('error', 'Não foi possível atualizar a permissão. A alteração foi desfeita.');
      await fetchData();
    } finally { setUpdatingPermission(''); }
  };

  const executeUserStatusChange = async () => {
    if (!pendingUser || !effectiveTenantId) return;
    const webhookUrl = import.meta.env.VITE_N8N_ADMIN_WEBHOOK_URL;
    if (!webhookUrl) { showStatus('error', 'O fluxo administrativo ainda não foi configurado neste ambiente.'); setPendingUser(null); return; }
    setActionUserId(pendingUser.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sessão expirada');
      const response = await fetch(webhookUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: pendingUser.is_active ? 'deactivate' : 'activate', target_user_id: pendingUser.id, tenant_id: effectiveTenantId }),
      });
      if (!response.ok) throw new Error('Falha no fluxo administrativo');
      setUsers((current) => current.map((user) => user.id === pendingUser.id ? { ...user, is_active: !pendingUser.is_active } : user));
      showStatus('success', `Usuário ${pendingUser.is_active ? 'desativado' : 'ativado'} com sucesso.`);
      window.setTimeout(fetchData, 2000);
    } catch (error) {
      console.error('[UsersManager] Failed to update user status:', error);
      showStatus('error', 'Não foi possível alterar o status do usuário.');
    } finally { setActionUserId(''); setPendingUser(null); }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!newUserData.full_name.trim()) errors.full_name = 'Informe o nome completo.';
    if (!/^\S+@\S+\.\S+$/.test(newUserData.email.trim())) errors.email = 'Informe um e-mail válido.';
    if (newUserData.password.length < 6) errors.password = 'A senha precisa ter ao menos 6 caracteres.';
    if (!newUserData.role_id) errors.role_id = 'Escolha o perfil de acesso.';
    if (Object.keys(errors).length) { setFormErrors(errors); return; }
    const webhookUrl = import.meta.env.VITE_N8N_ADMIN_WEBHOOK_URL;
    if (!webhookUrl || !effectiveTenantId) { setFormErrors({ form: !effectiveTenantId ? 'Selecione um cliente antes de criar um usuário.' : 'O fluxo administrativo não foi configurado.' }); return; }
    setIsSubmitting(true); setFormErrors({});
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sessão expirada');
      const response = await fetch(webhookUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'create', userData: { ...newUserData, full_name: newUserData.full_name.trim(), email: newUserData.email.trim().toLowerCase(), tenant_id: effectiveTenantId } }),
      });
      if (!response.ok) throw new Error('Falha no fluxo administrativo');
      closeCreateModal(); showStatus('success', 'Usuário criado e vinculado ao cliente selecionado.'); window.setTimeout(fetchData, 2000);
    } catch (error) {
      console.error('[UsersManager] Failed to create user:', error);
      setFormErrors({ form: 'Não foi possível criar o usuário. Verifique os dados e tente novamente.' });
    } finally { setIsSubmitting(false); }
  };

  if (!permissions.manage_users) return (
    <main className="users-access-denied"><span><AlertCircle size={30} /></span><p className="users-overline">Acesso restrito</p><h1>Você não possui permissão para gerenciar usuários.</h1><p>Peça a um administrador para liberar “Usuários e acessos” no seu perfil.</p></main>
  );

  const metrics = [
    ['Perfis no cliente', users.length, 'cadastros vinculados', Users, 'blue'],
    ['Usuários ativos', activeUsers, 'com acesso liberado', UserCheck, 'mint'],
    ['Acessos pausados', inactiveUsers, 'sem acesso ao CRM', UserX, 'cyan'],
    ['Regras liberadas', enabledPermissions, `em ${roles.length} perfis de acesso`, KeyRound, 'lime'],
  ];

  return (
    <main ref={rootRef} className={`content-wrapper users-page ${loading ? 'is-loading' : 'is-ready'}`} aria-busy={loading}>
      <div className="users-cursor-glow" aria-hidden="true" /><div className="users-orbit users-orbit--one" aria-hidden="true" /><div className="users-orbit users-orbit--two" aria-hidden="true" />
      {loading && <div className="users-loading-overlay" role="status" aria-live="polite"><span><ShieldCheck size={25} /></span><strong>Preparando acessos…</strong><small>Validando perfis e permissões do cliente</small></div>}
      <header className="users-page-header">
        <div><span className="users-overline"><Sparkles size={12} /> Governança inteligente</span><h1>Usuários &amp; Acessos</h1><p>Organize perfis, controle permissões e mantenha cada cliente em seu próprio ambiente.</p></div>
        <button type="button" className="users-primary-action users-primary-action--animated" onPointerEnter={animatePrimaryActionEnter} onPointerLeave={animatePrimaryActionLeave} onClick={(event) => { animatePress(event); setShowCreateModal(true); }} disabled={!effectiveTenantId}><span className="users-action-shine" aria-hidden="true" /><UserPlus size={17} aria-hidden="true" /><span>Novo usuário</span></button>
      </header>
      <section className="users-tenant-strip" aria-label="Isolamento do cliente atual">
        <span className="users-tenant-icon"><LockKeyhole size={20} /></span><div><small>Ambiente protegido</small><strong>{tenantName}</strong><p>Perfis e ações desta tela ficam vinculados ao cliente selecionado.</p></div><span className="users-tenant-badge"><ShieldCheck size={14} /> Isolamento ativo</span>
      </section>
      <section className="users-metrics" aria-label="Resumo de acessos">
        {metrics.map(([label, value, detail, Icon, tone]) => <article key={label} className={`users-metric-card is-${tone}`} onPointerEnter={animateMetric} onPointerLeave={resetMetric}><span className="users-metric-shine" /><span className="users-metric-icon"><Icon size={18} /></span><small>{label}</small><strong>{value}</strong><p>{detail}</p></article>)}
      </section>
      <section className="users-workspace">
        <div className="users-tabs" role="tablist" aria-label="Gestão de acessos">
          {TABS.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} aria-controls={`users-panel-${id}`} id={`users-tab-${id}`} className={activeTab === id ? 'is-active' : ''} onClick={(event) => { animatePress(event); setActiveTab(id); }}><Icon size={16} /> {label}<span>{id === 'users' ? users.length : AVAILABLE_PERMISSIONS.length}</span></button>)}
        </div>
        {loadError ? <div className="users-empty-state" role="alert"><AlertCircle size={26} /><h2>Não foi possível abrir este ambiente</h2><p>{loadError}</p>{effectiveTenantId && <button type="button" className="users-secondary-action" onClick={fetchData}>Tentar novamente</button>}</div> : activeTab === 'users' ? (
          <div className="users-active-panel" id="users-panel-users" role="tabpanel" aria-labelledby="users-tab-users">
            <div className="users-toolbar">
              <label className="users-search" htmlFor="users-search-input"><Search size={17} /><input id="users-search-input" type="search" name="user-search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por nome, e-mail ou perfil…" autoComplete="off" /></label>
              <div className="users-status-filter" aria-label="Filtrar usuários por status">{[['all', 'Todos'], ['active', 'Ativos'], ['inactive', 'Pausados']].map(([value, label]) => <button key={value} type="button" className={statusFilter === value ? 'is-active' : ''} onClick={(event) => { animatePress(event); setStatusFilter(value); }}>{label}</button>)}</div>
            </div>
            <div className="users-list-heading"><div><small>Equipe do cliente</small><h2>Perfis cadastrados</h2></div><span>{filteredUsers.length} de {users.length}</span></div>
            {filteredUsers.length ? <div className="users-table-wrap"><table className="users-table"><thead><tr><th>Usuário</th><th>Perfil</th><th>Status</th><th className="is-right">Ação</th></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.id} className="users-profile-row"><td><div className="users-profile-cell"><span className="users-avatar">{(user.full_name || user.email || '?').trim().slice(0, 2).toUpperCase()}</span><div><strong>{user.full_name || 'Usuário sem nome'}</strong><small><Mail size={12} /> {user.email || 'E-mail protegido'}</small></div></div></td><td><span className="users-role-pill">{user.roles?.name || 'Sem papel'}</span></td><td><span className={`users-status-pill ${user.is_active ? 'is-active' : 'is-inactive'}`}><i />{user.is_active ? 'Ativo' : 'Pausado'}</span></td><td className="is-right"><button type="button" className={`users-status-action ${user.is_active ? 'is-danger' : 'is-success'}`} onClick={(event) => { animatePress(event); setPendingUser(user); }} disabled={actionUserId === user.id}>{actionUserId === user.id ? <Loader2 className="animate-spin" size={15} /> : user.is_active ? <UserX size={15} /> : <UserCheck size={15} />}{user.is_active ? 'Pausar acesso' : 'Reativar'}</button></td></tr>)}</tbody></table></div> : <div className="users-empty-list"><Search size={24} /><strong>Nenhum perfil encontrado</strong><p>Ajuste a busca ou o filtro de status.</p></div>}
          </div>
        ) : (
          <div className="users-active-panel" id="users-panel-permissions" role="tabpanel" aria-labelledby="users-tab-permissions">
            <div className="users-permission-intro"><div><small>Controle por função</small><h2>Matriz de permissões</h2><p>Defina o que cada perfil pode visualizar ou gerenciar no CRM.</p></div><span><Crown size={15} /> Administrador sempre protegido</span></div>
            <div className="users-permission-table-wrap"><table className="users-permission-table"><thead><tr><th>Área do sistema</th>{roles.map((role) => <th key={role.id}>{role.name}</th>)}</tr></thead><tbody>{AVAILABLE_PERMISSIONS.map((permission) => <tr key={permission.key}><td><span>{permission.group}</span><strong>{permission.label}</strong><code>{permission.key}</code></td>{roles.map((role) => { const entry = rolePermissions.find((item) => item.role_id === role.id && item.permission_key === permission.key); const allowed = Boolean(entry?.allowed); const locked = role.name?.toLowerCase() === 'admin'; const mutationKey = `${role.id}:${permission.key}`; return <td key={role.id}><button type="button" role="switch" aria-checked={allowed} aria-label={`${allowed ? 'Desativar' : 'Ativar'} ${permission.label} para ${role.name}`} className={`users-permission-switch ${allowed ? 'is-on' : ''} ${locked ? 'is-locked' : ''}`} disabled={locked || Boolean(updatingPermission)} onClick={(event) => { animatePress(event); togglePermission(role.id, permission.key, allowed); }}><span>{updatingPermission === mutationKey ? <Loader2 className="animate-spin" size={12} /> : allowed ? <Check size={12} /> : null}</span></button></td>; })}</tr>)}</tbody></table></div>
          </div>
        )}
      </section>
      <div className={`users-toast ${statusMsg.type ? 'is-visible' : ''} is-${statusMsg.type}`} role="status" aria-live="polite">{statusMsg.type === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}<span>{statusMsg.text}</span></div>

      {showCreateModal && <div ref={modalRef} className="users-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCreateModal(); }}><section className="users-modal-card" role="dialog" aria-modal="true" aria-labelledby="users-create-title">
        <button type="button" className="users-icon-button users-modal-close" onClick={closeCreateModal} aria-label="Fechar criação de usuário"><X size={18} /></button><span className="users-modal-icon"><UserPlus size={22} /></span><p className="users-overline">Novo acesso</p><h2 id="users-create-title">Criar usuário</h2><p className="users-modal-description">O novo perfil será vinculado exclusivamente a <strong>{tenantName}</strong>.</p>
        <form onSubmit={handleCreateUser} noValidate>{formErrors.form && <div className="users-form-alert" role="alert"><AlertCircle size={16} />{formErrors.form}</div>}
          <div className="users-form-field"><label htmlFor="new-user-name">Nome completo</label><input id="new-user-name" name="name" type="text" autoComplete="name" value={newUserData.full_name} onChange={(event) => setNewUserData((current) => ({ ...current, full_name: event.target.value }))} aria-invalid={Boolean(formErrors.full_name)} placeholder="Ex.: João Silva" />{formErrors.full_name && <small className="users-field-error">{formErrors.full_name}</small>}</div>
          <div className="users-form-field"><label htmlFor="new-user-email">E-mail</label><input id="new-user-email" name="email" type="email" autoComplete="email" value={newUserData.email} onChange={(event) => setNewUserData((current) => ({ ...current, email: event.target.value }))} aria-invalid={Boolean(formErrors.email)} placeholder="joao@empresa.com" />{formErrors.email && <small className="users-field-error">{formErrors.email}</small>}</div>
          <div className="users-form-field"><label htmlFor="new-user-password">Senha provisória</label><div className="users-password-field"><input id="new-user-password" name="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={newUserData.password} onChange={(event) => setNewUserData((current) => ({ ...current, password: event.target.value }))} aria-invalid={Boolean(formErrors.password)} placeholder="Mínimo de 6 caracteres" /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{formErrors.password ? <small className="users-field-error">{formErrors.password}</small> : <small>O usuário poderá alterar a senha no primeiro acesso.</small>}</div>
          <div className="users-form-field" ref={pickerRef}><label id="new-user-role-label">Perfil de acesso</label><button type="button" className={`users-role-trigger ${rolePickerOpen ? 'is-open' : ''}`} aria-labelledby="new-user-role-label" aria-haspopup="listbox" aria-expanded={rolePickerOpen} onClick={(event) => { animatePress(event); setRolePickerOpen((current) => !current); }}><span><Shield size={16} />{roles.find((role) => role.id === newUserData.role_id)?.name || 'Selecione um perfil'}</span><ChevronDown size={17} /></button>{rolePickerOpen && <div className="users-role-drawer" role="listbox" aria-labelledby="new-user-role-label">{roles.map((role) => { const selected = newUserData.role_id === role.id; return <button key={role.id} type="button" role="option" aria-selected={selected} className={`users-role-option ${selected ? 'is-selected' : ''}`} onClick={() => { setNewUserData((current) => ({ ...current, role_id: role.id })); setRolePickerOpen(false); }}><span><ShieldCheck size={16} /><strong>{role.name}</strong></span>{selected && <Check size={16} />}</button>; })}</div>}{formErrors.role_id && <small className="users-field-error">{formErrors.role_id}</small>}</div>
          <div className="users-modal-actions"><button type="button" className="users-secondary-action" onClick={closeCreateModal}>Cancelar</button><button type="submit" className="users-primary-action" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" size={17} /> : <UserPlus size={17} />}{isSubmitting ? 'Criando…' : 'Criar e convidar'}</button></div>
        </form>
      </section></div>}

      {pendingUser && <div ref={confirmRef} className="users-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !actionUserId) setPendingUser(null); }}><section className="users-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="users-confirm-title" aria-describedby="users-confirm-description"><span className={pendingUser.is_active ? 'is-danger' : 'is-success'}>{pendingUser.is_active ? <UserX size={23} /> : <UserCheck size={23} />}</span><h2 id="users-confirm-title">{pendingUser.is_active ? 'Pausar acesso?' : 'Reativar usuário?'}</h2><p id="users-confirm-description">{pendingUser.is_active ? `${pendingUser.full_name || 'Este usuário'} perderá o acesso ao CRM até ser reativado.` : `${pendingUser.full_name || 'Este usuário'} voltará a acessar os dados deste cliente.`}</p><div><button type="button" className="users-secondary-action" onClick={() => setPendingUser(null)} disabled={Boolean(actionUserId)}>Cancelar</button><button type="button" className={`users-confirm-action ${pendingUser.is_active ? 'is-danger' : 'is-success'}`} onClick={executeUserStatusChange} disabled={Boolean(actionUserId)}>{actionUserId ? <Loader2 className="animate-spin" size={16} /> : pendingUser.is_active ? <UserX size={16} /> : <UserCheck size={16} />}{actionUserId ? 'Processando…' : pendingUser.is_active ? 'Pausar acesso' : 'Reativar'}</button></div></section></div>}
    </main>
  );
}
