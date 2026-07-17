# Workspace Rules and Best Practices

This document contains general rules and best practices for this repository, loaded by Antigravity during pair programming.

## 1. n8n Dynamic Credentials Rule (Evolution / External APIs)
* **Never use hardcoded/predefined credentials** in outbound HTTP Request nodes if the system is multi-channel/multi-tenant (e.g. `Evolution API Auth` which points to a single chip's API key).
* **Always query credentials from the database** (`channels` table) and pass the `api_key` and instance parameters dynamically via node expressions (e.g., `apikey: {{ $('Fetch Channel').item.json.api_key }}`).
* This prevents cross-authentication errors when the workspace is deployed in production with production-specific channels.

## 2. Supabase Storage Public Upload Policy
* When deploying new Supabase databases (production vs. testing), make sure that the `media` storage bucket has RLS enabled and explicitly contains the following policies to permit anonymous/public uploads from the client browser:
  * **INSERT Policy**: TO `public`, WITH CHECK `(bucket_id = 'media')`.
  * **SELECT Policy**: TO `public`, USING `(bucket_id = 'media')`.
  * **UPDATE Policy**: TO `public`, USING `(bucket_id = 'media')` WITH CHECK `(bucket_id = 'media')`.
* Without these policies, any file uploads using the client's `anon` key will fail with a `400/403` signature/RLS error, and outbound media sending will abort.

## 3. Dynamic Environment Configuration
* Keep webhook paths dynamic in frontend services by resolving them from environment variables (e.g., `VITE_N8N_OUTBOUND_MEDIA_PATH` and `VITE_N8N_PROFILE_PHOTO_PATH`).
* This enables the exact same codebase branch to run in development (pointing to dev webhooks) and production (pointing to production webhooks).
