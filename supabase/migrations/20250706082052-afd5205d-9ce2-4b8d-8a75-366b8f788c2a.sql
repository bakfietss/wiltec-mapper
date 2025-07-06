-- Update RLS policies to use proper auth.uid() for individual users
DROP POLICY IF EXISTS "System user can manage all mappings" ON public.mappings;

-- Create proper RLS policies for individual user authentication
CREATE POLICY "Users can view their own mappings" ON public.mappings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mappings" ON public.mappings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mappings" ON public.mappings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mappings" ON public.mappings
  FOR DELETE USING (auth.uid() = user_id);

-- Update the get_next_version function to work with user_id (auth.uid())
CREATE OR REPLACE FUNCTION public.get_next_version(p_user_id uuid, p_name text)
RETURNS text AS $$
DECLARE
  latest_version text;
  version_number numeric;
BEGIN
  -- Get the latest version for this mapping name and user
  SELECT version INTO latest_version
  FROM public.mappings
  WHERE user_id = p_user_id AND name = p_name
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

-- Update the get_active_mapping function to work with user_id
CREATE OR REPLACE FUNCTION public.get_active_mapping(p_user_id uuid, p_name text)
RETURNS public.mappings AS $$
DECLARE
  result public.mappings;
BEGIN
  SELECT * INTO result
  FROM public.mappings
  WHERE user_id = p_user_id 
    AND name = p_name 
    AND is_active = true
  ORDER BY version DESC
  LIMIT 1;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;