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
      console.log('🔄 Converting template to nodes...', template.substring(0, 100));
      
      let parsedTemplate;
      
      // Detect format and handle accordingly
      if (template.trim().startsWith('<?xml') || template.trim().startsWith('<')) {
        console.log('📄 Detected XML template, converting to JSON structure for node generation...');
        // For XML templates, we need to create a JSON representation for the node system
        parsedTemplate = this.xmlTemplateToJsonStructure(template);
      } else {
        // Clean the template by removing comments and extra whitespace
        let cleanedTemplate = template
          .replace(/\/\/.*$/gm, '') // Remove single-line comments
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
          .trim();
        
        // Fix unquoted template variables in JSON (make them temporarily valid for parsing)
        cleanedTemplate = cleanedTemplate.replace(/:\s*\{\{\s*([^}]+)\s*\}\}/g, ': "{{$1}}"');
        
        console.log('Cleaned template:', cleanedTemplate);
        parsedTemplate = JSON.parse(cleanedTemplate);
      }
      
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
              type: 'array'
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
              children: generateSchemaFields(value, fieldId)
            };
            fields.push(field);
          } else {
            const field: any = {
              id: fieldId,
              name: key,
              type: typeof value === 'number' ? 'number' : 
                    typeof value === 'boolean' ? 'boolean' : 
                    value instanceof Date ? 'date' : 'string'
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

      // Helper function to generate target fields from template
      const generateTargetFields = (template: any, prefix = ''): any[] => {
        const fields: any[] = [];
        
        Object.entries(template).forEach(([key, value]) => {
          const fieldId = prefix ? `${prefix}.${key}` : key;
          
          if (Array.isArray(value)) {
            const field: any = {
              id: fieldId,
              name: key,
              type: 'array'
            };
            
            if (value.length > 0 && typeof value[0] === 'object') {
              field.children = generateTargetFields(value[0], `${fieldId}[0]`);
            }
            
            fields.push(field);
          } else if (value && typeof value === 'object') {
            const field: any = {
              id: fieldId,
              name: key,
              type: 'object',
              children: generateTargetFields(value, fieldId)
            };
            fields.push(field);
          } else {
            const field: any = {
              id: fieldId,
              name: key,
              type: 'string' // Templates are typically string outputs
            };
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
      
      // Group template variables by target path to detect multiple variables per field
      const variablesByTarget = new Map<string, Array<{variable: string, targetPath: string}>>();
      allTemplateVariables.forEach(item => {
        if (!variablesByTarget.has(item.targetPath)) {
          variablesByTarget.set(item.targetPath, []);
        }
        variablesByTarget.get(item.targetPath)!.push(item);
      });
      
      // Process each target field
      variablesByTarget.forEach((variables, targetPath) => {
        if (variables.length === 1) {
          // Single variable - direct connection
          const {variable} = variables[0];
          const matchingSourceField = this.findBestSourceFieldMatch(variable, sourceFields);
          
          if (matchingSourceField) {
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

            edges.push({
              id: `edge-${staticNodeId}-${targetPath}`,
              source: staticNodeId,
              target: targetNodeId,
              targetHandle: targetPath
            });

            yPosition += spacing;
          }
        } else {
          // Multiple variables - create concat node
          const concatNodeId = `concat-${nodeCounter++}`;
          const rules = variables.map((item, index) => ({
            id: `rule-${item.variable}-${index}`,
            priority: index + 1,
            sourceField: item.variable,
            sourceHandle: `rule-${item.variable}-${index}`
          }));
          
          nodes.push({
            id: concatNodeId,
            type: 'concat',
            position: { x: 400, y: yPosition },
            data: {
              label: 'Concat Transform',
              transformType: 'concat',
              rules: rules,
              delimiter: '',
              outputType: 'value',
              inputValues: {}
            }
          });

          // Connect source fields to concat node
          variables.forEach((item, index) => {
            const matchingSourceField = this.findBestSourceFieldMatch(item.variable, sourceFields);
            if (matchingSourceField) {
              edges.push({
                id: `edge-${matchingSourceField}-${rules[index].id}`,
                source: sourceNodeId,
                target: concatNodeId,
                sourceHandle: matchingSourceField,
                targetHandle: rules[index].id
              });
            }
          });

          // Connect concat node to target
          edges.push({
            id: `edge-${concatNodeId}-${targetPath}`,
            source: concatNodeId,
            target: targetNodeId,
            targetHandle: targetPath
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

  // Helper method to convert XML template to JSON structure for node generation
  static xmlTemplateToJsonStructure(xmlTemplate: string): any {
    try {
      // Extract template variables from XML
      const templateVars = xmlTemplate.match(/\{\{\s*([^}]+)\s*\}\}/g) || [];
      console.log('🔍 Found template variables in XML:', templateVars);
      
      // Create a simplified JSON structure that represents the XML mapping
      const jsonStructure: any = {};
      
      // Parse out XML structure - simplified approach for node generation
      templateVars.forEach((templateVar, index) => {
        const fieldName = templateVar.replace(/\{\{\s*|\s*\}\}/g, '');
        jsonStructure[`mapping_${index}`] = templateVar;
      });
      
      // If no template variables found, create a basic structure
      if (Object.keys(jsonStructure).length === 0) {
        jsonStructure.xml_output = "XML_OUTPUT";
      }
      
      console.log('📊 Generated JSON structure from XML:', jsonStructure);
      return jsonStructure;
    } catch (error) {
      console.error('❌ XML template parsing error:', error);
      // Return a fallback structure
      return { xml_template: "XML_TEMPLATE" };
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