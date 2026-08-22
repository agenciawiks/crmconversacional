const N8N_URL = String(import.meta.env.VITE_N8N_WEBHOOK_URL || '').replace(/\/$/, '');
const PROFILE_PHOTO_PATH = import.meta.env.VITE_N8N_PROFILE_PHOTO_PATH || '/webhook/fetch-profile-photo';
const REQUEST_INTERVAL_MS = 1100;
const RETRY_COOLDOWN_MS = 2 * 60 * 1000;

const jobs = [];
const queuedContacts = new Map();
const lastAttempts = new Map();
let processing = false;

function getProfilePhotoUrl() {
  if (/^https?:\/\//i.test(PROFILE_PHOTO_PATH)) return PROFILE_PHOTO_PATH;
  return `${N8N_URL}${PROFILE_PHOTO_PATH.startsWith('/') ? PROFILE_PHOTO_PATH : `/${PROFILE_PHOTO_PATH}`}`;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function runQueue() {
  if (processing) return;
  processing = true;

  while (jobs.length > 0) {
    const job = jobs.shift();
    try {
      const response = await fetch(getProfilePhotoUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: job.contactId,
          tenant_id: job.tenantId || undefined,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
      }

      lastAttempts.set(job.contactId, Date.now());
      job.resolve(payload || { success: true });
    } catch (error) {
      lastAttempts.set(job.contactId, Date.now());
      job.reject(error);
    } finally {
      queuedContacts.delete(job.contactId);
    }

    if (jobs.length > 0) await wait(REQUEST_INTERVAL_MS);
  }

  processing = false;
}

export function queueProfilePhotoSync({ contactId, tenantId, force = false }) {
  if (!N8N_URL || !contactId) {
    return Promise.reject(new Error('Workflow de foto de perfil não configurado.'));
  }

  const pendingRequest = queuedContacts.get(contactId);
  if (pendingRequest) return pendingRequest;

  const lastAttempt = lastAttempts.get(contactId) || 0;
  if (!force && Date.now() - lastAttempt < RETRY_COOLDOWN_MS) {
    return Promise.resolve({ success: true, skipped: true });
  }

  const request = new Promise((resolve, reject) => {
    jobs.push({ contactId, tenantId, resolve, reject });
    void runQueue();
  });

  queuedContacts.set(contactId, request);
  return request;
}

export function normalizeProfilePhotoUrl(value) {
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  if (!normalized || /^(null|undefined|false)$/i.test(normalized)) return null;

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

export function isProfilePhotoStale(contact) {
  const updatedAt = new Date(contact.avatar_updated_at).getTime();
  // A successful lookup is cached even when WhatsApp has no profile photo.
  // Broken but syntactically valid URLs are retried by the image error handler.
  return !Number.isFinite(updatedAt)
    || Date.now() - updatedAt > 15 * 24 * 60 * 60 * 1000;
}
