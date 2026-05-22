/* Supabase schema for OmniCRM */

-- Table: channels
CREATE TABLE public.channels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    provider text NOT NULL, -- 'meta' or 'evolution' or 'chatwoot'
    status text NOT NULL DEFAULT 'active',
    credentials jsonb, -- store provider‑specific credentials
    webhook_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: contacts
CREATE TABLE public.contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone text NOT NULL,
    name text,
    tags jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: messages
CREATE TABLE public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
    contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
    direction text NOT NULL CHECK (direction IN ('in','out')),
    content text,
    content_type text,
    media_url text,
    whatsapp_msg_id text,
    timestamp timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: webhook_logs (audit of successful webhook processing)
CREATE TABLE public.webhook_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
    event_type text NOT NULL,
    source text NOT NULL, -- e.g., 'meta', 'evolution', 'chatwoot'
    status text NOT NULL,
    payload jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Table: failed_messages (dead‑letter queue)
CREATE TABLE public.failed_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
    payload jsonb NOT NULL,
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Realtime on messages table
ALTER TABLE public.messages ENABLE REPLICA IDENTITY FULL;

-- Row Level Security (RLS) policies – allow authenticated users to access their own data
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY channel_select ON public.channels FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY channel_insert ON public.channels FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY channel_update ON public.channels FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY channel_delete ON public.channels FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY message_select ON public.messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY message_insert ON public.messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY message_update ON public.messages FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY message_delete ON public.messages FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY contact_select ON public.contacts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY contact_insert ON public.contacts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY contact_update ON public.contacts FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY contact_delete ON public.contacts FOR DELETE USING (auth.role() = 'authenticated');
