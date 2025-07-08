-- Add mapping_group_id for proper version control
ALTER TABLE public.mappings 
ADD COLUMN IF NOT EXISTS mapping_group_id UUID DEFAULT gen_random_uuid();

-- Create index for better performance on group queries
CREATE INDEX IF NOT EXISTS idx_mappings_group_id ON public.mappings(mapping_group_id);
CREATE INDEX IF NOT EXISTS idx_mappings_user_group_active ON public.mappings(user_id, mapping_group_id, is_active);

-- Update existing mappings to have unique group IDs
-- This ensures existing mappings work with the new system
UPDATE public.mappings 
SET mapping_group_id = gen_random_uuid() 
WHERE mapping_group_id IS NULL;

-- Make mapping_group_id NOT NULL after populating existing records
ALTER TABLE public.mappings 
ALTER COLUMN mapping_group_id SET NOT NULL;