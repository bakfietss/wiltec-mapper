
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
          const templateVar = this.findMatchingSourceField(key, value, sourceObj);
          result[key] = templateVar || value;
        }
      }
      
      return result;
    };

    const template = processObject(outputExample, firstRecord);
    return JSON.stringify(template, null, 2);
  }

  private static findMatchingSourceField(outputKey: string, outputValue: any, sourceObj: any): string | null {
    // 1. Direct key match (case insensitive)
    const directMatch = this.findDirectMatch(outputKey, sourceObj);
    if (directMatch) return `{{ ${directMatch} }}`;

    // 2. Value-based matching for static values
    if (typeof outputValue === 'string' && outputValue === 'ATA') {
      return outputValue; // Keep static values as is
    }

    // 3. Smart field mapping based on common patterns
    const smartMatch = this.getSmartMapping(outputKey, sourceObj);
    if (smartMatch) return `{{ ${smartMatch} }}`;

    // 4. Nested field search
    const nestedMatch = this.findNestedField(outputKey, sourceObj);
    if (nestedMatch) return `{{ ${nestedMatch} }}`;

    return null;
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
      'ID': ['id', '_id', 'ID', 'identifier'],
      'Reference': ['client_reference', 'reference', 'ref', 'Reference'],
      'Container_number': ['containers[0].container_number', 'container_number', 'containerNumber'],
      'Delivery_date': ['itinerary.actual_time_of_arrival', 'actual_time_of_arrival', 'delivery_date', 'deliveryDate'],
      'DeliveryDate_Type': ['delivery_type', 'date_type'] // Usually static
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
