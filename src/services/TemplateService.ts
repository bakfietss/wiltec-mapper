
export interface MappingTemplate {
  name: string;
  description: string;
  confidence: number;
  nodes: string[];
  pattern: string;
  suggestedTransforms?: string[];
}

export class TemplateService {
  static analyzeForTemplates(data: any[]): MappingTemplate[] {
    if (!data.length) return [];

    const templates: MappingTemplate[] = [];
    const sampleRecord = data[0];
    const fieldNames = Object.keys(sampleRecord);
    
    // Employee/HR data template
    if (this.isEmployeeData(fieldNames, sampleRecord)) {
      templates.push({
        name: 'Employee Data Mapping',
        description: 'Common employee/HR data transformation with mapping tables',
        confidence: this.calculateEmployeeConfidence(fieldNames),
        nodes: ['source', 'mapping_table', 'if_then', 'static_values', 'target'],
        pattern: 'employee',
        suggestedTransforms: ['Field mapping for roles', 'Conditional logic for employment type', 'Static values for constants']
      });
    }
    
    // Shipment/Logistics data template
    if (this.isShipmentData(fieldNames, sampleRecord)) {
      templates.push({
        name: 'Shipment Data Mapping',
        description: 'Logistics/shipping data with array access and coalesce',
        confidence: this.calculateShipmentConfidence(fieldNames, sampleRecord),
        nodes: ['source', 'array_access', 'coalesce', 'concat', 'target'],
        pattern: 'shipment',
        suggestedTransforms: ['Array access for container data', 'Coalesce for fallback values', 'Concatenation for IDs']
      });
    }
    
    // Simple flat data template
    if (this.isSimpleData(fieldNames, sampleRecord)) {
      templates.push({
        name: 'Simple Data Mapping',
        description: 'Direct field-to-field mapping with minimal transformation',
        confidence: this.calculateSimpleConfidence(fieldNames),
        nodes: ['source', 'static_values', 'target'],
        pattern: 'simple',
        suggestedTransforms: ['Direct field mapping', 'Static value injection']
      });
    }
    
    // Hierarchical data template
    if (this.isHierarchicalData(sampleRecord)) {
      templates.push({
        name: 'Hierarchical Data Mapping',
        description: 'Nested data structures requiring grouping and flattening',
        confidence: this.calculateHierarchicalConfidence(sampleRecord),
        nodes: ['source', 'group_by', 'flatten', 'target'],
        pattern: 'hierarchical',
        suggestedTransforms: ['Group by parent fields', 'Flatten nested structures', 'Handle one-to-many relationships']
      });
    }
    
    return templates.sort((a, b) => b.confidence - a.confidence);
  }
  
  private static isEmployeeData(fieldNames: string[], sampleRecord: any): boolean {
    const employeeFields = ['employee', 'medewerker', 'firstname', 'lastname', 'email', 'functie', 'role'];
    return employeeFields.some(field => 
      fieldNames.some(name => name.toLowerCase().includes(field))
    );
  }
  
  private static isShipmentData(fieldNames: string[], sampleRecord: any): boolean {
    const shipmentFields = ['shipment', 'container', 'client', 'itinerary', 'events'];
    return shipmentFields.some(field => 
      fieldNames.some(name => name.toLowerCase().includes(field)) ||
      (typeof sampleRecord[name] === 'object' && sampleRecord[name] !== null)
    );
  }
  
  private static isSimpleData(fieldNames: string[], sampleRecord: any): boolean {
    // Simple data has few fields and mostly primitive values
    return fieldNames.length < 10 && 
           fieldNames.every(name => 
             typeof sampleRecord[name] !== 'object' || sampleRecord[name] === null
           );
  }
  
  private static isHierarchicalData(sampleRecord: any): boolean {
    // Check for nested objects or arrays
    return Object.values(sampleRecord).some(value => 
      typeof value === 'object' && value !== null
    );
  }
  
  private static calculateEmployeeConfidence(fieldNames: string[]): number {
    const employeeIndicators = ['employee', 'medewerker', 'firstname', 'lastname', 'email', 'functie'];
    const matches = employeeIndicators.filter(indicator =>
      fieldNames.some(name => name.toLowerCase().includes(indicator))
    );
    return Math.min(95, (matches.length / employeeIndicators.length) * 100);
  }
  
  private static calculateShipmentConfidence(fieldNames: string[], sampleRecord: any): number {
    const shipmentIndicators = ['id', 'client', 'container', 'events', 'status'];
    const matches = shipmentIndicators.filter(indicator =>
      fieldNames.some(name => name.toLowerCase().includes(indicator))
    );
    const hasNestedData = Object.values(sampleRecord).some(value => 
      typeof value === 'object' && value !== null
    );
    
    let confidence = (matches.length / shipmentIndicators.length) * 100;
    if (hasNestedData) confidence += 20;
    
    return Math.min(95, confidence);
  }
  
  private static calculateSimpleConfidence(fieldNames: string[]): number {
    // Higher confidence for fewer, simpler fields
    if (fieldNames.length <= 5) return 85;
    if (fieldNames.length <= 8) return 70;
    return 50;
  }
  
  private static calculateHierarchicalConfidence(sampleRecord: any): number {
    const nestedCount = Object.values(sampleRecord).filter(value => 
      typeof value === 'object' && value !== null
    ).length;
    
    return Math.min(90, nestedCount * 20);
  }
}
