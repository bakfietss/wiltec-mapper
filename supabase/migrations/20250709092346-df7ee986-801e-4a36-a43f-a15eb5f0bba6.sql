-- Add transform_type field to track conversion operation types (JsonToJson, CsvToJson, etc.)
ALTER TABLE public.mappings 
ADD COLUMN transform_type TEXT DEFAULT 'JsonToJson';

ALTER TABLE public.mapping_logs 
ADD COLUMN transform_type TEXT;

-- Add index for better performance on conversion type queries
CREATE INDEX idx_mappings_transform_type ON public.mappings(transform_type);
CREATE INDEX idx_mapping_logs_transform_type ON public.mapping_logs(transform_type);

-- Add comment to clarify the purpose
COMMENT ON COLUMN public.mappings.transform_type IS 'Type of data conversion operation: JsonToJson, CsvToJson, XmlToJson, etc.';
COMMENT ON COLUMN public.mapping_logs.transform_type IS 'Type of data conversion operation used for this log entry';