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
      const parsedTemplate = JSON.parse(template);
      const sampleRecord = sourceData[0] || {};
      
      // Create source node
      const sourceNodeId = 'source-1';
      nodes.push({
        id: sourceNodeId,
        type: 'source',
        position: { x: 50, y: 200 },
        data: {
          label: 'Source Data',
          fields: Object.keys(sampleRecord),
          sampleData: sampleRecord
        }
      });

      // Create target node
      const targetNodeId = 'target-1';
      nodes.push({
        id: targetNodeId,
        type: 'target',
        position: { x: 800, y: 200 },
        data: {
          label: 'Target Output',
          structure: parsedTemplate
        }
      });

      let nodeCounter = 1;
      let yPosition = 100;
      const spacing = 120;

      // Process each field in the template
      Object.entries(parsedTemplate).forEach(([targetField, templateValue]) => {
        if (typeof templateValue === 'string' && templateValue.includes('{{') && templateValue.includes('}}')) {
          // Extract template variable
          const matches = templateValue.match(/\{\{\s*([^}]+)\s*\}\}/g);
          
          if (matches) {
            matches.forEach((match) => {
              const cleanVar = match.replace(/\{\{\s*|\s*\}\}/g, '');
              
              // Check if this requires array access or nested field access
              if (cleanVar.includes('[') || cleanVar.includes('.')) {
                // Complex field access - needs transform node
                const transformNodeId = `transform-${nodeCounter++}`;
                
                let transformType = 'field_access';
                let transformData: any = {
                  label: `Extract ${targetField}`,
                  sourceField: cleanVar,
                  targetField: targetField
                };

                // Determine transform type
                if (cleanVar.includes('[') && cleanVar.includes(']')) {
                  transformType = 'array_access';
                  const arrayMatch = cleanVar.match(/([^[]+)\[(\d+)\]\.?(.*)$/);
                  if (arrayMatch) {
                    transformData = {
                      label: `Array Access`,
                      arrayField: arrayMatch[1],
                      index: parseInt(arrayMatch[2]),
                      subField: arrayMatch[3] || null,
                      targetField: targetField
                    };
                  }
                } else if (cleanVar.includes('.')) {
                  transformType = 'nested_access';
                  transformData = {
                    label: `Nested Access`,
                    fieldPath: cleanVar,
                    targetField: targetField
                  };
                }

                nodes.push({
                  id: transformNodeId,
                  type: transformType,
                  position: { x: 400, y: yPosition },
                  data: transformData
                });

                // Connect source to transform
                edges.push({
                  id: `edge-source-${transformNodeId}`,
                  source: sourceNodeId,
                  target: transformNodeId
                });

                // Connect transform to target
                edges.push({
                  id: `edge-${transformNodeId}-target`,
                  source: transformNodeId,
                  target: targetNodeId
                });

                yPosition += spacing;
              } else {
                // Simple field mapping - direct connection
                // Create a mapping node for clarity
                const mappingNodeId = `mapping-${nodeCounter++}`;
                
                nodes.push({
                  id: mappingNodeId,
                  type: 'conversion_mapping',
                  position: { x: 400, y: yPosition },
                  data: {
                    label: `Map Field`,
                    sourceField: cleanVar,
                    targetField: targetField
                  }
                });

                // Connect source to mapping
                edges.push({
                  id: `edge-source-${mappingNodeId}`,
                  source: sourceNodeId,
                  target: mappingNodeId
                });

                // Connect mapping to target
                edges.push({
                  id: `edge-${mappingNodeId}-target`,
                  source: mappingNodeId,
                  target: targetNodeId
                });

                yPosition += spacing;
              }
            });
          }
        } else {
          // Static value
          const staticNodeId = `static-${nodeCounter++}`;
          
          nodes.push({
            id: staticNodeId,
            type: 'static_value',
            position: { x: 400, y: yPosition },
            data: {
              label: `Static Value`,
              value: templateValue,
              targetField: targetField
            }
          });

          // Connect static to target
          edges.push({
            id: `edge-${staticNodeId}-target`,
            source: staticNodeId,
            target: targetNodeId
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