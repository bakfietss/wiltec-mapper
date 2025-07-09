-- Add mapping_name column to mapping_logs table
ALTER TABLE public.mapping_logs ADD COLUMN mapping_name text;