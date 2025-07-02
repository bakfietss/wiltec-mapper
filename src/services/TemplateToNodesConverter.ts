export interface NodeData {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface ConversionResult {
  nodes: NodeData[];
  edges: EdgeData[];
  sourceData: any;
  template: string;
}

export class TemplateToNodesConverter {
  static convertTemplateToNodes(template: string, sourceData: any[]): ConversionResult {
    const nodes: NodeData[] = [];
    const edges: EdgeData[] = [];
    
    try {
      // Clean the template by removing comments and extra whitespace
      let cleanedTemplate = template
        .replace(/\/\/.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .trim();
      
      // Fix unquoted template variables in JSON (make them temporarily valid for parsing)
      cleanedTemplate = cleanedTemplate.replace(/:\s*\{\{\s*([^}]+)\s*\}\}/g, ': "{{$1}}"');
      
      console.log('Cleaned template:', cleanedTemplate);
      
      const parsedTemplate = JSON.parse(cleanedTemplate);
      const sampleRecord = sourceData[0] || {};
      
      // Helper function to convert object to schema fields
      const generateSchemaFields = (obj: any, prefix = ''): any[] => {
        const fields: any[] = [];
        
        Object.entries(obj).forEach(([key, value]) => {
          const fieldId = prefix ? `${prefix}.${key}` : key;
          
          if (Array.isArray(value)) {
            const field: any = {
              id: fieldId,
              name: key,
              type: 'array',
              exampleValue: value
            };
            
            // If array contains objects, add children
            if (value.length > 0 && typeof value[0] === 'object') {
              field.children = generateSchemaFields(value[0], `${fieldId}[0]`);
            }
            
            fields.push(field);
          } else if (value && typeof value === 'object') {
            const field: any = {
              id: fieldId,
              name: key,
              type: 'object',
              exampleValue: value,
              children: generateSchemaFields(value, fieldId)
            };
            fields.push(field);
          } else {
            const field: any = {
              id: fieldId,
              name: key,
              type: typeof value === 'number' ? 'number' : 
                    typeof value === 'boolean' ? 'boolean' : 
                    value instanceof Date ? 'date' : 'string',
              exampleValue: value
            };
            fields.push(field);
          }
        });
        
        return fields;
      };

      // Helper function to extract template variables from a value
      const extractTemplateVars = (value: any): string[] => {
        if (typeof value !== 'string') return [];
        const matches = value.match(/\{\{\s*([^}]+)\s*\}\}/g);
        return matches ? matches.map(match => match.replace(/\{\{\s*|\s*\}\}/g, '')) : [];
      };

      // Helper function to find available fields at a given template level
      const getAvailableFields = (templateObj: any, parentFields: string[] = []): string[] => {
        const fields = [...parentFields];
        Object.entries(templateObj).forEach(([key, value]) => {
          if (!Array.isArray(value) && typeof value !== 'object') {
            fields.push(...extractTemplateVars(value));
          }
        });
        return [...new Set(fields)]; // Remove duplicates
      };

      // Helper function to determine groupBy field for arrays
      const determineGroupBy = (arrayTemplate: any, availableParentFields: string[]): string | undefined => {
        if (!arrayTemplate || typeof arrayTemplate !== 'object') return undefined;
        
        // Get all template variables used in the array items
        const arrayFields = new Set<string>();
        const collectArrayFields = (obj: any) => {
          Object.entries(obj).forEach(([key, value]) => {
            if (typeof value === 'string') {
              extractTemplateVars(value).forEach(field => arrayFields.add(field));
            } else if (typeof value === 'object' && !Array.isArray(value)) {
              collectArrayFields(value);
            }
          });
        };
        collectArrayFields(arrayTemplate);
        
        // Find fields that exist both in parent context and array items
        const commonFields = availableParentFields.filter(field => arrayFields.has(field));
        
        if (commonFields.length === 0) return undefined;
        
        // Prefer more specific fields (longer names usually indicate more specificity)
        // Also prefer fields that don't contain 'Code' as they're usually IDs rather than grouping fields
        const preferredField = commonFields.sort((a, b) => {
          // Deprioritize fields containing 'Code' 
          const aHasCode = a.toLowerCase().includes('code');
          const bHasCode = b.toLowerCase().includes('code');
          if (aHasCode && !bHasCode) return 1;
          if (!aHasCode && bHasCode) return -1;
          
          // Otherwise prefer longer field names (more specific)
          return b.length - a.length;
        })[0];
        
        return preferredField;
      };

      // Helper function to generate target fields from template
      const generateTargetFields = (template: any, prefix = '', parentFields: string[] = []): any[] => {
        const fields: any[] = [];
        const currentLevelFields = getAvailableFields(template, parentFields);
        
        Object.entries(template).forEach(([key, value]) => {
          const fieldId = prefix ? `${prefix}.${key}` : key;
          
          if (Array.isArray(value)) {
            const field: any = {
              id: fieldId,
              name: key,
              type: 'array'
            };
            
            if (value.length > 0 && typeof value[0] === 'object') {
              // Determine groupBy field intelligently
              const groupByField = determineGroupBy(value[0], currentLevelFields);
              if (groupByField) {
                field.groupBy = groupByField;
              }
              
              field.children = generateTargetFields(value[0], `${fieldId}[0]`, currentLevelFields);
            }
            
            fields.push(field);
          } else if (value && typeof value === 'object') {
            const field: any = {
              id: fieldId,
              name: key,
              type: 'object',
              children: generateTargetFields(value, fieldId, currentLevelFields)
            };
            fields.push(field);
          } else {
            const field: any = {
              id: fieldId,
              name: key,
              type: 'string' // Templates are typically string outputs
            };
            
            // For ID fields, preserve the template structure for display
            if (key === 'id' && typeof value === 'string' && value.includes('{{')) {
              field.templateValue = value; // Store original template for reference
              // Set a readable example based on the template structure
              field.exampleValue = value; // Show the actual template variables
            }
            
            fields.push(field);
          }
        });
        
        return fields;
      };
      
      // Create source node with proper schema structure
      const sourceNodeId = 'source-1';
      const sourceFields = generateSchemaFields(sampleRecord);
      
      nodes.push({
        id: sourceNodeId,
        type: 'source',
        position: { x: 50, y: 200 },
        data: {
          label: 'Source Data',
          fields: sourceFields,
          data: sourceData
        }
      });

      // Create target node with proper schema structure
      const targetNodeId = 'target-1';
      const targetFields = generateTargetFields(parsedTemplate);
      
      nodes.push({
        id: targetNodeId,
        type: 'target',
        position: { x: 800, y: 200 },
        data: {
          label: 'Target Output',
          fields: targetFields,
          data: [],
          fieldValues: {}
        }
      });

      let nodeCounter = 1;
      let yPosition = 100;
      const spacing = 120;

      // Helper function to recursively find all template variables
      const findAllTemplateVariables = (obj: any, path: string = ''): Array<{variable: string, targetPath: string}> => {
        const variables: Array<{variable: string, targetPath: string}> = [];
        
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (Array.isArray(value)) {
            // Process array elements
            if (value.length > 0) {
              const arrayPath = `${currentPath}[0]`;
              variables.push(...findAllTemplateVariables(value[0], arrayPath));
            }
          } else if (value && typeof value === 'object') {
            // Process nested objects
            variables.push(...findAllTemplateVariables(value, currentPath));
          } else if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
            // Extract template variables from this field
            const matches = value.match(/\{\{\s*([^}]+)\s*\}\}/g);
            if (matches) {
              matches.forEach((match) => {
                const cleanVar = match.replace(/\{\{\s*|\s*\}\}/g, '');
                variables.push({
                  variable: cleanVar,
                  targetPath: currentPath
                });
              });
            }
          }
        });
        
        return variables;
      };

      // Find all template variables in the parsed template
      const allTemplateVariables = findAllTemplateVariables(parsedTemplate);
      
      // Process each template variable and create connections
      allTemplateVariables.forEach(({variable, targetPath}) => {
        // Try to find a matching source field using smart matching
        const matchingSourceField = this.findBestSourceFieldMatch(variable, sourceFields);
        
        if (matchingSourceField) {
          // Create direct connection from matched source field to target field
          edges.push({
            id: `edge-${matchingSourceField}-${targetPath}`,
            source: sourceNodeId,
            target: targetNodeId,
            sourceHandle: matchingSourceField,
            targetHandle: targetPath
          });
        } else {
          // Create static value node for unmapped fields
          const staticNodeId = `static-${nodeCounter++}`;
          
          nodes.push({
            id: staticNodeId,
            type: 'staticValue',
            position: { x: 400, y: yPosition },
            data: {
              label: 'Static Value',
              value: '',
              valueType: 'string'
            }
          });

          // Connect static to target field
          edges.push({
            id: `edge-${staticNodeId}-${targetPath}`,
            source: staticNodeId,
            target: targetNodeId,
            targetHandle: targetPath
          });

          yPosition += spacing;
        }
      });

      // Process static values at top level
      Object.entries(parsedTemplate).forEach(([targetField, templateValue]) => {
        if (typeof templateValue === 'string' && !(templateValue.includes('{{') && templateValue.includes('}}'))) {
          // Static value - create static value node
          const staticNodeId = `static-${nodeCounter++}`;
          
          nodes.push({
            id: staticNodeId,
            type: 'staticValue',
            position: { x: 400, y: yPosition },
            data: {
              label: 'Static Value',
              value: templateValue,
              valueType: 'string'
            }
          });

          // Connect static to target field
          edges.push({
            id: `edge-${staticNodeId}-${targetField}`,
            source: staticNodeId,
            target: targetNodeId,
            targetHandle: targetField
          });

          yPosition += spacing;
        }
      });

      return {
        nodes,
        edges,
        sourceData,
        template
      };

    } catch (error) {
      console.error('Error converting template to nodes:', error);
      throw new Error('Failed to parse template for node conversion');
    }
  }

  // Helper method to find the best matching source field for a template variable
  static findBestSourceFieldMatch(templateVar: string, sourceFields: any[]): string | null {
    // Flatten the source fields to get all possible field paths
    const flattenFields = (fields: any[], prefix = ''): string[] => {
      const result: string[] = [];
      
      fields.forEach(field => {
        const fieldPath = prefix ? `${prefix}.${field.name}` : field.name;
        result.push(fieldPath);
        result.push(field.id); // Also include the field ID
        
        if (field.children) {
          result.push(...flattenFields(field.children, fieldPath));
        }
      });
      
      return result;
    };
    
    const allFieldPaths = flattenFields(sourceFields);
    
    // Try exact match first
    const exactMatch = allFieldPaths.find(path => 
      path.toLowerCase() === templateVar.toLowerCase()
    );
    if (exactMatch) return exactMatch;
    
    // Try partial matches
    const partialMatch = allFieldPaths.find(path => 
      path.toLowerCase().includes(templateVar.toLowerCase()) ||
      templateVar.toLowerCase().includes(path.toLowerCase())
    );
    if (partialMatch) return partialMatch;
    
    // Try matching by removing common separators
    const normalizedTemplateVar = templateVar.toLowerCase().replace(/[_-]/g, '');
    const normalizedMatch = allFieldPaths.find(path => {
      const normalizedPath = path.toLowerCase().replace(/[_-]/g, '');
      return normalizedPath === normalizedTemplateVar ||
             normalizedPath.includes(normalizedTemplateVar) ||
             normalizedTemplateVar.includes(normalizedPath);
    });
    
    return normalizedMatch || null;
  }

  static storeConversionData(conversionResult: ConversionResult): void {
    localStorage.setItem('template-conversion', JSON.stringify(conversionResult));
  }

  static getConversionData(): ConversionResult | null {
    try {
      const data = localStorage.getItem('template-conversion');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static clearConversionData(): void {
    localStorage.removeItem('template-conversion');
  }
}