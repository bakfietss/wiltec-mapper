-- Create users table
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- Create API keys table
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  key text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- Create mappings table with version control
CREATE TABLE public.mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  version text NOT NULL,
  config jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp WITH TIME ZONE DEFAULT now(),
  updated_at timestamp WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, name, version)
);

-- Create mapping logs table
CREATE TABLE public.mapping_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_id uuid REFERENCES public.mappings(id),
  input_payload jsonb,
  output_payload jsonb,
  status text,
  run_at timestamp WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapping_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users (users can only see their own data)
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for api_keys
CREATE POLICY "Users can view own api_keys" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own api_keys" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api_keys" ON public.api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api_keys" ON public.api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for mappings
CREATE POLICY "Users can view own mappings" ON public.mappings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mappings" ON public.mappings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mappings" ON public.mappings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mappings" ON public.mappings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for mapping_logs
CREATE POLICY "Users can view own mapping_logs" ON public.mapping_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.mappings 
      WHERE mappings.id = mapping_logs.mapping_id 
      AND mappings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own mapping_logs" ON public.mapping_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mappings 
      WHERE mappings.id = mapping_logs.mapping_id 
      AND mappings.user_id = auth.uid()
    )
  );

-- Function to get next version for a mapping
CREATE OR REPLACE FUNCTION public.get_next_version(p_user_id uuid, p_name text)
RETURNS text AS $$
DECLARE
  latest_version text;
  version_number numeric;
BEGIN
  -- Get the latest version for this mapping name
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

-- Function to get active mapping
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

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mappings_updated_at
  BEFORE UPDATE ON public.mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();