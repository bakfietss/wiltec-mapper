-- Update the trigger to use mapping_group_id for better version control
DROP TRIGGER IF EXISTS trigger_ensure_single_active_mapping ON mappings;
DROP FUNCTION IF EXISTS ensure_single_active_mapping();

-- Create improved trigger function using mapping_group_id
CREATE OR REPLACE FUNCTION ensure_single_active_mapping()
RETURNS TRIGGER AS $$
BEGIN
  -- If this mapping is being set to active, deactivate all other versions 
  -- of the same mapping group
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
    UPDATE mappings 
    SET is_active = false 
    WHERE user_id = NEW.user_id 
      AND mapping_group_id = NEW.mapping_group_id
      AND id != NEW.id 
      AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_ensure_single_active_mapping
  BEFORE INSERT OR UPDATE ON mappings
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_mapping();

-- Update the unique constraint to use mapping_group_id
DROP INDEX IF EXISTS idx_unique_active_mapping_per_name_category;
CREATE UNIQUE INDEX idx_unique_active_mapping_per_group 
ON mappings (user_id, mapping_group_id) 
WHERE is_active = true;