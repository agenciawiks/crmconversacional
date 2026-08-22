import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import {
  AlertCircle, ArrowRight, Bot, Building2, Camera, Check, CheckCircle2, Eye, EyeOff,
  KeyRound, Layers3, Loader2, LockKeyhole, MessageCircle, Radio,
  Rocket, ShieldCheck, Sparkles, UserPlus, UsersRound, WandSparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

const EMPTY_FORM = { clinicName: '', clinicSlug: '', adminName: '', adminEmail: '', adminPassword: '' };
const DEFAULT_PROVISION_URL = 'https://n8n-n8n.rh3fr2.easypanel.host/webhook/provision-tenant';

const slugify = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const CHANNELS = [
  { name: 'Evolution API', detail: 'WhatsApp via instância', icon: MessageCircle, tone: 'mint' },
  { name: 'WhatsApp Oficial', detail: 'Meta Cloud API', icon: Radio, tone: 'blue' },
  { name: 'Instagram', detail: 'Mensagens da Meta', icon: Camera, tone: 'cyan' },
];

export default function ProvisionTenant() {
  const { isSuperAdmin, refreshTenants } = useAuth();
  const rootRef = useRef(null);
  const formRef = useRef(null);
  const firstEntranceFinished = useRef(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [errors, setErrors] = useState({});

  const provisionUrl = useMemo(() => {
    const explicitUrl = import.meta.env.VITE_N8N_PROVISION_TENANT_URL;
    if (explicitUrl) return explicitUrl;
    const baseUrl = String(import.meta.env.VITE_N8N_WEBHOOK_URL || '').replace(/\/+$/, '');
    return baseUrl ? `${baseUrl}/webhook/provision-tenant` : DEFAULT_PROVISION_URL;
  }, []);

  const completedFields = [formData.clinicName, formData.clinicSlug, formData.adminName, formData.adminEmail, formData.adminPassword]
    .filter((value) => String(value).trim()).length;
  const progress = Math.round((completedFields / 5) * 100);
  const previewName = formData.clinicName.trim() || 'Novo cliente';
  const previewInitials = previewName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'NC';

  useLayoutEffect(() => {
    if (!isSuperAdmin || !rootRef.current) return undefined;
    const root = rootRef.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    firstEntranceFinished.current = false;
    const ctx = gsap.context(() => {
      const entranceTargets = [
        root.querySelector('.provision-page-header'), root.querySelector('.provision-journey'),
        ...root.querySelectorAll('.provision-metric-card'), ...root.querySelectorAll('.provision-form-section'),
        root.querySelector('.provision-summary'),
      ].filter(Boolean);
      gsap.set(entranceTargets, { willChange: 'transform,opacity' });
      gsap.timeline({
        delay: .12,
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          firstEntranceFinished.current = true;
          gsap.set(entranceTargets, { clearProps: 'transform,opacity,visibility,willChange' });
        },
      })
        .fromTo('.provision-page-header', { y: 34, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: reduceMotion ? 0.3 : 0.62 }, 0)
        .fromTo('.provision-journey', { y: 24, autoAlpha: 0, scale: .975 }, { y: 0, autoAlpha: 1, scale: 1, duration: reduceMotion ? 0.27 : 0.52 }, reduceMotion ? .08 : .16)
        .fromTo('.provision-metric-card', { y: 34, autoAlpha: 0, rotateX: -9, scale: .965 }, { y: 0, autoAlpha: 1, rotateX: 0, scale: 1, duration: reduceMotion ? 0.26 : 0.55, stagger: reduceMotion ? .035 : .09 }, reduceMotion ? .15 : .3)
        .fromTo('.provision-form-section', { x: -30, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: reduceMotion ? 0.27 : 0.54, stagger: reduceMotion ? .04 : .1 }, reduceMotion ? .22 : .48)
        .fromTo('.provision-summary', { x: 34, autoAlpha: 0, scale: .98 }, { x: 0, autoAlpha: 1, scale: 1, duration: reduceMotion ? 0.27 : 0.58 }, reduceMotion ? .26 : .54)
        .fromTo('.provision-channel-card', { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: reduceMotion ? 0.23 : 0.4, stagger: reduceMotion ? .025 : .065 }, reduceMotion ? .32 : .72);

      const xTo = gsap.quickTo('.provision-cursor-glow', 'x', { duration: .55, ease: 'power3.out' });
      const yTo = gsap.quickTo('.provision-cursor-glow', 'y', { duration: .55, ease: 'power3.out' });
      const onPointerMove = (event) => { xTo(event.clientX - 150); yTo(event.clientY - 150); };
      root.addEventListener('pointermove', onPointerMove);
      root._provisionPointerCleanup = () => root.removeEventListener('pointermove', onPointerMove);

      if (!reduceMotion) {
        gsap.to('.provision-orbit--one', { rotation: 360, duration: 25, repeat: -1, ease: 'none' });
        gsap.to('.provision-orbit--two', { rotation: -360, duration: 33, repeat: -1, ease: 'none' });
      }
    }, root);
    return () => { root._provisionPointerCleanup?.(); ctx.revert(); };
  }, [isSuperAdmin]);

  useLayoutEffect(() => {
    if (!status || !rootRef.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo('.provision-feedback', { y: 10, opacity: 0, scale: .98 }, { y: 0, opacity: 1, scale: 1, duration: .4, ease: 'back.out(1.6)' });
    }, rootRef);
    return () => ctx.revert();
  }, [status]);

  useEffect(() => {
    const isDirty = Object.values(formData).some((value) => String(value).trim());
    const preventLoss = (event) => {
      if (!isDirty || loading) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [formData, loading]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'clinicSlug') setSlugTouched(true);
    setErrors((current) => ({ ...current, [name]: '' }));
    setStatus(null);
    setFormData((previous) => ({
      ...previous,
      [name]: value,
      ...(name === 'clinicName' && !slugTouched ? { clinicSlug: slugify(value) } : {}),
    }));
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.clinicName.trim()) nextErrors.clinicName = 'Informe o nome da empresa ou clínica.';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugify(formData.clinicSlug))) nextErrors.clinicSlug = 'Use letras minúsculas, números e hífens.';
    if (!formData.adminName.trim()) nextErrors.adminName = 'Informe o nome do administrador inicial.';
    if (!/^\S+@\S+\.\S+$/.test(formData.adminEmail.trim())) nextErrors.adminEmail = 'Informe um e-mail válido.';
    if (formData.adminPassword.length < 8) nextErrors.adminPassword = 'A senha inicial precisa ter ao menos 8 caracteres.';
    setErrors(nextErrors);
    window.setTimeout(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus(), 0);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || !validateForm()) return;
    if (!provisionUrl) {
      setStatus({ type: 'error', message: 'O fluxo de provisionamento não está configurado. Verifique o endereço do webhook.' });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sua sessão expirou. Entre novamente no CRM.');
      const response = await fetch(provisionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ ...formData, clinicSlug: slugify(formData.clinicSlug) }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.success === false) throw new Error(body?.message || 'Não foi possível criar o cliente. Revise os dados e tente novamente.');

      setStatus({
        type: 'success',
        message: `${body?.tenantName || formData.clinicName} foi criado com administrador e configurações iniciais. Agora conecte os canais com as credenciais do cliente.`,
      });
      setFormData(EMPTY_FORM);
      setSlugTouched(false);
      setErrors({});
      await refreshTenants();
    } catch (error) {
      setStatus({ type: 'error', message: error?.message || 'Erro inesperado ao criar o cliente. Tente novamente.' });
    } finally { setLoading(false); }
  };

  const animateCardEnter = (event) => gsap.to(event.currentTarget, { y: -4, rotateX: 2, rotateY: -2, duration: .28, ease: 'power2.out', overwrite: 'auto' });
  const animateCardLeave = (event) => gsap.to(event.currentTarget, { y: 0, rotateX: 0, rotateY: 0, duration: .38, ease: 'power3.out', overwrite: 'auto' });
  const animateActionEnter = (event) => {
    const button = event.currentTarget;
    gsap.to(button, { y: -3, scale: 1.015, duration: .28, ease: 'power2.out', overwrite: 'auto' });
    gsap.to(button.querySelector('svg'), { x: 4, rotation: -5, duration: .3, ease: 'back.out(2)', overwrite: 'auto' });
    gsap.fromTo(button.querySelector('.provision-action-shine'), { xPercent: -130, autoAlpha: 0 }, { xPercent: 440, autoAlpha: .78, duration: .85, ease: 'power2.out', overwrite: 'auto' });
  };
  const animateActionLeave = (event) => {
    const button = event.currentTarget;
    gsap.to(button, { y: 0, scale: 1, duration: .36, ease: 'power3.out', overwrite: 'auto' });
    gsap.to(button.querySelector('svg'), { x: 0, rotation: 0, duration: .3, ease: 'power3.out', overwrite: 'auto' });
  };

  if (!isSuperAdmin) return (
    <main className="provision-access-denied"><span><AlertCircle size={30} aria-hidden="true" /></span><p className="provision-overline">Acesso restrito</p><h1>Somente a superadministração pode criar clientes.</h1><p>Entre com um perfil superadministrador para provisionar um novo ambiente.</p></main>
  );

  const metrics = [
    ['Ambiente isolado', 'Tenant próprio', 'Dados separados desde a criação', LockKeyhole, 'mint'],
    ['Usuário inicial', 'Administrador', 'Primeiro acesso protegido', UserPlus, 'blue'],
    ['Canais preparados', '3 opções', 'Conexão após provisionar', Radio, 'cyan'],
  ];

  return (
    <main ref={rootRef} className="content-wrapper provision-page">
      <div className="provision-cursor-glow" aria-hidden="true" /><div className="provision-orbit provision-orbit--one" aria-hidden="true" /><div className="provision-orbit provision-orbit--two" aria-hidden="true" />
      <header className="provision-page-header">
        <div><span className="provision-overline"><Sparkles size={12} aria-hidden="true" /> Expansão segura</span><h1>Novo Cliente</h1><p>Crie um ambiente isolado, defina o primeiro administrador e prepare a entrada dos canais.</p></div>
        <span className="provision-secure-badge"><ShieldCheck size={15} aria-hidden="true" /> Provisionamento seguro</span>
      </header>

      <ol className="provision-journey" aria-label="Etapas do provisionamento">
        {[['Empresa', Building2], ['Usuário inicial', UsersRound], ['Configurações & canais', Layers3]].map(([label, Icon], index) => <li key={label}><span><Icon size={16} aria-hidden="true" /></span><div><small>Etapa {index + 1}</small><strong>{label}</strong></div>{index < 2 && <ArrowRight size={14} aria-hidden="true" />}</li>)}
      </ol>

      <section className="provision-metrics" aria-label="Resumo do provisionamento">
        {metrics.map(([label, value, detail, Icon, tone]) => <article key={label} className={`provision-metric-card is-${tone}`} onPointerEnter={animateCardEnter} onPointerLeave={animateCardLeave}><span className="provision-metric-icon"><Icon size={18} aria-hidden="true" /></span><small>{label}</small><strong>{value}</strong><p>{detail}</p></article>)}
      </section>

      <form ref={formRef} className="provision-layout" onSubmit={handleSubmit} noValidate>
        <div className="provision-form-stack">
          <section className="provision-form-section">
            <div className="provision-section-heading"><span>01</span><div><small>Identidade</small><h2>Empresa</h2><p>Informações que identificam o novo ambiente no CRM.</p></div></div>
            <div className="provision-grid">
              <div className="provision-field"><label htmlFor="provision-clinic-name">Nome da empresa ou clínica</label><input id="provision-clinic-name" type="text" name="clinicName" value={formData.clinicName} onChange={handleChange} autoComplete="organization" aria-invalid={Boolean(errors.clinicName)} placeholder="Ex.: Clínica Sorriso…" />{errors.clinicName && <small className="provision-field-error">{errors.clinicName}</small>}</div>
              <div className="provision-field"><label htmlFor="provision-clinic-slug">Identificador interno</label><div className="provision-slug-field"><span translate="no">crm/</span><input id="provision-clinic-slug" type="text" name="clinicSlug" value={formData.clinicSlug} onChange={handleChange} autoComplete="off" spellCheck={false} inputMode="url" aria-invalid={Boolean(errors.clinicSlug)} placeholder="clinica-sorriso…" /></div>{errors.clinicSlug ? <small className="provision-field-error">{errors.clinicSlug}</small> : <small>Gerado automaticamente e usado para localizar o cliente.</small>}</div>
            </div>
          </section>

          <section className="provision-form-section">
            <div className="provision-section-heading"><span>02</span><div><small>Acesso principal</small><h2>Usuário inicial</h2><p>Administrador que receberá o primeiro acesso ao novo ambiente.</p></div></div>
            <div className="provision-grid">
              <div className="provision-field"><label htmlFor="provision-admin-name">Nome completo</label><input id="provision-admin-name" type="text" name="adminName" value={formData.adminName} onChange={handleChange} autoComplete="name" aria-invalid={Boolean(errors.adminName)} placeholder="Ex.: Maria da Silva…" />{errors.adminName && <small className="provision-field-error">{errors.adminName}</small>}</div>
              <div className="provision-field"><label htmlFor="provision-admin-email">E-mail de login</label><input id="provision-admin-email" type="email" name="adminEmail" value={formData.adminEmail} onChange={handleChange} autoComplete="email" spellCheck={false} aria-invalid={Boolean(errors.adminEmail)} placeholder="maria@empresa.com.br…" />{errors.adminEmail && <small className="provision-field-error">{errors.adminEmail}</small>}</div>
            </div>
            <div className="provision-field provision-password"><label htmlFor="provision-admin-password">Senha inicial</label><div><input id="provision-admin-password" type={showPassword ? 'text' : 'password'} name="adminPassword" value={formData.adminPassword} onChange={handleChange} autoComplete="new-password" aria-invalid={Boolean(errors.adminPassword)} placeholder="Mínimo de 8 caracteres…" /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Ocultar senha inicial' : 'Mostrar senha inicial'}>{showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button></div>{errors.adminPassword ? <small className="provision-field-error">{errors.adminPassword}</small> : <small>O cliente será orientado a revisar a senha no primeiro acesso.</small>}</div>
          </section>

          <section className="provision-form-section">
            <div className="provision-section-heading"><span>03</span><div><small>Base operacional</small><h2>Configurações &amp; canais</h2><p>O ambiente nasce configurado; as credenciais dos canais são adicionadas depois.</p></div></div>
            <div className="provision-defaults">
              {[['Plano padrão', 'Standard', Layers3], ['Follow-Up global', 'Ativado', Bot], ['Primeiro login', 'Protegido', KeyRound]].map(([label, value, Icon]) => <div key={label}><span><Icon size={16} aria-hidden="true" /></span><p><small>{label}</small><strong>{value}</strong></p><Check size={15} aria-hidden="true" /></div>)}
            </div>
            <div className="provision-channel-grid">{CHANNELS.map(({ name, detail, icon: Icon, tone }) => <article key={name} className={`provision-channel-card is-${tone}`} onPointerEnter={animateCardEnter} onPointerLeave={animateCardLeave}><span><Icon size={18} aria-hidden="true" /></span><div><strong>{name}</strong><small>{detail}</small></div><em>Configurar depois</em></article>)}</div>
            <p className="provision-channel-note"><WandSparkles size={15} aria-hidden="true" /> Após criar o cliente, selecione-o na barra lateral e use “Conectar Canais” para validar as credenciais reais.</p>
          </section>
        </div>

        <aside className="provision-summary" aria-label="Resumo do novo cliente">
          <div className="provision-summary-header"><span>{previewInitials}</span><div><small>Prévia do ambiente</small><strong>{previewName}</strong><code translate="no">{formData.clinicSlug || 'identificador'}</code></div></div>
          <div className="provision-progress"><div><span>Preenchimento</span><strong>{progress}%</strong></div><i><span style={{ '--provision-progress': `${progress}%` }} /></i></div>
          <ul><li><ShieldCheck size={15} aria-hidden="true" /><span><strong>Tenant independente</strong><small>Dados isolados por cliente</small></span></li><li><UserPlus size={15} aria-hidden="true" /><span><strong>Administrador inicial</strong><small>Perfil Admin e primeiro login</small></span></li><li><Bot size={15} aria-hidden="true" /><span><strong>Configuração base</strong><small>Empresa e Follow-Up prontos</small></span></li><li><Radio size={15} aria-hidden="true" /><span><strong>Canais sob demanda</strong><small>Credenciais validadas depois</small></span></li></ul>
          {status && <div className={`provision-feedback is-${status.type}`} role="status" aria-live="polite">{status.type === 'success' ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertCircle size={18} aria-hidden="true" />}<span>{status.message}</span></div>}
          <button className="provision-submit" type="submit" disabled={loading} onPointerEnter={animateActionEnter} onPointerLeave={animateActionLeave}><span className="provision-action-shine" aria-hidden="true" />{loading ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Rocket size={18} aria-hidden="true" />}<span>{loading ? 'Criando ambiente…' : 'Criar novo cliente'}</span></button>
          <p className="provision-submit-help"><LockKeyhole size={12} aria-hidden="true" /> A operação usa sua sessão de superadministrador.</p>
        </aside>
      </form>
    </main>
  );
}
