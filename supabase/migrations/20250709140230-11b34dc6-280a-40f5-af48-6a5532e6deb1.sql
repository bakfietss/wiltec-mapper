-- Drop redundant columns from mappings table

-- Drop user_email column (redundant with user_id)
ALTER TABLE public.mappings DROP COLUMN user_email;

-- Drop config column (redundant with ui_config)
ALTER TABLE public.mappings DROP COLUMN config;