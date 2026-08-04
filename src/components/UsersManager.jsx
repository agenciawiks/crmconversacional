import { useCallback, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Shield, UserPlus, Loader2, AlertCircle, X } from 'lucide-react';

export default function UsersManager() {
  const {
    permissions,
    effectiveTenantId,
    isSuperAdmin,
    tenants
  } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserData, setNewUserData] = useState({ full_name: '', email: '', password: '', role_id: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Available permissions to manage
  const availablePermissions = [
    { key: 'view_dashboard', label: 'Painel Geral' },
    { key: 'view_chat', label: 'Chat Ao Vivo' },
    { key: 'view_kanban', label: 'Funil Comercial' },
    { key: 'view_calendar', label: 'Agenda' },
    { key: 'view_contacts', label: 'Contatos' },
    { key: 'manage_channels', label: 'Canais' },
    { key: 'manage_ai_agent', label: 'Agente IA' },
    { key: 'manage_followup', label: 'Follow-Up' },
    { key: 'manage_users', label: 'Gestão de Usuários' },
    { key: 'export_contacts', label: 'Exportar Contatos' },
    { key: 'delete_contacts', label: 'Excluir Contatos' }
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch users
      let profilesQuery = supabase
        .from('profiles')
        .select('*, roles(name)');

      if (effectiveTenantId) {
        profilesQuery = profilesQuery.eq('tenant_id', effectiveTenantId);
      }

      const { data: profiles } = await profilesQuery;
      
      // Fetch roles
      const { data: dbRoles } = await supabase
        .from('roles')
        .select('*');
        
      // Fetch role_permissions
      const { data: dbRolePerms } = await supabase
        .from('role_permissions')
        .select('*');

      setUsers(profiles || []);
      setRoles(dbRoles || []);
      setRolePermissions(dbRolePerms || []);
    } catch(err) {
      console.error("Error fetching users data:", err);
    }
    setLoading(false);
  }, [effectiveTenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const togglePermission = async (roleId, permKey, currentVal) => {
    const newVal = !currentVal;
    
    // Optimistic update
    setRolePermissions(prev => {
      const exists = prev.find(rp => rp.role_id === roleId && rp.permission_key === permKey);
      if (exists) {
        return prev.map(rp => rp.id === exists.id ? { ...rp, allowed: newVal } : rp);
      }
      return [...prev, { role_id: roleId, permission_key: permKey, allowed: newVal }];
    });

    try {
      // Upsert into DB
      const { error } = await supabase
        .from('role_permissions')
        .upsert({
          role_id: roleId,
          permission_key: permKey,
          allowed: newVal
        }, { onConflict: 'role_id,permission_key' });
        
      if (error) throw error;
    } catch (err) {
      console.error("Error toggling permission:", err);
      fetchData(); // revert
    }
  };

  const handleDeactivate = async (userId, currentState) => {
    // Call N8N Webhook for user management
    const webhookUrl = import.meta.env.VITE_N8N_ADMIN_WEBHOOK_URL;
    if (!webhookUrl) {
      alert("Configuração VITE_N8N_ADMIN_WEBHOOK_URL não encontrada no .env.local (Crie o workflow no n8n primeiro)");
      return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: currentState ? 'deactivate' : 'activate',
          target_user_id: userId,
          tenant_id: effectiveTenantId
        })
      });
      
      if (!res.ok) throw new Error("Falha no webhook");
      alert("Ação enviada com sucesso ao administrador (n8n). Aguarde a atualização.");
      setTimeout(fetchData, 2000);
    } catch (err) {
      console.error(err);
      alert("Erro ao executar ação via n8n.");
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const webhookUrl = import.meta.env.VITE_N8N_ADMIN_WEBHOOK_URL;
    if (!webhookUrl) {
      alert("Configuração VITE_N8N_ADMIN_WEBHOOK_URL não encontrada. Crie o webhook no n8n primeiro.");
      return;
    }

    if (!newUserData.full_name || !newUserData.email || !newUserData.password || !newUserData.role_id) {
      alert("Preencha todos os campos.");
      return;
    }

    setIsSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'create',
          userData: {
            ...newUserData,
            tenant_id: effectiveTenantId
          }
        })
      });
      
      if (!res.ok) throw new Error("Falha no webhook");
      alert("Usuário criado com sucesso via n8n!");
      setShowCreateModal(false);
      setNewUserData({ full_name: '', email: '', password: '', role_id: '' });
      setTimeout(fetchData, 2000);
    } catch (err) {
      console.error(err);
      alert("Erro ao criar usuário via n8n.");
    }
    setIsSubmitting(false);
  };

  if (!permissions.manage_users) {
    return (
      <div className="flex-center" style={{ height: '100%', color: 'var(--color-status-lost)' }}>
        <AlertCircle size={48} />
        <h2>Acesso Negado</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto', background: 'var(--bg-primary)' }}>
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={24} style={{ color: 'var(--accent-primary)' }} />
            Gestão de Acessos
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Controle de usuários e permissões RBAC
            {isSuperAdmin
              ? ` — ${tenants.find(tenant => tenant.id === effectiveTenantId)?.name || 'cliente selecionado'}`
              : ''}.
          </p>
        </div>
      </div>

      {loading ? (
        <Loader2 className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Matriz de Permissões */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Matriz de Permissões</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <th style={{ padding: '12px' }}>Permissão</th>
                    {roles.map(r => (
                      <th key={r.id} style={{ padding: '12px', textAlign: 'center' }}>
                        {r.name.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {availablePermissions.map(perm => (
                    <tr key={perm.key} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                      <td style={{ padding: '12px' }}>{perm.label} <small style={{color:'var(--text-muted)'}}>({perm.key})</small></td>
                      {roles.map(r => {
                        const rp = rolePermissions.find(p => p.role_id === r.id && p.permission_key === perm.key);
                        const isAllowed = rp ? rp.allowed : false;
                        const disabled = r.name === 'admin'; // Não permite tirar poderes do admin
                        return (
                          <td key={r.id} style={{ padding: '12px', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={isAllowed}
                              disabled={disabled}
                              onChange={() => togglePermission(r.id, perm.key, isAllowed)}
                              style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Lista de Usuários */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px' }}>Usuários Cadastrados</h2>
              <button className="glass-btn" onClick={() => setShowCreateModal(true)}>
                <UserPlus size={16} /> Novo Usuário
              </button>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Nome</th>
                  <th style={{ padding: '12px' }}>Papel</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '12px' }}>{u.full_name}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '4px 8px', background: 'var(--bg-surface-hover)', borderRadius: '4px', fontSize: '12px' }}>
                        {u.roles?.name || 'Sem papel'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ color: u.is_active ? 'var(--color-status-won)' : 'var(--color-status-lost)', fontWeight: 'bold' }}>
                        {u.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDeactivate(u.id, u.is_active)}
                        style={{
                          background: 'transparent',
                          color: u.is_active ? 'var(--color-status-lost)' : 'var(--color-status-won)',
                          border: `1px solid ${u.is_active ? 'var(--color-status-lost)' : 'var(--color-status-won)'}`,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {u.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Criação de Usuário */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-panel" style={{ width: '400px', padding: '24px', position: 'relative' }}>
            <button 
              onClick={() => setShowCreateModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '20px', marginBottom: '24px' }}>Criar Novo Usuário</h2>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Nome Completo</label>
                <input required type="text" className="glass-input" value={newUserData.full_name} onChange={e => setNewUserData({...newUserData, full_name: e.target.value})} placeholder="Ex: João Silva" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>E-mail</label>
                <input required type="email" className="glass-input" value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} placeholder="Ex: joao@empresa.com" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Senha Provisória</label>
                <input required type="text" className="glass-input" value={newUserData.password} onChange={e => setNewUserData({...newUserData, password: e.target.value})} placeholder="Min. 6 caracteres" minLength={6} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>Papel (Role)</label>
                <select required className="glass-input" value={newUserData.role_id} onChange={e => setNewUserData({...newUserData, role_id: e.target.value})}>
                  <option value="">Selecione um papel...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="glass-btn" style={{ marginTop: '8px', justifyContent: 'center' }} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Criar e Convidar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
