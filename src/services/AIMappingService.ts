
export interface AIMappingSuggestion {
  sourceField: string;
  targetField: string;
  confidence: number;
  reasoning: string;
  transformSuggestion?: string;
  nodeType?: 'direct' | 'transform' | 'group' | 'computed';
  groupBy?: string;
  computeLogic?: string;
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
      return this.generateHierarchicalMappings(sourceData[0]);
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

  private generateHierarchicalMappings(sampleData: any): AIMappingSuggestion[] {
    const suggestions: AIMappingSuggestion[] = [];

    // Root level mappings
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

    suggestions.push({
      sourceField: 'adminCode',
      targetField: 'adminCode',
      confidence: 100,
      reasoning: 'Direct field mapping',
      nodeType: 'direct'
    });

    // Line grouping
    suggestions.push({
      sourceField: 'lineNumber',
      targetField: 'lines[].lineNumber',
      confidence: 90,
      reasoning: 'Group by line number to create nested structure',
      nodeType: 'group',
      groupBy: 'lineNumber',
      computeLogic: 'Group records by lineNumber'
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

    // Delivery line grouping
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

    return suggestions;
  }

  async generateNodesFromMappings(mappings: AIMappingSuggestion[]): Promise<NodeGenerationResult> {
    const nodes: any[] = [];
    const edges: any[] = [];
    let yPosition = 100;

    // Create source node
    const sourceNode = {
      id: 'ai-source',
      type: 'source',
      position: { x: 100, y: yPosition },
      data: {
        label: 'AI Generated Source',
        fields: mappings.map(m => ({ name: m.sourceField, type: 'string' })),
        data: []
      }
    };
    nodes.push(sourceNode);

    // Create transform nodes for computed fields
    const computedMappings = mappings.filter(m => m.nodeType === 'computed');
    computedMappings.forEach((mapping, index) => {
      const transformNode = {
        id: `ai-transform-${index}`,
        type: 'transform',
        position: { x: 400, y: yPosition + (index * 100) },
        data: {
          label: `Compute ${mapping.targetField}`,
          transformType: 'concat',
          config: {
            formula: mapping.computeLogic || 'CONCAT'
          }
        }
      };
      nodes.push(transformNode);

      // Add edge from source to transform
      edges.push({
        id: `edge-source-transform-${index}`,
        source: 'ai-source',
        target: `ai-transform-${index}`,
        type: 'default'
      });
    });

    // Create target node
    const targetNode = {
      id: 'ai-target',
      type: 'target',
      position: { x: 800, y: yPosition },
      data: {
        label: 'AI Generated Target',
        fields: this.generateTargetSchema(mappings),
        data: []
      }
    };
    nodes.push(targetNode);

    // Add edges to target
    edges.push({
      id: 'edge-source-target',
      source: 'ai-source',
      target: 'ai-target',
      type: 'default'
    });

    return { nodes, edges, mappings };
  }

  private generateTargetSchema(mappings: AIMappingSuggestion[]): any[] {
    // This would generate the target schema based on the mappings
    // For now, return a simplified version
    return [
      { name: 'id', type: 'string' },
      { name: 'orderCode', type: 'string' },
      { name: 'adminCode', type: 'string' },
      { 
        name: 'lines', 
        type: 'array',
        children: [
          { name: 'id', type: 'string' },
          { name: 'lineNumber', type: 'number' },
          {
            name: 'deliveryLines',
            type: 'array',
            children: [
              { name: 'id', type: 'string' },
              { name: 'deliveryLineNumber', type: 'number' }
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
