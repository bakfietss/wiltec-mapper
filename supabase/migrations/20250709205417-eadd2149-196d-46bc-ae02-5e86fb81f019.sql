-- Create trigger function to auto-populate mapping_logs fields
CREATE OR REPLACE FUNCTION public.populate_mapping_log_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Fetch mapping details and populate the fields
  SELECT 
    m.version,
    m.category, 
    m.transform_type,
    m.name
  INTO 
    NEW.version,
    NEW.category,
    NEW.transform_type,
    NEW.mapping_name
  FROM public.mappings m
  WHERE m.id = NEW.mapping_id
    AND m.is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert on mapping_logs
CREATE TRIGGER populate_mapping_log_fields_trigger
  BEFORE INSERT ON public.mapping_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_mapping_log_fields();