import { useMemo, useState } from 'react';
import { AlertCircle, Building2, CheckCircle2, Loader2, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

const EMPTY_FORM = {
  clinicName: '',
  clinicSlug: '',
  adminName: '',
  adminEmail: '',
  adminPassword: ''
};

const slugify = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

export default function ProvisionTenant() {
  const { isSuperAdmin, refreshTenants } = useAuth();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const provisionUrl = useMemo(() => {
    const explicitUrl = import.meta.env.VITE_N8N_PROVISION_TENANT_URL;
    if (explicitUrl) return explicitUrl;

    const baseUrl = String(import.meta.env.VITE_N8N_WEBHOOK_URL || '')
      .replace(/\/+$/, '');
    return baseUrl ? `${baseUrl}/webhook/provision-tenant` : '';
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="provision-container provision-centered">
        <div className="provision-feedback error">
          <AlertCircle size={34} />
          <div>
            <strong>Acesso negado</strong>
            <p>Somente a superadministração da Wiks pode criar clientes.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'clinicSlug') setSlugTouched(true);

    setFormData(previous => ({
      ...previous,
      [name]: value,
      ...(name === 'clinicName' && !slugTouched
        ? { clinicSlug: slugify(value) }
        : {})
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    if (!provisionUrl) {
      setStatus({
        type: 'error',
        message: 'O webhook de provisionamento não está configurado.'
      });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Sua sessão expirou. Entre novamente no CRM.');
      }

      const response = await fetch(provisionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...formData,
          clinicSlug: slugify(formData.clinicSlug)
        })
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) {
        throw new Error(
          body?.message || 'Não foi possível criar o cliente.'
        );
      }

      setStatus({
        type: 'success',
        message: 'Cliente, administrador e configurações iniciais criados com sucesso.'
      });
      setFormData(EMPTY_FORM);
      setSlugTouched(false);
      await refreshTenants();
    } catch (error) {
      setStatus({
        type: 'error',
        message: error?.message || 'Erro inesperado ao criar o cliente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="provision-container">
      <div className="provision-header">
        <div className="provision-title">
          <Building2 size={24} />
          <div>
            <h1>Novo Cliente</h1>
            <p>Crie um ambiente isolado com administrador e configurações próprias.</p>
          </div>
        </div>
      </div>

      <form className="provision-card" onSubmit={handleSubmit}>
        <section className="provision-section">
          <div className="provision-section-heading">
            <span>1</span>
            <div>
              <h2>Empresa</h2>
              <p>Identificação do novo cliente no CRM.</p>
            </div>
          </div>

          <div className="provision-grid">
            <label>
              Nome da empresa ou clínica
              <input
                className="glass-input"
                type="text"
                name="clinicName"
                value={formData.clinicName}
                onChange={handleChange}
                placeholder="Ex.: Clínica Sorriso"
                required
              />
            </label>
            <label>
              Identificador
              <input
                className="glass-input"
                type="text"
                name="clinicSlug"
                value={formData.clinicSlug}
                onChange={handleChange}
                placeholder="clinica-sorriso"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
              />
              <small>Usado internamente para identificar o cliente.</small>
            </label>
          </div>
        </section>

        <section className="provision-section">
          <div className="provision-section-heading">
            <span>2</span>
            <div>
              <h2>Administrador do cliente</h2>
              <p>Primeiro usuário que receberá acesso ao ambiente.</p>
            </div>
          </div>

          <div className="provision-grid">
            <label>
              Nome completo
              <input
                className="glass-input"
                type="text"
                name="adminName"
                value={formData.adminName}
                onChange={handleChange}
                placeholder="Ex.: Maria da Silva"
                required
              />
            </label>
            <label>
              E-mail de login
              <input
                className="glass-input"
                type="email"
                name="adminEmail"
                value={formData.adminEmail}
                onChange={handleChange}
                placeholder="maria@empresa.com.br"
                autoComplete="off"
                required
              />
            </label>
          </div>

          <label className="provision-password">
            Senha inicial
            <input
              className="glass-input"
              type="password"
              name="adminPassword"
              value={formData.adminPassword}
              onChange={handleChange}
              placeholder="Mínimo de 8 caracteres"
              minLength={8}
              autoComplete="new-password"
              required
            />
            <small>O cliente poderá trocar a senha no primeiro acesso.</small>
          </label>
        </section>

        {status && (
          <div className={`provision-feedback ${status.type}`} role="status">
            {status.type === 'success'
              ? <CheckCircle2 size={20} />
              : <AlertCircle size={20} />}
            <span>{status.message}</span>
          </div>
        )}

        <button className="provision-submit" type="submit" disabled={loading}>
          {loading
            ? <><Loader2 className="animate-spin" size={20} /> Criando cliente...</>
            : <><Save size={20} /> Criar cliente</>}
        </button>
      </form>
    </div>
  );
}
