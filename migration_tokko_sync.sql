-- SQL Migration: Add tokko_id to properties table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS tokko_id TEXT UNIQUE;

-- Add updated_at column if it doesn't exist
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Optional: Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_properties_tokko_id ON public.properties(tokko_id);
