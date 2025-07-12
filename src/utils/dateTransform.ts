import { format, parse, parseISO, isValid } from 'date-fns';

export interface DateTransformConfig {
  inputDateFormat?: string;
  outputDateFormat?: string;
}

/**
 * Transform a date value from one format to another
 */
export function transformDate(value: any, config: DateTransformConfig): string {
  const { inputDateFormat, outputDateFormat } = config;
  
  if (!value || !inputDateFormat || !outputDateFormat) {
    console.log('Date transform missing params:', { value, inputDateFormat, outputDateFormat });
    return String(value || '');
  }

  console.log('Date transform started:', { value, inputDateFormat, outputDateFormat });
  
  try {
    let parsedDate: Date;

    // Handle auto-detect or ISO format
    if (inputDateFormat === 'auto' || inputDateFormat === 'ISO') {
      parsedDate = parseISO(String(value));
    } else {
      // Parse with specific format
      const formatMap: Record<string, string> = {
        'YYYY-MM-DD': 'yyyy-MM-dd',
        'DD/MM/YYYY': 'dd/MM/yyyy',
        'MM/DD/YYYY': 'MM/dd/yyyy',
        'DD-MM-YYYY': 'dd-MM-yyyy',
        'YYYY/MM/DD': 'yyyy/MM/dd',
      };
      
      const dateFormat = formatMap[inputDateFormat] || inputDateFormat;
      parsedDate = parse(String(value), dateFormat, new Date());
    }

    // Check if parsing was successful
    if (!isValid(parsedDate)) {
      console.warn(`Failed to parse date: ${value} with format: ${inputDateFormat}`);
      return String(value);
    }

    // Format to output format
    const outputFormatMap: Record<string, string> = {
      'YYYY-MM-DD': 'yyyy-MM-dd',
      'DD/MM/YYYY': 'dd/MM/yyyy',
      'MM/DD/YYYY': 'MM/dd/yyyy',
      'DD-MM-YYYY': 'dd-MM-yyyy',
      'YYYY/MM/DD': 'yyyy/MM/dd',
      'ISO': "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
    };

    const outputFormat = outputFormatMap[outputDateFormat] || outputDateFormat;
    const result = format(parsedDate, outputFormat);
    console.log('Date transform success:', { input: value, output: result });
    return result;

  } catch (error) {
    console.error('Date transformation error:', error);
    return String(value);
  }
}