-- Fix the current state where both versions are active
-- Deactivate the older version (v1.02) of ricktest12
UPDATE mappings 
SET is_active = false 
WHERE name = 'ricktest12' 
  AND category = 'General' 
  AND version = 'v1.02';