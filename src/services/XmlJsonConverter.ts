export class XmlJsonConverter {
  /**
   * Convert XML string to JSON structure for analysis
   */
  static xmlToJson(xmlString: string): any {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Invalid XML format');
      }
      
      return this.elementToJson(xmlDoc.documentElement);
    } catch (error) {
      throw new Error(`XML parsing failed: ${error}`);
    }
  }

  /**
   * Convert JSON structure back to XML string
   */
  static jsonToXml(jsonObj: any, rootElement?: string): string {
    if (!jsonObj) return '';
    
    const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>';
    
    // Handle the specific case where we have a properly structured object
    if (typeof jsonObj === 'object' && !Array.isArray(jsonObj)) {
      // Find the root element (first key that's not an attribute)
      const rootKey = Object.keys(jsonObj).find(key => !key.startsWith('@')) || 'root';
      const rootData = jsonObj[rootKey] || jsonObj;
      
      return xmlDeclaration + '\n' + this.objectToXmlElementEnhanced(rootElement || rootKey, rootData);
    }
    
    return xmlDeclaration + '\n' + this.objectToXmlElementEnhanced(rootElement || 'root', jsonObj);
  }


  /**
   * Convert DOM element to JSON object
   */
  private static elementToJson(element: Element): any {
    const result: any = {};
    
    // Handle attributes
    if (element.attributes.length > 0) {
      result['@attributes'] = {};
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        result['@attributes'][attr.name] = attr.value;
      }
    }
    
    // Handle child elements
    const children = Array.from(element.children);
    if (children.length > 0) {
      for (const child of children) {
        const childName = child.tagName;
        const childValue = this.elementToJson(child);
        
        if (result[childName]) {
          // Convert to array if multiple elements with same name
          if (!Array.isArray(result[childName])) {
            result[childName] = [result[childName]];
          }
          result[childName].push(childValue);
        } else {
          result[childName] = childValue;
        }
      }
    }
    
    // Handle text content
    const textContent = element.textContent?.trim();
    if (textContent && children.length === 0) {
      if (result['@attributes']) {
        result['#text'] = textContent;
      } else {
        return textContent;
      }
    }
    
    return result;
  }

  /**
   * Convert JSON object to XML element string
   */
  private static objectToXmlElement(tagName: string, obj: any, indent: string = ''): string {
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return `${indent}<${tagName}>${obj}</${tagName}>`;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.objectToXmlElement(tagName, item, indent)).join('\n');
    }
    
    if (typeof obj === 'object' && obj !== null) {
      let attributes = '';
      let content = '';
      let hasChildren = false;
      
      // Handle attributes
      if (obj['@attributes']) {
        attributes = Object.entries(obj['@attributes'])
          .map(([key, value]) => ` ${key}="${value}"`)
          .join('');
      }
      
      // Handle text content
      if (obj['#text']) {
        content = obj['#text'];
      }
      
      // Handle child elements
      for (const [key, value] of Object.entries(obj)) {
        if (key !== '@attributes' && key !== '#text') {
          hasChildren = true;
          if (Array.isArray(value)) {
            content += '\n' + value.map(item => 
              this.objectToXmlElement(key, item, indent + '\t')
            ).join('\n');
          } else {
            content += '\n' + this.objectToXmlElement(key, value, indent + '\t');
          }
        }
      }
      
      if (hasChildren) {
        content += '\n' + indent;
      }
      
      if (content.trim()) {
        return `${indent}<${tagName}${attributes}>${content}</${tagName}>`;
      } else {
        return `${indent}<${tagName}${attributes}/>`;
      }
    }
    
    return `${indent}<${tagName}></${tagName}>`;
  }

  /**
   * Enhanced XML to JSON conversion that better handles your specific XML structure
   */
  static xmlToJsonEnhanced(xmlString: string): any {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Invalid XML format');
      }
      
      // Get the root element and convert it properly
      const rootElement = xmlDoc.documentElement;
      const result = this.elementToJsonEnhanced(rootElement);
      
      console.log('🔍 XML parsed to JSON:', result);
      
      // Return the structure with the correct root element name
      return { [rootElement.tagName]: result };
    } catch (error) {
      console.error('❌ XML parsing error:', error);
      throw new Error(`XML parsing failed: ${error}`);
    }
  }

  /**
   * Enhanced element to JSON conversion
   */
  private static elementToJsonEnhanced(element: Element): any {
    const result: any = {};
    
    // Handle attributes - store them properly as strings
    if (element.attributes.length > 0) {
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        result[`@${attr.name}`] = attr.value; // Ensure it's stored as string
      }
    }
    
    // Handle child elements
    const children = Array.from(element.children);
    if (children.length > 0) {
      for (const child of children) {
        const childName = child.tagName;
        const childValue = this.elementToJsonEnhanced(child);
        
        if (result[childName]) {
          // Convert to array if multiple elements with same name
          if (!Array.isArray(result[childName])) {
            result[childName] = [result[childName]];
          }
          result[childName].push(childValue);
        } else {
          result[childName] = childValue;
        }
      }
    }
    
    // Handle text content
    const textContent = element.textContent?.trim();
    if (textContent && children.length === 0) {
      if (Object.keys(result).length > 0) {
        result['#text'] = textContent;
      } else {
        return textContent;
      }
    }
    
    // If no content and no attributes, return empty object
    if (Object.keys(result).length === 0) {
      return {};
    }
    
    return result;
  }

  /**
   * Enhanced XML element generation that handles attributes properly
   */
  private static objectToXmlElementEnhanced(tagName: string, obj: any, indent: string = ''): string {
    console.log(`🏗️ Converting to XML element: ${tagName}`, obj);
    
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return `${indent}<${tagName}>${obj}</${tagName}>`;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.objectToXmlElementEnhanced(tagName, item, indent)).join('\n');
    }
    
    if (typeof obj === 'object' && obj !== null) {
      let attributes = '';
      let content = '';
      let hasChildren = false;
      
      // Handle attributes (keys starting with @)
      const attrKeys = Object.keys(obj).filter(key => key.startsWith('@'));
      if (attrKeys.length > 0) {
        attributes = attrKeys
          .map(key => {
            const attrName = key.substring(1);
            const attrValue = obj[key];
            // Ensure attribute value is properly stringified
            const stringValue = typeof attrValue === 'string' ? attrValue : String(attrValue);
            return ` ${attrName}="${stringValue}"`;
          })
          .join('');
      }
      
      // Handle text content
      if (obj['#text']) {
        content = obj['#text'];
      }
      
      // Handle child elements (keys not starting with @ or #)
      const childKeys = Object.keys(obj).filter(key => !key.startsWith('@') && key !== '#text');
      for (const key of childKeys) {
        hasChildren = true;
        const value = obj[key];
        if (Array.isArray(value)) {
          content += '\n' + value.map(item => 
            this.objectToXmlElementEnhanced(key, item, indent + '\t')
          ).join('\n');
        } else {
          content += '\n' + this.objectToXmlElementEnhanced(key, value, indent + '\t');
        }
      }
      
      if (hasChildren) {
        content += '\n' + indent;
      }
      
      if (content.trim()) {
        return `${indent}<${tagName}${attributes}>${content}</${tagName}>`;
      } else {
        return `${indent}<${tagName}${attributes}/>`;
      }
    }
    
    return `${indent}<${tagName}></${tagName}>`;
  }

  /**
   * Auto-detect if string is XML or JSON
   */
  static detectFormat(input: string): 'xml' | 'json' | 'unknown' {
    const trimmed = input.trim();
    
    if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) {
      return 'xml';
    }
    
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }
    
    return 'unknown';
  }

  /**
   * Normalize data for pattern analysis - convert both XML and JSON to consistent format
   */
  static normalizeForAnalysis(input: string): any {
    const format = this.detectFormat(input);
    
    if (format === 'xml') {
      return this.xmlToJson(input);
    } else if (format === 'json') {
      return JSON.parse(input);
    } else {
      throw new Error('Unsupported format - please provide valid XML or JSON');
    }
  }
}