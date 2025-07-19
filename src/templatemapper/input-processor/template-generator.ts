import { TemplateGeneratorConfig } from '../types';

export const generateTemplate = async (sourceData: string): Promise<any> => {
  try {
    const parsedData = JSON.parse(sourceData);
    
    // Basic conversion logic - generates a simple template from the source data structure
    let template;
    if (Array.isArray(parsedData)) {
      // Use first item as template structure
      template = createTemplateFromObject(parsedData[0] || {});
    } else if (parsedData.rows && Array.isArray(parsedData.rows)) {
      // Handle {rows: [...]} structure  
      template = createTemplateFromObject(parsedData.rows[0] || {});
    } else {
      template = createTemplateFromObject(parsedData);
    }
    
    return template;
  } catch (error) {
    console.error('Template generation error:', error);
    throw error;
  }
};

export const createTemplateFromObject = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.length > 0 ? [createTemplateFromObject(obj[0])] : [];
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = createTemplateFromObject(value);
    }
    return result;
  }
  
  // Convert primitive values to template variables
  if (typeof obj === 'string') {
    return `{{ ${obj} }}`; // You can customize this logic
  }
  
  return `{{ value }}`;
};