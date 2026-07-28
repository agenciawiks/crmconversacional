import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  const loadProfile = async (sessionUser) => {
    if (!sessionUser) {
      setProfile(null);
      setPermissions({});
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
        
        setProfile({ ...prof, role_name: prof.roles?.name });
        setPermissions(permsObj);
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

  const completeFirstLogin = async (userId) => {
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

  return (
    <AuthContext.Provider value={{ session, user, profile, permissions, loading, signOut, completeFirstLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
