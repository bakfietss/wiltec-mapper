
export interface SmartAlert {
  type: 'mapping_table' | 'id_field' | 'date_field' | 'nested_data' | 'array_field';
  field: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  values?: any[];
  suggestion?: string;
}

export class SmartAlertService {
  static analyzeData(data: any[]): SmartAlert[] {
    if (!data.length) return [];

    const alerts: SmartAlert[] = [];
    const sampleRecord = data[0];
    
    Object.entries(sampleRecord).forEach(([fieldName, value]) => {
      // Get unique values for this field
      const uniqueValues = [...new Set(data.map(record => record[fieldName]))];
      
      // Check for fields that need mapping tables
      if (this.needsMappingTable(uniqueValues, data.length)) {
        alerts.push({
          type: 'mapping_table',
          field: fieldName,
          message: `Field "${fieldName}" has ${uniqueValues.length} unique values - likely needs a mapping table`,
          severity: 'warning',
          values: uniqueValues.slice(0, 5),
          suggestion: 'Add a Conversion Mapping node to handle value translations'
        });
      }
      
      // Check for ID fields
      if (this.isIdField(fieldName, value)) {
        alerts.push({
          type: 'id_field',
          field: fieldName,
          message: `Field "${fieldName}" appears to be an identifier - might need substring or lookup`,
          severity: 'info',
          suggestion: 'Consider using Transform node for ID manipulation or Mapping node for lookups'
        });
      }
      
      // Check for date fields
      if (this.isDateField(value)) {
        alerts.push({
          type: 'date_field',
          field: fieldName,
          message: `Field "${fieldName}" contains dates - might need formatting`,
          severity: 'info',
          suggestion: 'Add a Transform node to format dates as needed'
        });
      }
      
      // Check for nested data
      if (this.isNestedData(value)) {
        alerts.push({
          type: 'nested_data',
          field: fieldName,
          message: `Field "${fieldName}" contains nested objects - needs careful handling`,
          severity: 'warning',
          suggestion: 'Use multiple source handles or flattening transformation'
        });
      }
      
      // Check for arrays
      if (Array.isArray(value)) {
        alerts.push({
          type: 'array_field',
          field: fieldName,
          message: `Field "${fieldName}" is an array - might need array access or grouping`,
          severity: 'info',
          suggestion: 'Consider array[0] access or group-by operations'
        });
      }
    });
    
    return alerts;
  }
  
  private static needsMappingTable(uniqueValues: any[], totalRecords: number): boolean {
    // If we have multiple unique values but not too many (suggesting categories)
    return uniqueValues.length > 1 && 
           uniqueValues.length < totalRecords * 0.5 && 
           uniqueValues.length < 50;
  }
  
  private static isIdField(fieldName: string, value: any): boolean {
    const name = fieldName.toLowerCase();
    return (name.includes('id') || name.includes('code') || name.includes('nummer')) &&
           typeof value === 'string';
  }
  
  private static isDateField(value: any): boolean {
    if (typeof value !== 'string') return false;
    
    // Check for common date patterns
    const datePattern1 = /^\d{4}-\d{2}-\d{2}/;
    const datePattern2 = /^\d{2}\/\d{2}\/\d{4}/;
    
    return datePattern1.test(value) || datePattern2.test(value);
  }
  
  private static isNestedData(value: any): boolean {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
