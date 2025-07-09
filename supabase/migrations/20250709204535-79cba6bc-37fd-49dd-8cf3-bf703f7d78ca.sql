-- Update the get_active_mapping function to ensure it returns all required fields
CREATE OR REPLACE FUNCTION public.get_active_mapping(p_user_id uuid, p_name text, p_category text DEFAULT NULL::text)
 RETURNS mappings
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$