-- First, fix the current duplicate active state
UPDATE mappings 
SET is_active = false 
WHERE name = 'ricktest12' 
  AND category = 'General' 
  AND version = 'v1.02';

-- Create a unique partial index to ensure only one active mapping per name+category
-- This will prevent multiple active versions at the database level
CREATE UNIQUE INDEX idx_unique_active_mapping_per_name_category 
ON mappings (user_id, name, category) 
WHERE is_active = true;

-- Also create a trigger function to automatically deactivate previous versions
-- when a new version is activated
CREATE OR REPLACE FUNCTION ensure_single_active_mapping()
RETURNS TRIGGER AS $$
BEGIN
  -- If this mapping is being set to active, deactivate all other versions 
  -- of the same mapping (same user_id + name + category)
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
    UPDATE mappings 
    SET is_active = false 
    WHERE user_id = NEW.user_id 
      AND name = NEW.name 
      AND COALESCE(category, '') = COALESCE(NEW.category, '')
      AND id != NEW.id 
      AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_ensure_single_active_mapping
  BEFORE INSERT OR UPDATE ON mappings
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_mapping();