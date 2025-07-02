export class TemplateGenerationService {
  static generateTemplateFromExamples(sourceData: any[], outputExample: any): string {
    if (!sourceData.length || !outputExample) {
      throw new Error('Both source data and output example are required');
    }

    const firstRecord = sourceData[0];
    const generatedTemplate: any = {};

    // Recursively process the output example to find matching fields
    const processObject = (obj: any, sourceObj: any, path: string = ''): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map((item, index) => 
          processObject(item, sourceObj, `${path}[${index}]`)
        );
      }

      const result: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'object' && value !== null) {
          result[key] = processObject(value, sourceObj, currentPath);
        } else {
          // Try to find a matching field in source data
          const mappingResult = this.findMatchingSourceField(key, value, sourceObj, currentPath);
          if (mappingResult !== null) {
            // Check if it's a static value or template variable
            if (mappingResult.startsWith('{{ ') && mappingResult.endsWith(' }}')) {
              result[key] = mappingResult; // Template variable without quotes
            } else {
              result[key] = `"${mappingResult}"`; // Static value with quotes
            }
          } else {
            // Unmapped value - add comment to indicate it's static
            result[key] = value;
            result[`${key}_UNMAPPED`] = "// This value could not be mapped to source data";
          }
        }
      }
      
      return result;
    };

    const template = processObject(outputExample, firstRecord);
    
    // Convert to JSON string and then fix numeric field formatting
    let jsonString = JSON.stringify(template, null, 2);
    
    // Remove quotes from numeric template variables
    jsonString = this.formatNumericFields(jsonString);
    
    // Clean up unmapped field comments
    jsonString = jsonString.replace(/,?\s*"[^"]+_UNMAPPED":\s*"[^"]*"/g, '');
    
    return jsonString;
  }

  private static formatNumericFields(jsonString: string): string {
    // Pattern to match numeric field template variables that are quoted
    // This will match: "fieldName": "{{ variableName }}" where fieldName suggests it's numeric
    const numericFieldPatterns = [
      /("(?:line|Line)Number":\s*)"(\{\{\s*[^}]+\s*\}\})"/g,
      /("(?:delivery|Delivery)LineNumber":\s*)"(\{\{\s*[^}]+\s*\}\})"/g,
      /("(?:order|Order)LineNumber":\s*)"(\{\{\s*[^}]+\s*\}\})"/g,
      /("(?:number|Number|count|Count|index|Index|quantity|Quantity)":\s*)"(\{\{\s*[^}]+\s*\}\})"/g
    ];

    let result = jsonString;
    numericFieldPatterns.forEach(pattern => {
      result = result.replace(pattern, '$1$2');
    });

    return result;
  }

  private static findMatchingSourceField(outputKey: string, outputValue: any, sourceObj: any, fullPath: string): string | null {
    // Handle special ID field logic
    if (outputKey.toLowerCase() === 'id') {
      return this.generateIdTemplate(outputValue, sourceObj, fullPath);
    }

    // 1. Direct key match (case insensitive)
    const directMatch = this.findDirectMatch(outputKey, sourceObj);
    if (directMatch) {
      return `{{ ${directMatch} }}`;
    }

    // 2. Value-based matching for static values
    if (typeof outputValue === 'string' && this.isStaticValue(outputValue)) {
      return outputValue; // Keep static values as-is
    }

    // 3. Smart field mapping based on common patterns
    const smartMatch = this.getSmartMapping(outputKey, sourceObj);
    if (smartMatch) {
      return `{{ ${smartMatch} }}`;
    }

    // 4. Nested field search
    const nestedMatch = this.findNestedField(outputKey, sourceObj);
    if (nestedMatch) {
      return `{{ ${nestedMatch} }}`;
    }

    // 5. Create template variable for unmapped fields (user can connect manually)
    // This ensures we always create template variables instead of static values
    return `{{ ${outputKey} }}`;
  }

  private static generateIdTemplate(outputValue: any, sourceObj: any, fullPath: string): string {
    // Analyze the output value to understand the ID pattern
    if (typeof outputValue === 'string') {
      // Check if it's a composite ID (contains commas or other separators)
      if (outputValue.includes(',')) {
        const parts = outputValue.split(',');
        const templateParts: string[] = [];
        
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i].trim();
          
          // Determine what field this part should map to based on position and context
          if (i === 0) {
            // First part is usually orderCode
            templateParts.push('{{ orderCode }}');
          } else if (i === 1) {
            // Second part is lineNumber for both lines and deliveryLines
            templateParts.push('{{ lineNumber }}');
          } else if (i === 2) {
            // Third part is deliveryLineNumber (only in deliveryLines context)
            templateParts.push('{{ deliveryLineNumber }}');
          } else {
            // For additional parts, try to find matching field
            const matchingField = this.findBestFieldMatch(part, sourceObj);
            templateParts.push(matchingField ? `{{ ${matchingField} }}` : `{{ ${part} }}`);
          }
        }
        
        // Return as comma-separated individual template variables
        return templateParts.join(',');
      } else {
        // Simple ID, try to find the best matching field
        const matchingField = this.findBestFieldMatch(outputValue, sourceObj);
        if (matchingField) {
          return `{{ ${matchingField} }}`;
        }
        
        // Try common ID field names
        const commonIdFields = ['id', 'orderCode', 'code', 'identifier'];
        for (const field of commonIdFields) {
          if (this.hasField(sourceObj, field)) {
            return `{{ ${field} }}`;
          }
        }
      }
    }
    
    // Fallback to the original value
    return outputValue;
  }

  private static findBestFieldMatch(value: string, sourceObj: any): string | null {
    // Try direct match first
    if (this.hasField(sourceObj, value)) {
      return value;
    }
    
    // Try case-insensitive match
    const directMatch = this.findDirectMatch(value, sourceObj);
    if (directMatch) {
      return directMatch;
    }
    
    // For specific patterns
    if (value.toLowerCase().includes('order')) {
      const orderField = this.findDirectMatch('orderCode', sourceObj) || 
                        this.findDirectMatch('order', sourceObj);
      if (orderField) return orderField;
    }
    
    return null;
  }

  private static findNumberFieldMatch(fullPath: string, sourceObj: any): string | null {
    // Based on the path, determine what kind of number field this might be
    if (fullPath.includes('lines[') && !fullPath.includes('deliveryLines[')) {
      return this.findDirectMatch('lineNumber', sourceObj);
    } else if (fullPath.includes('deliveryLines[')) {
      return this.findDirectMatch('deliveryLineNumber', sourceObj);
    }
    return null;
  }

  private static isNumberField(outputKey: string, outputValue: any, sourceObj: any, fieldPath: string): boolean {
    // Check if the field should be treated as a number (without quotes)
    const numberFieldPatterns = [
      'number', 'count', 'index', 'id', 'line', 'quantity', 'amount'
    ];
    
    const keyLower = outputKey.toLowerCase();
    const isNumberPattern = numberFieldPatterns.some(pattern => keyLower.includes(pattern));
    
    // Also check if the source field contains numeric values
    const sourceValue = this.getFieldValue(sourceObj, fieldPath);
    const isNumericValue = typeof sourceValue === 'number' || 
                          (typeof sourceValue === 'string' && !isNaN(Number(sourceValue)) && sourceValue.trim() !== '');
    
    return isNumberPattern || isNumericValue;
  }

  private static isStaticValue(value: string): boolean {
    // Values that should remain static (not converted to template variables)
    const staticValues = ['ATA', 'ETD', 'ETA', 'CONFIRMED', 'PENDING'];
    return staticValues.includes(value.toUpperCase());
  }

  private static looksLikeNumber(value: string): boolean {
    return /^\d+$/.test(value.trim());
  }

  private static hasField(obj: any, fieldName: string): boolean {
    return obj && typeof obj === 'object' && fieldName in obj;
  }

  private static getFieldValue(obj: any, path: string): any {
    try {
      const parts = path.split('.');
      let current = obj;
      
      for (const part of parts) {
        if (part.includes('[') && part.includes(']')) {
          const [arrayName, indexStr] = part.split('[');
          const index = parseInt(indexStr.replace(']', ''));
          current = current[arrayName];
          if (!Array.isArray(current) || !current[index]) return undefined;
          current = current[index];
        } else {
          if (!current || typeof current !== 'object' || !(part in current)) {
            return undefined;
          }
          current = current[part];
        }
      }
      
      return current;
    } catch {
      return undefined;
    }
  }

  private static findDirectMatch(key: string, obj: any, prefix: string = ''): string | null {
    const normalizedKey = key.toLowerCase().replace(/[_-]/g, '');
    
    for (const [objKey, objValue] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${objKey}` : objKey;
      const normalizedObjKey = objKey.toLowerCase().replace(/[_-]/g, '');
      
      if (normalizedObjKey === normalizedKey) {
        return fullKey;
      }
      
      if (typeof objValue === 'object' && objValue !== null && !Array.isArray(objValue)) {
        const nested = this.findDirectMatch(key, objValue, fullKey);
        if (nested) return nested;
      }
    }
    
    return null;
  }

  private static getSmartMapping(outputKey: string, sourceObj: any): string | null {
    const mappings: Record<string, string[]> = {
      'ID': ['id', '_id', 'ID', 'identifier', 'orderCode'],
      'Reference': ['client_reference', 'reference', 'ref', 'Reference'],
      'Container_number': ['containers[0].container_number', 'container_number', 'containerNumber'],
      'Delivery_date': ['itinerary.actual_time_of_arrival', 'actual_time_of_arrival', 'delivery_date', 'deliveryDate'],
      'DeliveryDate_Type': ['delivery_type', 'date_type']
    };

    const possibleFields = mappings[outputKey];
    if (!possibleFields) return null;

    for (const field of possibleFields) {
      if (this.hasNestedField(sourceObj, field)) {
        return field;
      }
    }

    return null;
  }

  private static findNestedField(searchKey: string, obj: any, currentPath: string = ''): string | null {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;
      
      if (key.toLowerCase().includes(searchKey.toLowerCase()) || 
          searchKey.toLowerCase().includes(key.toLowerCase())) {
        return fullPath;
      }
      
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value) && value.length > 0) {
          const nested = this.findNestedField(searchKey, value[0], `${fullPath}[0]`);
          if (nested) return nested;
        } else {
          const nested = this.findNestedField(searchKey, value, fullPath);
          if (nested) return nested;
        }
      }
    }
    
    return null;
  }

  private static hasNestedField(obj: any, path: string): boolean {
    try {
      const parts = path.split('.');
      let current = obj;
      
      for (const part of parts) {
        if (part.includes('[') && part.includes(']')) {
          const [arrayName, indexStr] = part.split('[');
          const index = parseInt(indexStr.replace(']', ''));
          current = current[arrayName];
          if (!Array.isArray(current) || !current[index]) return false;
          current = current[index];
        } else {
          if (!current || typeof current !== 'object' || !(part in current)) {
            return false;
          }
          current = current[part];
        }
      }
      
      return current !== undefined;
    } catch {
      return false;
    }
  }
}
