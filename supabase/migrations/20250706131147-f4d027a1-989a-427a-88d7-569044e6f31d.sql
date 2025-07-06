-- Enhance api_keys table with additional fields for better management
ALTER TABLE public.api_keys 
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS revoked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing records to not be revoked by default
UPDATE public.api_keys SET revoked = false WHERE revoked IS NULL;