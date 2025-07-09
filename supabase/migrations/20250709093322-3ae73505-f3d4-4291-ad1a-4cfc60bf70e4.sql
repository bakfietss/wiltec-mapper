-- Create transform_types table to store all supported conversion operations
CREATE TABLE public.transform_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  input_format TEXT NOT NULL,
  output_format TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transform_types ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read transform types (they're reference data)
CREATE POLICY "Transform types are viewable by everyone" 
ON public.transform_types 
FOR SELECT 
USING (is_active = true);

-- Insert all supported transform types based on Weavo API
INSERT INTO public.transform_types (name, display_name, description, input_format, output_format, category) VALUES
-- JSON conversions
('JsonToJson', 'JSON to JSON', 'Transform a JSON object to another JSON object', 'JSON', 'JSON', 'JSON'),
('JsonToXml', 'JSON to XML', 'Transform a JSON object to an XML object', 'JSON', 'XML', 'JSON'),
('JsonToText', 'JSON to Text', 'Transform a JSON object to text', 'JSON', 'TEXT', 'JSON'),
('JsonToExcel', 'JSON to Excel', 'Transform a JSON object to an Excel file', 'JSON', 'EXCEL', 'JSON'),

-- XML conversions  
('XmlToJson', 'XML to JSON', 'Transform an XML object to a JSON object', 'XML', 'JSON', 'XML'),
('XmlToXml', 'XML to XML', 'Transform an XML object to another XML object', 'XML', 'XML', 'XML'),
('XmlToText', 'XML to Text', 'Transform an XML object to text', 'XML', 'TEXT', 'XML'),
('XmlToExcel', 'XML to Excel', 'Transform an XML object to an Excel file', 'XML', 'EXCEL', 'XML'),

-- CSV conversions
('CsvToJson', 'CSV to JSON', 'Transform a CSV to a JSON object', 'CSV', 'JSON', 'CSV'),
('CsvToXml', 'CSV to XML', 'Transform a CSV to an XML object', 'CSV', 'XML', 'CSV'), 
('CsvToText', 'CSV to Text', 'Transform a CSV to text', 'CSV', 'TEXT', 'CSV'),
('CsvToExcel', 'CSV to Excel', 'Transform a CSV to an Excel file', 'CSV', 'EXCEL', 'CSV'),

-- Excel conversions
('ExcelToJson', 'Excel to JSON', 'Transform an Excel file to a JSON object', 'EXCEL', 'JSON', 'EXCEL'),
('ExcelToXml', 'Excel to XML', 'Transform an Excel file to an XML object', 'EXCEL', 'XML', 'EXCEL'),
('ExcelToText', 'Excel to Text', 'Transform an Excel file to text', 'EXCEL', 'TEXT', 'EXCEL'),

-- EDI conversions
('EdiToJson', 'EDI to JSON', 'Transform an EDI file to a JSON object (X12, EDIFACT, EANCOM, etc.)', 'EDI', 'JSON', 'EDI'),
('EdiToXml', 'EDI to XML', 'Transform an EDI file to an XML object', 'EDI', 'XML', 'EDI'),
('EdiToText', 'EDI to Text', 'Transform an EDI file to text', 'EDI', 'TEXT', 'EDI');

-- Add foreign key constraint to mappings table
ALTER TABLE public.mappings 
ADD CONSTRAINT fk_mappings_transform_type 
FOREIGN KEY (transform_type) REFERENCES public.transform_types(name);

-- Create indexes for better performance
CREATE INDEX idx_transform_types_category ON public.transform_types(category);
CREATE INDEX idx_transform_types_input_format ON public.transform_types(input_format);
CREATE INDEX idx_transform_types_output_format ON public.transform_types(output_format);

-- Add trigger for updated_at
CREATE TRIGGER update_transform_types_updated_at
BEFORE UPDATE ON public.transform_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.transform_types IS 'Supported data transformation operation types';
COMMENT ON COLUMN public.transform_types.name IS 'Unique identifier used in API calls (e.g. JsonToJson)';
COMMENT ON COLUMN public.transform_types.display_name IS 'Human-readable name for UI display';
COMMENT ON COLUMN public.transform_types.input_format IS 'Expected input data format';
COMMENT ON COLUMN public.transform_types.output_format IS 'Resulting output data format';
COMMENT ON COLUMN public.transform_types.category IS 'Category grouping for UI organization';