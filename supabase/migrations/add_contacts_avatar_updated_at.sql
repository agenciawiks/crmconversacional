-- SQL Migration: Add avatar_updated_at to contacts table
-- File: supabase/migrations/add_contacts_avatar_updated_at.sql

-- Add avatar_updated_at column to track when the contact's photo was last updated/synced
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS avatar_updated_at timestamptz;
