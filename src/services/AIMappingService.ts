export interface AIMappingSuggestion {
  sourceField: string;
  targetField: string;
  confidence: number;
  reasoning: string;
  transformSuggestion?: string;
  nodeType?: 'direct' | 'transform' | 'group' | 'computed' | 'static';
  groupBy?: string;
  computeLogic?: string;
  staticValue?: string;
}

export interface NodeGenerationResult {
  nodes: any[];
  edges: any[];
  mappings: AIMappingSuggestion[];
}

export class AIMappingService {
  async generateMappingSuggestions(
    sourceData: any[], 
    targetSchema?: any[]
  ): Promise<AIMappingSuggestion[]> {
    if (!sourceData.length) {
      return [];
    }

    const sourceFields = Object.keys(sourceData[0]);
    const suggestions: AIMappingSuggestion[] = [];

    // Detect if this looks like a hierarchical transformation
    const hasHierarchicalPattern = this.detectHierarchicalPattern(sourceData[0]);
    
    if (hasHierarchicalPattern) {
      return this.generateHierarchicalMappings(sourceData[0], sourceFields);
    }

    // Standard field matching
    sourceFields.forEach(sourceField => {
      const suggestion = this.matchField(sourceField, sourceFields, targetSchema);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    });

    return suggestions;
  }

  private detectHierarchicalPattern(sampleData: any): boolean {
    const fields = Object.keys(sampleData);
    
    // Look for patterns that suggest hierarchical structure
    const hasOrderCode = fields.includes('orderCode');
    const hasLineNumber = fields.includes('lineNumber');
    const hasDeliveryLineNumber = fields.includes('deliveryLineNumber');
    
    return hasOrderCode && hasLineNumber && hasDeliveryLineNumber;
  }

  private generateHierarchicalMappings(sampleData: any, allFields: string[]): AIMappingSuggestion[] {
    const suggestions: AIMappingSuggestion[] = [];

    console.log('Generating hierarchical mappings for fields:', allFields);
    console.log('Sample data:', sampleData);

    // ROOT LEVEL MAPPINGS
    // orderCode -> id (root level)
    suggestions.push({
      sourceField: 'orderCode',
      targetField: 'id',
      confidence: 95,
      reasoning: 'Order code maps to root ID',
      nodeType: 'direct'
    });

    // orderCode -> orderCode (root level)
    suggestions.push({
      sourceField: 'orderCode',
      targetField: 'orderCode',
      confidence: 100,
      reasoning: 'Direct field mapping',
      nodeType: 'direct'
    });

    // Static adminCode (root level)
    suggestions.push({
      sourceField: 'static',
      targetField: 'adminCode',
      confidence: 100,
      reasoning: 'Static admin code value',
      nodeType: 'static',
      staticValue: '01'
    });

    // LINES ARRAY LEVEL MAPPINGS
    // lineNumber grouping
    suggestions.push({
      sourceField: 'lineNumber',
      targetField: 'lines[].lineNumber',
      confidence: 90,
      reasoning: 'Group by line number to create nested structure',
      nodeType: 'group',
      groupBy: 'lineNumber'
    });

    // Computed line ID
    suggestions.push({
      sourceField: 'orderCode,lineNumber',
      targetField: 'lines[].id',
      confidence: 85,
      reasoning: 'Computed ID from orderCode and lineNumber',
      nodeType: 'computed',
      computeLogic: 'CONCAT(orderCode, ",", lineNumber)'
    });

    // Direct fields at line level
    suggestions.push({
      sourceField: 'orderCode',
      targetField: 'lines[].orderCode',
      confidence: 100,
      reasoning: 'Direct orderCode mapping to line level',
      nodeType: 'direct'
    });

    // Static adminCode at line level
    suggestions.push({
      sourceField: 'static',
      targetField: 'lines[].adminCode',
      confidence: 100,
      reasoning: 'Static admin code at line level',
      nodeType: 'static',
      staticValue: '01'
    });

    // Date fields at line level
    if (allFields.includes('deliveryAfter')) {
      suggestions.push({
        sourceField: 'deliveryAfter',
        targetField: 'lines[].deliveryAfter',
        confidence: 95,
        reasoning: 'Delivery after date maps to line level',
        nodeType: 'direct'
      });
    }

    if (allFields.includes('deliveryBefore')) {
      suggestions.push({
        sourceField: 'deliveryBefore',
        targetField: 'lines[].deliveryBefore',
        confidence: 95,
        reasoning: 'Delivery before date maps to line level',
        nodeType: 'direct'
      });
    }

    // DELIVERY LINES ARRAY LEVEL MAPPINGS
    // deliveryLineNumber grouping
    suggestions.push({
      sourceField: 'deliveryLineNumber',
      targetField: 'lines[].deliveryLines[].deliveryLineNumber',
      confidence: 90,
      reasoning: 'Group delivery lines within order lines',
      nodeType: 'group',
      groupBy: 'deliveryLineNumber'
    });

    // Computed delivery line ID
    suggestions.push({
      sourceField: 'orderCode,lineNumber,deliveryLineNumber',
      targetField: 'lines[].deliveryLines[].id',
      confidence: 85,
      reasoning: 'Computed delivery line ID',
      nodeType: 'computed',
      computeLogic: 'CONCAT(orderCode, ",", lineNumber, ",", deliveryLineNumber)'
    });

    // Direct fields at delivery line level
    suggestions.push({
      sourceField: 'orderCode',
      targetField: 'lines[].deliveryLines[].orderCode',
      confidence: 100,
      reasoning: 'Direct orderCode mapping to delivery line level',
      nodeType: 'direct'
    });

    // Static adminCode at delivery line level
    suggestions.push({
      sourceField: 'static',
      targetField: 'lines[].deliveryLines[].adminCode',
      confidence: 100,
      reasoning: 'Static admin code at delivery line level',
      nodeType: 'static',
      staticValue: '01'
    });

    // lineNumber as orderLineNumber at delivery line level
    suggestions.push({
      sourceField: 'lineNumber',
      targetField: 'lines[].deliveryLines[].orderLineNumber',
      confidence: 95,
      reasoning: 'Line number maps to order line number at delivery line level',
      nodeType: 'direct'
    });

    // Date fields at delivery line level
    if (allFields.includes('confirmationDate')) {
      suggestions.push({
        sourceField: 'confirmationDate',
        targetField: 'lines[].deliveryLines[].confirmationDate',
        confidence: 95,
        reasoning: 'Confirmation date maps to delivery line level',
        nodeType: 'direct'
      });
    }

    if (allFields.includes('deliveryAfter')) {
      suggestions.push({
        sourceField: 'deliveryAfter',
        targetField: 'lines[].deliveryLines[].deliveryAfter',
        confidence: 95,
        reasoning: 'Delivery after date maps to delivery line level',
        nodeType: 'direct'
      });
    }

    if (allFields.includes('deliveryBefore')) {
      suggestions.push({
        sourceField: 'deliveryBefore',
        targetField: 'lines[].deliveryLines[].deliveryBefore',
        confidence: 95,
        reasoning: 'Delivery before date maps to delivery line level',
        nodeType: 'direct'
      });
    }

    console.log('Generated suggestions:', suggestions);
    return suggestions;
  }

  async generateNodesFromMappings(mappings: AIMappingSuggestion[]): Promise<NodeGenerationResult> {
    const nodes: any[] = [];
    const edges: any[] = [];
    
    console.log('Generating nodes from mappings:', mappings);
    
    // Smart positioning system
    const positions = this.calculateSmartPositions(mappings);
    
    // Create source node with ALL detected fields
    const sourceFields = this.extractSourceFields(mappings);
    const sourceNode = {
      id: 'ai-source',
      type: 'source',
      position: positions.source,
      data: {
        label: 'AI Generated Source',
        fields: sourceFields.map(field => ({ 
          id: field,
          name: field, 
          type: this.inferFieldType(field),
          exampleValue: this.generateExampleValue(field)
        })),
        data: []
      }
    };
    nodes.push(sourceNode);

    // Create static value nodes for static mappings
    const staticMappings = mappings.filter(m => m.nodeType === 'static');
    staticMappings.forEach((mapping, index) => {
      const staticId = `ai-static-${index}`;
      const staticNode = {
        id: staticId,
        type: 'staticValue',
        position: {
          x: positions.source.x + 50,
          y: positions.source.y + 300 + (index * 100)
        },
        data: {
          label: `Static: ${mapping.staticValue}`,
          values: [{
            id: 'static-output',
            name: 'Static Value',
            value: mapping.staticValue || '01'
          }]
        }
      };
      nodes.push(staticNode);
    });

    // Create transform nodes for computed fields with proper configuration
    const computedMappings = mappings.filter(m => m.nodeType === 'computed');
    computedMappings.forEach((mapping, index) => {
      const transformId = `ai-transform-${index}`;
      const sourceFields = mapping.sourceField.split(',');
      
      const transformNode = {
        id: transformId,
        type: 'concatTransform',
        position: positions.transforms[index],
        data: {
          label: `Compute ${mapping.targetField.split('.').pop()}`,
          transformType: 'concat',
          rules: sourceFields.map((field, idx) => ({
            id: `rule-${idx}`,
            priority: idx + 1,
            outputValue: field.trim(),
            sourceField: field.trim(),
            sourceHandle: field.trim()
          })),
          delimiter: ',',
          outputType: 'value',
          inputValues: {},
          config: {
            rules: sourceFields.map((field, idx) => ({
              id: `rule-${idx}`,
              priority: idx + 1,
              outputValue: field.trim()
            })),
            delimiter: ',',
            parameters: {
              rules: sourceFields.map((field, idx) => ({
                id: `rule-${idx}`,
                priority: idx + 1,
                outputValue: field.trim()
              })),
              delimiter: ','
            }
          }
        }
      };
      nodes.push(transformNode);

      // Add edges from source to transform
      sourceFields.forEach((field, idx) => {
        edges.push({
          id: `edge-source-transform-${index}-${idx}`,
          source: 'ai-source',
          sourceHandle: field.trim(),
          target: transformId,
          targetHandle: `input-${idx}`,
          type: 'smoothstep',
          animated: true,
          style: { 
            strokeWidth: 2,
            stroke: '#3b82f6',
            strokeDasharray: '5,5'
          }
        });
      });
    });

    // Create target node with proper schema and groupBy configurations
    const targetNode = {
      id: 'ai-target',
      type: 'target',
      position: positions.target,
      data: {
        label: 'AI Generated Target',
        fields: this.generateTargetSchema(mappings),
        data: [],
        fieldValues: {}
      }
    };
    nodes.push(targetNode);

    // Add direct mapping edges from source to target
    const directMappings = mappings.filter(m => m.nodeType === 'direct');
    directMappings.forEach((mapping, index) => {
      edges.push({
        id: `edge-direct-${index}`,
        source: 'ai-source',
        sourceHandle: mapping.sourceField,
        target: 'ai-target',
        targetHandle: mapping.targetField.replace('[]', '').replace(/\./g, '_'),
        type: 'smoothstep',
        animated: true,
        style: { 
          strokeWidth: 2,
          stroke: '#10b981',
          strokeDasharray: '5,5'
        }
      });
    });

    // Add edges from static nodes to target
    staticMappings.forEach((mapping, index) => {
      const staticId = `ai-static-${index}`;
      edges.push({
        id: `edge-static-${index}`,
        source: staticId,
        sourceHandle: 'static-output',
        target: 'ai-target',
        targetHandle: mapping.targetField.replace('[]', '').replace(/\./g, '_'),
        type: 'smoothstep',
        animated: true,
        style: { 
          strokeWidth: 2,
          stroke: '#8b5cf6',
          strokeDasharray: '5,5'
        }
      });
    });

    // Add edges from transforms to target
    computedMappings.forEach((mapping, index) => {
      const transformId = `ai-transform-${index}`;
      edges.push({
        id: `edge-transform-target-${index}`,
        source: transformId,
        sourceHandle: 'output',
        target: 'ai-target',
        targetHandle: mapping.targetField.replace('[]', '').replace(/\./g, '_'),
        type: 'smoothstep',
        animated: true,
        style: { 
          strokeWidth: 2,
          stroke: '#f59e0b',
          strokeDasharray: '5,5'
        }
      });
    });

    console.log('Generated nodes:', nodes.length, 'edges:', edges.length);
    return { nodes, edges, mappings };
  }

  private calculateSmartPositions(mappings: AIMappingSuggestion[]) {
    const computedCount = mappings.filter(m => m.nodeType === 'computed').length;
    const staticCount = mappings.filter(m => m.nodeType === 'static').length;
    const canvasWidth = 1400;
    const nodeSpacing = 250;
    
    return {
      source: { x: 100, y: 200 },
      target: { x: canvasWidth - 300, y: 200 },
      transforms: Array.from({ length: computedCount }, (_, i) => ({
        x: 450 + (i * nodeSpacing / Math.max(computedCount, 1)),
        y: 100 + (i * 120)
      })),
      statics: Array.from({ length: staticCount }, (_, i) => ({
        x: 150,
        y: 500 + (i * 120)
      }))
    };
  }

  private extractSourceFields(mappings: AIMappingSuggestion[]): string[] {
    const fields = new Set<string>();
    
    mappings.forEach(mapping => {
      if (mapping.nodeType === 'computed') {
        mapping.sourceField.split(',').forEach(field => fields.add(field.trim()));
      } else if (mapping.nodeType !== 'static') {
        fields.add(mapping.sourceField);
      }
    });
    
    return Array.from(fields);
  }

  private inferFieldType(fieldName: string): string {
    if (fieldName.toLowerCase().includes('date')) return 'date';
    if (fieldName.toLowerCase().includes('number')) return 'number';
    if (fieldName.toLowerCase().includes('code')) return 'string';
    return 'string';
  }

  private generateExampleValue(fieldName: string): any {
    if (fieldName.toLowerCase().includes('date')) return '2025-07-01';
    if (fieldName.toLowerCase().includes('number')) return 1;
    if (fieldName === 'orderCode') return 'PU211861';
    if (fieldName === 'adminCode') return '01';
    return 'example';
  }

  private generateTargetSchema(mappings: AIMappingSuggestion[]): any[] {
    // Enhanced target schema that includes all the mapped fields
    return [
      { 
        id: 'id',
        name: 'id', 
        type: 'string',
        exampleValue: 'PU211861'
      },
      { 
        id: 'orderCode',
        name: 'orderCode', 
        type: 'string',
        exampleValue: 'PU211861'
      },
      { 
        id: 'adminCode',
        name: 'adminCode', 
        type: 'string',
        exampleValue: '01'
      },
      { 
        id: 'lines',
        name: 'lines', 
        type: 'array',
        groupBy: 'lineNumber',
        exampleValue: [],
        children: [
          { 
            id: 'lines_id',
            name: 'id', 
            type: 'string',
            exampleValue: 'PU211861,1'
          },
          { 
            id: 'lines_lineNumber',
            name: 'lineNumber', 
            type: 'number',
            exampleValue: 1
          },
          { 
            id: 'lines_orderCode',
            name: 'orderCode', 
            type: 'string',
            exampleValue: 'PU211861'
          },
          { 
            id: 'lines_adminCode',
            name: 'adminCode', 
            type: 'string',
            exampleValue: '01'
          },
          { 
            id: 'lines_deliveryAfter',
            name: 'deliveryAfter', 
            type: 'date',
            exampleValue: '2025-07-01'
          },
          { 
            id: 'lines_deliveryBefore',
            name: 'deliveryBefore', 
            type: 'date',
            exampleValue: '2025-07-01'
          },
          {
            id: 'lines_deliveryLines',
            name: 'deliveryLines',
            type: 'array',
            groupBy: 'deliveryLineNumber',
            exampleValue: [],
            children: [
              { 
                id: 'deliveryLines_id',
                name: 'id', 
                type: 'string',
                exampleValue: 'PU211861,1,1'
              },
              { 
                id: 'deliveryLines_orderCode',
                name: 'orderCode', 
                type: 'string',
                exampleValue: 'PU211861'
              },
              { 
                id: 'deliveryLines_adminCode',
                name: 'adminCode', 
                type: 'string',
                exampleValue: '01'
              },
              { 
                id: 'deliveryLines_orderLineNumber',
                name: 'orderLineNumber', 
                type: 'number',
                exampleValue: 1
              },
              { 
                id: 'deliveryLines_deliveryLineNumber',
                name: 'deliveryLineNumber', 
                type: 'number',
                exampleValue: 1
              },
              { 
                id: 'deliveryLines_confirmationDate',
                name: 'confirmationDate', 
                type: 'date',
                exampleValue: '2025-07-02'
              },
              { 
                id: 'deliveryLines_deliveryAfter',
                name: 'deliveryAfter', 
                type: 'date',
                exampleValue: '2025-07-01'
              },
              { 
                id: 'deliveryLines_deliveryBefore',
                name: 'deliveryBefore', 
                type: 'date',
                exampleValue: '2025-07-01'
              }
            ]
          }
        ]
      }
    ];
  }

  private matchField(
    sourceField: string, 
    allSourceFields: string[], 
    targetSchema?: any[]
  ): AIMappingSuggestion | null {
    // Simple matching logic - can be enhanced with AI
    const normalizedSource = sourceField.toLowerCase().replace(/[_-]/g, '');
    
    const commonMappings: Record<string, { target: string; confidence: number; reasoning: string }> = {
      'firstname': { target: 'name', confidence: 85, reasoning: 'Common name field mapping' },
      'fname': { target: 'name', confidence: 80, reasoning: 'First name abbreviation to full name' },
      'lastname': { target: 'surname', confidence: 90, reasoning: 'Direct surname mapping' },
      'lname': { target: 'surname', confidence: 85, reasoning: 'Last name abbreviation to surname' },
      'email': { target: 'email', confidence: 95, reasoning: 'Exact field name match' },
      'emailaddress': { target: 'email', confidence: 90, reasoning: 'Email address variant' },
      'phone': { target: 'contact', confidence: 75, reasoning: 'Phone number to contact field' },
      'phonenumber': { target: 'contact', confidence: 80, reasoning: 'Phone number to contact field' },
      'id': { target: 'identifier', confidence: 70, reasoning: 'ID field mapping' },
      'userid': { target: 'identifier', confidence: 75, reasoning: 'User ID to identifier' },
    };

    const mapping = commonMappings[normalizedSource];
    if (mapping) {
      return {
        sourceField,
        targetField: mapping.target,
        confidence: mapping.confidence,
        reasoning: mapping.reasoning,
        nodeType: 'direct'
      };
    }

    return {
      sourceField,
      targetField: sourceField,
      confidence: 50,
      reasoning: 'No direct mapping found, suggesting same field name',
      nodeType: 'direct'
    };
  }
}
