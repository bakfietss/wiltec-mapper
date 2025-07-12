
export type FlatObject = { [key: string]: any };

export function flattenObject(obj: any, prefix = ''): FlatObject {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flattenObject(value, fullKey));
    } else if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'object') {
      Object.assign(acc, flattenObject(value[0], fullKey));
    } else {
      acc[fullKey] = value;
    }
    return acc;
  }, {} as FlatObject);
}

export function flattenJsonData(data: any): FlatObject[] {
  // Handle different JSON structures
  const rows = Array.isArray(data) ? data : ((data as any).rows || [data]);
  return rows.map((item: any) => flattenObject(item));
}

export function flattenXmlData(xmlString: string): FlatObject[] {
  try {
    // Parse XML using DOMParser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Invalid XML format');
    }
    
    // Convert XML to objects
    const convertXmlToObject = (element: Element): any => {
      const obj: any = {};
      
      // Handle attributes
      if (element.attributes.length > 0) {
        Array.from(element.attributes).forEach(attr => {
          obj[`@${attr.name}`] = attr.value;
        });
      }
      
      // Handle child elements
      const children = Array.from(element.children);
      if (children.length > 0) {
        children.forEach(child => {
          const childName = child.tagName;
          const childValue = convertXmlToObject(child);
          
          if (obj[childName]) {
            // If multiple elements with same name, convert to array
            if (!Array.isArray(obj[childName])) {
              obj[childName] = [obj[childName]];
            }
            obj[childName].push(childValue);
          } else {
            obj[childName] = childValue;
          }
        });
      } else {
        // Handle text content
        const textContent = element.textContent?.trim();
        if (textContent) {
          return textContent;
        }
      }
      
      return obj;
    };
    
    // Get root element and convert
    const rootElement = xmlDoc.documentElement;
    const rootObject = convertXmlToObject(rootElement);
    
    // Try to find repeating elements (like persons, items, etc.)
    const findArrays = (obj: any): any[] => {
      const arrays: any[] = [];
      
      const traverse = (current: any) => {
        if (Array.isArray(current)) {
          arrays.push(current);
        } else if (current && typeof current === 'object') {
          Object.values(current).forEach(traverse);
        }
      };
      
      traverse(obj);
      return arrays;
    };
    
    const arrays = findArrays(rootObject);
    
    // If we found arrays, use the largest one (likely the main data)
    if (arrays.length > 0) {
      const largestArray = arrays.reduce((a, b) => a.length > b.length ? a : b);
      return largestArray.map((item: any) => flattenObject(item));
    }
    
    // If no arrays found, treat the root object as a single item
    return [flattenObject(rootObject)];
    
  } catch (error) {
    console.error('Error parsing XML:', error);
    throw new Error(`Failed to parse XML: ${error}`);
  }
}

export function flattenCsvData(csvData: any[]): FlatObject[] {
  // CSV data is usually already flat, but we can still process it
  return csvData.map((row: any) => flattenObject(row));
}
