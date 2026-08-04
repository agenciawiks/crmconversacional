import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = profile?.is_super_admin === true;
  const effectiveTenantId = isSuperAdmin
    ? selectedTenantId
    : profile?.tenant_id || null;

  const loadTenants = async (prof) => {
    if (!prof?.is_super_admin) {
      const ownTenant = prof?.tenants
        ? [{ id: prof.tenant_id, ...prof.tenants }]
        : [];
      setTenants(ownTenant);
      setSelectedTenantId(prof?.tenant_id || null);
      return;
    }

    const { data, error } = await supabase
      .from('tenants')
      .select('id,name,slug,plan')
      .order('name', { ascending: true });

    if (error) {
      console.error('[AuthContext] Erro ao carregar clientes:', error);
      setTenants([]);
      setSelectedTenantId(prof?.tenant_id || null);
      return;
    }

    const availableTenants = data || [];
    const savedTenantId = localStorage.getItem('crm_superadmin_tenant_id');
    const preferredTenantId = availableTenants.some(
      tenant => tenant.id === savedTenantId
    )
      ? savedTenantId
      : availableTenants.some(tenant => tenant.id === prof?.tenant_id)
        ? prof.tenant_id
        : availableTenants[0]?.id || null;

    setTenants(availableTenants);
    setSelectedTenantId(preferredTenantId);
  };

  const loadProfile = async (sessionUser) => {
    if (!sessionUser) {
      setProfile(null);
      setPermissions({});
      setTenants([]);
      setSelectedTenantId(null);
      setLoading(false);
      return;
    }
    try {
      const { data: prof, error } = await supabase
        .from('profiles')
        .select(`
          *,
          roles (
            name,
            role_permissions (
              permission_key,
              allowed
            )
          ),
          tenants (
            name,
            slug,
            plan
          )
        `)
        .eq('id', sessionUser.id)
        .single();
        
      if (error) {
        console.error("[AuthContext] Erro ao carregar perfil:", error);
      }
      
      if (prof) {
        // Verifica se a conta foi desativada (Soft Delete)
        if (prof.is_active === false) {
          await supabase.auth.signOut();
          alert("Sua conta foi desativada pelo administrador. Acesso negado.");
          setSession(null);
          setUser(null);
          setProfile(null);
          setPermissions({});
          setLoading(false);
          return;
        }

        const permsObj = {};
        if (prof.roles && prof.roles.role_permissions) {
          prof.roles.role_permissions.forEach(rp => {
            permsObj[rp.permission_key] = rp.allowed;
          });
        }
        
        const loadedProfile = {
          ...prof,
          role_name: prof.roles?.name,
          tenant_name: prof.tenants?.name
        };
        setProfile(loadedProfile);
        setPermissions(permsObj);
        await loadTenants(loadedProfile);
      }
    } catch(err) {
      console.error("[AuthContext] Catch:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Busca a sessão inicial
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Erro ao carregar sessão:", error);
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Escuta mudanças no estado de autenticação (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user);
        } else {
          setProfile(null);
          setPermissions({});
          setTenants([]);
          setSelectedTenantId(null);
          setLoading(false);
        }
      }
    );

    // Cleanup
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Realtime para atualizações de permissões e perfis (ex: admin revogou permissão em tempo real)
  useEffect(() => {
    if (!user) return;
    
    // Escuta mudanças tanto em profiles quanto em role_permissions
    const profileChannel = supabase
      .channel('auth_realtime_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => {
        console.log("[AuthContext] Profile atualizado, recarregando...");
        loadProfile(user);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'role_permissions' }, () => {
        console.log("[AuthContext] Permissões globais atualizadas, recarregando...");
        loadProfile(user);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('crm_theme') || 'dark';
    const root = document.documentElement;
    if (savedTheme === 'dark') {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }
  }, []);

  const completeFirstLogin = async () => {
    // We use an RPC call because RLS (Row Level Security) blocks direct UPDATEs from the frontend.
    const { error } = await supabase.rpc('complete_first_login');

    if (error) {
       console.error("Erro no RPC complete_first_login:", error);
       throw error;
    }
    
    // Update local profile state immediately
    setProfile(prev => prev ? { ...prev, first_login: false } : null);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const switchTenant = (tenantId) => {
    if (!isSuperAdmin) return;
    if (!tenants.some(tenant => tenant.id === tenantId)) return;

    localStorage.setItem('crm_superadmin_tenant_id', tenantId);
    localStorage.removeItem('crm_active_contact_id');
    setSelectedTenantId(tenantId);
  };

  const refreshTenants = async () => {
    if (profile) {
      await loadTenants(profile);
    }
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      profile,
      permissions,
      tenants,
      selectedTenantId,
      effectiveTenantId,
      isSuperAdmin,
      loading,
      signOut,
      completeFirstLogin,
      switchTenant,
      refreshTenants
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
