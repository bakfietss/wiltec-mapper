-- Add additional columns to mapping_logs table

-- Add category column to track the mapping category
ALTER TABLE public.mapping_logs ADD COLUMN category text;

-- Add end_time column to track when the transformation completed
ALTER TABLE public.mapping_logs ADD COLUMN end_time timestamp with time zone;

-- Add record_count column to track the number of transformations made
ALTER TABLE public.mapping_logs ADD COLUMN record_count integer;