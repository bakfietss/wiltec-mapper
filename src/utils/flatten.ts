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
    // Simple XML parsing for web - you might want to use a library like 'fast-xml-parser'
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    // Find all person elements (adjust based on your XML structure)
    const persons = xmlDoc.querySelectorAll('person');
    const result: FlatObject[] = [];
    
    persons.forEach(person => {
      const obj: any = {};
      
      // Convert XML node to object
      const convertXmlNodeToObject = (node: Element, parentKey = ''): any => {
        const result: any = {};
        
        // Handle attributes
        if (node.attributes.length > 0) {
          Array.from(node.attributes).forEach(attr => {
            const key = parentKey ? `${parentKey}.${attr.name}` : attr.name;
            result[key] = attr.value;
          });
        }
        
        // Handle child nodes
        if (node.children.length > 0) {
          Array.from(node.children).forEach(child => {
            const key = parentKey ? `${parentKey}.${child.tagName}` : child.tagName;
            if (child.children.length > 0) {
              Object.assign(result, convertXmlNodeToObject(child, key));
            } else {
              result[key] = child.textContent?.trim() || '';
            }
          });
        } else if (node.textContent?.trim()) {
          const key = parentKey || node.tagName;
          result[key] = node.textContent.trim();
        }
        
        return result;
      };
      
      Object.assign(obj, convertXmlNodeToObject(person));
      result.push(flattenObject(obj));
    });
    
    return result;
  } catch (error) {
    console.error('Error parsing XML:', error);
    return [];
  }
}

export function flattenCsvData(csvData: any[]): FlatObject[] {
  // CSV data is usually already flat, but we can still process it
  return csvData.map((row: any) => flattenObject(row));
}