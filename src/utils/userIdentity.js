const normalizeName = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

export const isGenericDisplayName = (value) => {
  const normalized = normalizeName(value);
  if (!normalized) return true;

  return /^(usuario|user)(?:\s+[a-z0-9_-]+)?$/.test(normalized)
    || /^(usuario logado|novo usuario|sem nome|admin|administrador)$/.test(normalized);
};

export const resolveUserDisplayName = (profile, user) => {
  const metadata = user?.user_metadata || {};
  const candidates = [profile?.full_name, metadata.full_name, metadata.name];
  const meaningfulName = candidates.find((candidate) => !isGenericDisplayName(candidate));

  return meaningfulName
    || user?.email
    || profile?.tenant_name
    || 'Conta conectada';
};
