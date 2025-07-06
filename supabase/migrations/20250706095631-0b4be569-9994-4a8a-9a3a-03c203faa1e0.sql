-- Add new columns to mappings table for better organization
ALTER TABLE public.mappings 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'General',
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ui_config jsonb,
ADD COLUMN IF NOT EXISTS execution_config jsonb;

-- Update existing mappings to have both ui_config and execution_config
-- For now, copy the existing config to ui_config as a fallback
UPDATE public.mappings 
SET ui_config = config
WHERE ui_config IS NULL;

-- Create index for better category filtering
CREATE INDEX IF NOT EXISTS idx_mappings_category ON public.mappings(category);
CREATE INDEX IF NOT EXISTS idx_mappings_tags ON public.mappings USING GIN(tags);

-- Update the get_next_version function to work with categories
CREATE OR REPLACE FUNCTION public.get_next_version(p_user_id uuid, p_name text, p_category text DEFAULT 'General')
RETURNS text AS $$
DECLARE
  latest_version text;
  version_number numeric;
BEGIN
  -- Get the latest version for this mapping name, user, and category
  SELECT version INTO latest_version
  FROM public.mappings
  WHERE user_id = p_user_id AND name = p_name AND category = p_category
  ORDER BY version DESC
  LIMIT 1;
  
  -- If no version exists, start with v1.01
  IF latest_version IS NULL THEN
    RETURN 'v1.01';
  END IF;
  
  -- Extract numeric part and increment
  version_number := CAST(SUBSTRING(latest_version FROM 2) AS numeric);
  version_number := version_number + 0.01;
  
  RETURN 'v' || ROUND(version_number, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_active_mapping to optionally filter by category
CREATE OR REPLACE FUNCTION public.get_active_mapping(p_user_id uuid, p_name text, p_category text DEFAULT NULL)
RETURNS public.mappings AS $$
DECLARE
  result public.mappings;
BEGIN
  SELECT * INTO result
  FROM public.mappings
  WHERE user_id = p_user_id 
    AND name = p_name 
    AND is_active = true
    AND (p_category IS NULL OR category = p_category)
  ORDER BY version DESC
  LIMIT 1;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;