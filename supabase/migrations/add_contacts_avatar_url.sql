-- SQL Migration: Add avatar_url to contacts table
-- File: supabase/migrations/add_contacts_avatar_url.sql

-- Add avatar_url column to store contact's public profile picture URL from Evolution API
ALTER TABLE public.contacts ADD COLUMN avatar_url text;
