export interface AIMappingSuggestion {
  sourceField: string;
  targetField: string;
  confidence: number;
  reasoning: string;
  transformSuggestion?: string;
  nodeType?: 'direct' | 'transform' | 'group' | 'computed' | 'static' | 'map' | 'ifThen' | 'coalesce';
  groupBy?: string;
  computeLogic?: string;
  staticValue?: string;
  mapValues?: Record<string, string>;
  ifThenLogic?: {
    operator: string;
    value: string;
    thenValue: string;
    elseValue: string;
  };
}

export interface NodeGenerationResult {
  nodes: any[];
  edges: any[];
  mappings: AIMappingSuggestion[];
}

export interface DataPattern {
  type: 'hierarchical' | 'flat_to_flat' | 'nested_extraction' | 'simple_transform';
  confidence: number;
  characteristics: string[];
  template: string;
}

export class AIMappingService {
  private templates = {
    employee_to_xml: {
      patterns: ['Medewerker', 'Functiebenaming', 'PTperc', 'Geslacht', 'Mailadres'],
      mappings: {
        direct: ['Medewerker->personid_extern', 'Roepnaam->firstname', 'Achternaam->lastname', 'Mailadres->email'],
        map: ['Functiebenaming->functionid_extern', 'Geslacht->genderid'],
        ifThen: ['PTperc->employmenttypeid_extern'],
        static: ['isolanguage->nl-NL', 'authorised->Y']
      }
    },
    shipment_extraction: {
      patterns: ['containers', 'client_reference', 'itinerary', 'actual_time'],
      mappings: {
        direct: ['id->1', 'client_reference->2'],
        arrayAccess: ['containers[0].container_number->3'],
        coalesce: ['time_fields->5'],
        static: ['status_type->4']
      }
    },
    hierarchical_orders: {
      patterns: ['orderCode', 'lineNumber', 'deliveryLineNumber'],
      mappings: {
        groupBy: ['lineNumber', 'deliveryLineNumber'],
        computed: ['orderCode+lineNumber->lines[].id'],
        direct: ['orderCode->id', 'confirmationDate->lines[].deliveryLines[].confirmationDate']
      }
    }
  };

  async generateMappingSuggestions(
    sourceData: any[], 
    targetSchema?: any[]
  ): Promise<AIMappingSuggestion[]> {
    if (!sourceData.length) {
      return [];
    }

    const sourceFields = Object.keys(sourceData[0]);
    console.log('Source fields detected:', sourceFields);
    console.log('Sample data:', sourceData[0]);

    // Detect data pattern using enhanced pattern recognition
    const pattern = this.detectDataPattern(sourceData[0], sourceFields);
    console.log('Detected pattern:', pattern);

    // Generate suggestions based on detected pattern
    switch (pattern.type) {
      case 'hierarchical':
        return this.generateHierarchicalMappings(sourceData[0], sourceFields);
      case 'flat_to_flat':
        return this.generateFlatMappings(sourceData[0], sourceFields);
      case 'nested_extraction':
        return this.generateExtractionMappings(sourceData[0], sourceFields);
      case 'simple_transform':
        return this.generateSimpleMappings(sourceData[0], sourceFields);
      default:
        return this.generateFallbackMappings(sourceData[0], sourceFields);
    }
  }

  private detectDataPattern(sampleData: any, fields: string[]): DataPattern {
    // Check for hierarchical pattern (orders with lines)
    if (this.hasHierarchicalPattern(fields)) {
      return {
        type: 'hierarchical',
        confidence: 95,
        characteristics: ['orderCode', 'lineNumber', 'deliveryLineNumber'],
        template: 'hierarchical_orders'
      };
    }

    // Check for employee data pattern
    if (this.hasEmployeePattern(fields)) {
      return {
        type: 'flat_to_flat',
        confidence: 90,
        characteristics: ['employee fields', 'percentage fields', 'date fields'],
        template: 'employee_to_xml'
      };
    }

    // Check for complex nested extraction (like shipment data)
    if (this.hasNestedExtractionPattern(sampleData)) {
      return {
        type: 'nested_extraction',
        confidence: 85,
        characteristics: ['nested objects', 'arrays', 'complex structure'],
        template: 'shipment_extraction'
      };
    }

    // Default to simple transformation
    return {
      type: 'simple_transform',
      confidence: 60,
      characteristics: ['basic fields'],
      template: 'generic'
    };
  }

  private hasHierarchicalPattern(fields: string[]): boolean {
    const hierarchicalIndicators = ['orderCode', 'lineNumber', 'deliveryLineNumber'];
    return hierarchicalIndicators.every(indicator => fields.includes(indicator));
  }

  private hasEmployeePattern(fields: string[]): boolean {
    const employeeIndicators = ['Medewerker', 'Functiebenaming', 'PTperc', 'Geslacht'];
    return employeeIndicators.some(indicator => fields.includes(indicator));
  }

  private hasNestedExtractionPattern(sampleData: any): boolean {
    // Check for complex nested structures like containers, events, etc.
    const nestedIndicators = ['containers', 'events', 'itinerary', 'client'];
    return Object.keys(sampleData).some(key => 
      nestedIndicators.includes(key) && 
      (Array.isArray(sampleData[key]) || typeof sampleData[key] === 'object')
    );
  }

  private generateFlatMappings(sampleData: any, fields: string[]): AIMappingSuggestion[] {
    const suggestions: AIMappingSuggestion[] = [];

    // Employee data specific mappings
    if (fields.includes('Medewerker')) {
      // Direct mappings
      suggestions.push({
        sourceField: 'Medewerker',
        targetField: 'personid_extern',
        confidence: 100,
        reasoning: 'Employee ID direct mapping',
        nodeType: 'direct'
      });

      suggestions.push({
        sourceField: 'Roepnaam',
        targetField: 'firstname',
        confidence: 100,
        reasoning: 'First name direct mapping',
        nodeType: 'direct'
      });

      suggestions.push({
        sourceField: 'Achternaam',
        targetField: 'lastname',
        confidence: 100,
        reasoning: 'Last name direct mapping',
        nodeType: 'direct'
      });

      suggestions.push({
        sourceField: 'Mailadres',
        targetField: 'email',
        confidence: 100,
        reasoning: 'Email direct mapping',
        nodeType: 'direct'
      });

      // Map-based transformations
      suggestions.push({
        sourceField: 'Functiebenaming',
        targetField: 'functionid_extern',
        confidence: 90,
        reasoning: 'Function name requires mapping transformation',
        nodeType: 'map',
        mapValues: {
          'Algemeen': 'ALGEMEEN',
          'Allround medewerker boorploeg': 'ALLROUNDMEDEWERKER-BOORPLOEG',
          'Uitvoerder': 'UITVOERDER'
        }
      });

      suggestions.push({
        sourceField: 'Geslacht',
        targetField: 'genderid',
        confidence: 95,
        reasoning: 'Gender code mapping',
        nodeType: 'map',
        mapValues: {
          'V': 'F',
          'M': 'M'
        }
      });

      // If-Then logic
      suggestions.push({
        sourceField: 'PTperc',
        targetField: 'employmenttypeid_extern',
        confidence: 90,
        reasoning: 'Employment type based on percentage',
        nodeType: 'ifThen',
        ifThenLogic: {
          operator: '>=',
          value: '100',
          thenValue: 'FT',
          elseValue: 'PT'
        }
      });

      // Static values
      suggestions.push({
        sourceField: 'static',
        targetField: 'isolanguage',
        confidence: 100,
        reasoning: 'Static language code',
        nodeType: 'static',
        staticValue: 'nl-NL'
      });

      suggestions.push({
        sourceField: 'static',
        targetField: 'authorised',
        confidence: 100,
        reasoning: 'Static authorization flag',
        nodeType: 'static',
        staticValue: 'Y'
      });
    }

    return suggestions;
  }

  private generateExtractionMappings(sampleData: any, fields: string[]): AIMappingSuggestion[] {
    const suggestions: AIMappingSuggestion[] = [];

    // Shipment data specific mappings
    if (fields.includes('id')) {
      suggestions.push({
        sourceField: 'id',
        targetField: '1',
        confidence: 100,
        reasoning: 'Shipment ID direct mapping',
        nodeType: 'direct'
      });
    }

    if (fields.includes('client_reference')) {
      suggestions.push({
        sourceField: 'client_reference',
        targetField: '2',
        confidence: 100,
        reasoning: 'Client reference direct mapping',
        nodeType: 'direct'
      });
    }

    // Array access patterns
    if (sampleData.containers && Array.isArray(sampleData.containers)) {
      suggestions.push({
        sourceField: 'containers[0].container_number',
        targetField: '3',
        confidence: 90,
        reasoning: 'First container number extraction',
        nodeType: 'transform',
        transformSuggestion: 'Array access [0] then property access'
      });
    }

    // Coalesce pattern for time fields
    const timeFields = ['actual_time_of_arrival', 'planned_time_of_arrival', 'estimated_time_of_arrival'];
    if (timeFields.some(field => this.hasNestedField(sampleData, field))) {
      suggestions.push({
        sourceField: timeFields.join(','),
        targetField: '5',
        confidence: 85,
        reasoning: 'Coalesce time fields in priority order',
        nodeType: 'coalesce'
      });
    }

    // Static value for status
    suggestions.push({
      sourceField: 'static',
      targetField: '4',
      confidence: 80,
      reasoning: 'Static status type',
      nodeType: 'static',
      staticValue: 'ATA'
    });

    return suggestions;
  }

  private generateHierarchicalMappings(sampleData: any, allFields: string[]): AIMappingSuggestion[] {
    const suggestions: AIMappingSuggestion[] = [];

    console.log('Generating hierarchical mappings for fields:', allFields);

    // ROOT LEVEL MAPPINGS
    suggestions.push({
      sourceField: 'orderCode',
      targetField: 'id',
      confidence: 95,
      reasoning: 'Order code maps to root ID',
      nodeType: 'direct'
    });

    suggestions.push({
      sourceField: 'orderCode',
      targetField: 'orderCode',
      confidence: 100,
      reasoning: 'Direct field mapping',
      nodeType: 'direct'
    });

    // Only add adminCode static once at root level
    suggestions.push({
      sourceField: 'static',
      targetField: 'adminCode',
      confidence: 100,
      reasoning: 'Static admin code value at root level',
      nodeType: 'static',
      staticValue: '01'
    });

    // LINES ARRAY LEVEL MAPPINGS
    suggestions.push({
      sourceField: 'lineNumber',
      targetField: 'lines[].lineNumber',
      confidence: 90,
      reasoning: 'Group by line number to create nested structure',
      nodeType: 'group',
      groupBy: 'lineNumber'
    });

    suggestions.push({
      sourceField: 'orderCode,lineNumber',
      targetField: 'lines[].id',
      confidence: 85,
      reasoning: 'Computed ID from orderCode and lineNumber',
      nodeType: 'computed',
      computeLogic: 'CONCAT(orderCode, ",", lineNumber)'
    });

    suggestions.push({
      sourceField: 'orderCode',
      targetField: 'lines[].orderCode',
      confidence: 100,
      reasoning: 'Direct orderCode mapping to line level',
      nodeType: 'direct'
    });

    // Add ALL available date fields at line level
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
    suggestions.push({
      sourceField: 'deliveryLineNumber',
      targetField: 'lines[].deliveryLines[].deliveryLineNumber',
      confidence: 90,
      reasoning: 'Group delivery lines within order lines',
      nodeType: 'group',
      groupBy: 'deliveryLineNumber'
    });

    suggestions.push({
      sourceField: 'orderCode,lineNumber,deliveryLineNumber',
      targetField: 'lines[].deliveryLines[].id',
      confidence: 85,
      reasoning: 'Computed delivery line ID',
      nodeType: 'computed',
      computeLogic: 'CONCAT(orderCode, ",", lineNumber, ",", deliveryLineNumber)'
    });

    suggestions.push({
      sourceField: 'orderCode',
      targetField: 'lines[].deliveryLines[].orderCode',
      confidence: 100,
      reasoning: 'Direct orderCode mapping to delivery line level',
      nodeType: 'direct'
    });

    suggestions.push({
      sourceField: 'lineNumber',
      targetField: 'lines[].deliveryLines[].orderLineNumber',
      confidence: 95,
      reasoning: 'Line number maps to order line number at delivery line level',
      nodeType: 'direct'
    });

    // Add ALL available fields at delivery line level
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

    // Add any other fields that exist but haven't been mapped yet
    const mappedSourceFields = new Set(suggestions.map(s => s.sourceField).filter(f => f !== 'static' && !f.includes(',')));
    allFields.forEach(field => {
      if (!mappedSourceFields.has(field)) {
        suggestions.push({
          sourceField: field,
          targetField: `lines[].deliveryLines[].${field}`,
          confidence: 80,
          reasoning: `Additional field ${field} mapped to delivery line level`,
          nodeType: 'direct'
        });
      }
    });

    console.log('Generated suggestions:', suggestions);
    return suggestions;
  }

  private generateSimpleMappings(sampleData: any, fields: string[]): AIMappingSuggestion[] {
    const suggestions: AIMappingSuggestion[] = [];
    
    fields.forEach(field => {
      const mapping = this.matchField(field, fields);
      if (mapping) {
        suggestions.push(mapping);
      }
    });

    return suggestions;
  }

  private generateFallbackMappings(sampleData: any, fields: string[]): AIMappingSuggestion[] {
    return this.generateSimpleMappings(sampleData, fields);
  }

  private hasNestedField(obj: any, fieldPath: string): boolean {
    const parts = fieldPath.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return false;
      }
    }
    
    return true;
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
    if (fieldName.toLowerCase().includes('perc')) return 'number';
    return 'string';
  }

  private generateExampleValue(fieldName: string): any {
    if (fieldName.toLowerCase().includes('date')) return '2025-07-01';
    if (fieldName.toLowerCase().includes('number')) return 1;
    if (fieldName === 'orderCode') return 'PU211861';
    if (fieldName === 'Medewerker') return '1000257';
    if (fieldName === 'PTperc') return 100.0;
    if (fieldName === 'Geslacht') return 'M';
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
