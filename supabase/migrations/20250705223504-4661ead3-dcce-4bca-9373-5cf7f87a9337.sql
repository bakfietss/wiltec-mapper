-- Remove current RLS policies that block writes
DROP POLICY IF EXISTS "Users can view own mappings" ON public.mappings;
DROP POLICY IF EXISTS "Users can create own mappings" ON public.mappings;
DROP POLICY IF EXISTS "Users can update own mappings" ON public.mappings;
DROP POLICY IF EXISTS "Users can delete own mappings" ON public.mappings;

-- Add user_email column to store actual user emails as data
ALTER TABLE public.mappings ADD COLUMN IF NOT EXISTS user_email text;

-- Create new RLS policies that allow authenticated system user to do everything
CREATE POLICY "System user can manage all mappings" ON public.mappings
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Update the get_next_version function to work with user_email instead of user_id
CREATE OR REPLACE FUNCTION public.get_next_version(p_user_email text, p_name text)
RETURNS text AS $$
DECLARE
  latest_version text;
  version_number numeric;
BEGIN
  -- Get the latest version for this mapping name and user email
  SELECT version INTO latest_version
  FROM public.mappings
  WHERE user_email = p_user_email AND name = p_name
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

-- Update the get_active_mapping function to work with user_email
CREATE OR REPLACE FUNCTION public.get_active_mapping(p_user_email text, p_name text)
RETURNS public.mappings AS $$
DECLARE
  result public.mappings;
BEGIN
  SELECT * INTO result
  FROM public.mappings
  WHERE user_email = p_user_email 
    AND name = p_name 
    AND is_active = true
  ORDER BY version DESC
  LIMIT 1;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;