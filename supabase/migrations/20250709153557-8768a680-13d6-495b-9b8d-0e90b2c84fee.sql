-- Add version column to mapping_logs table
ALTER TABLE public.mapping_logs ADD COLUMN version text;