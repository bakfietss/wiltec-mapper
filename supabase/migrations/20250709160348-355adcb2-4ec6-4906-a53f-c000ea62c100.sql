-- Add separate date and time columns to mapping_logs table
ALTER TABLE public.mapping_logs 
ADD COLUMN start_date text,
ADD COLUMN start_time_formatted text,
ADD COLUMN end_date text,
ADD COLUMN end_time_formatted text;

-- Drop the old start_time column
ALTER TABLE public.mapping_logs DROP COLUMN start_time;