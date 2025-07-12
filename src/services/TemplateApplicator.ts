/**
 * Converts AI-generated mapping templates into React Flow canvas nodes and edges
 */

interface AINode {
  id: string;
  type: string;
  label?: string;
  source?: string;
  mappingTable?: Record<string, string>;
  conditions?: Array<{ condition: string; value: string }>;
  value?: string;
  stringOperation?: string;
  format?: string;
  autoDetect?: boolean;
}

interface AIEdge {
  type: string;
  from: string;
  to: string;
}

interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
}

interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
}

export class TemplateApplicator {
  
  /**
   * Apply AI template to create complete React Flow mapping
   */
  static applyTemplate(aiOutput: { nodes: AINode[], edges: AIEdge[] }): { nodes: ReactFlowNode[], edges: ReactFlowEdge[] } {
    const { nodes: aiNodes, edges: aiEdges } = aiOutput;
    
    // Convert nodes with proper positioning and type mapping
    const nodes = this.convertNodes(aiNodes);
    
    // Convert edges and add missing transform input connections
    const edges = this.convertEdges(aiEdges, aiNodes);
    
    return { nodes, edges };
  }

  /**
   * Apply AI canvas output directly (already in correct format)
   */
  static applyCanvasTemplate(canvasOutput: { nodes: any[], edges: any[] }): { nodes: ReactFlowNode[], edges: ReactFlowEdge[] } {
    // Canvas output is already in the correct format, just apply positioning
    const layout = this.calculateCanvasLayout(canvasOutput.nodes);
    
    const nodes = canvasOutput.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: layout[node.id] || { x: 100, y: 100 },
      data: { ...node }
    }));

    const edges = canvasOutput.edges.map((edge) => ({
      id: `${edge.source}-${edge.target}` || `${edge.from}-${edge.to}`,
      source: edge.source || edge.from,
      target: edge.target || edge.to
    }));

    return { nodes, edges };
  }

  private static calculateCanvasLayout(nodes: any[]): Record<string, { x: number; y: number }> {
    const layout: Record<string, { x: number; y: number }> = {};
    
    // Group nodes by type for better layout
    const targetNodes = nodes.filter(n => n.type === 'TargetNode');
    const sourceNodes = nodes.filter(n => n.type === 'SourceNode');
    const transformNodes = nodes.filter(n => !['TargetNode', 'SourceNode'].includes(n.type));

    // Position targets on the left
    targetNodes.forEach((node, i) => {
      layout[node.id] = { x: 100, y: 100 + (i * 120) };
    });

    // Position sources on the right  
    sourceNodes.forEach((node, i) => {
      layout[node.id] = { x: 800, y: 100 + (i * 120) };
    });

    // Position transforms in the middle
    transformNodes.forEach((node, i) => {
      layout[node.id] = { x: 450, y: 100 + (i * 120) };
    });

    return layout;
  }

  private static convertNodes(aiNodes: AINode[]): ReactFlowNode[] {
    const layout = this.calculateLayout(aiNodes);
    
    return aiNodes.map((node, index) => {
      const position = layout[node.id] || { x: (index % 5) * 300, y: Math.floor(index / 5) * 150 };
      
      return {
        id: node.id,
        type: this.mapNodeType(node.type),
        position,
        data: this.convertNodeData(node)
      };
    });
  }

  private static mapNodeType(aiType: string): string {
    const typeMap: Record<string, string> = {
      'TargetFieldNode': 'target',
      'SourceFieldNode': 'source', 
      'ConversionMappingNode': 'conversionMapping',
      'IfThenNode': 'ifThen',
      'TransformNode': 'transform',
      'StaticValueNode': 'staticValue'
    };
    
    return typeMap[aiType] || aiType;
  }

  private static convertNodeData(node: AINode): any {
    const baseData = {
      id: node.id,
      label: node.label || node.id
    };

    // Add type-specific data
    switch (node.type) {
      case 'ConversionMappingNode':
        return {
          ...baseData,
          sourceField: node.source,
          mappingTable: node.mappingTable || {}
        };
      
      case 'IfThenNode':
        return {
          ...baseData,
          conditions: node.conditions || []
        };
      
      case 'TransformNode':
        return {
          ...baseData,
          sourceField: node.source,
          stringOperation: node.stringOperation,
          outputDateFormat: node.format,
          inputDateFormat: node.autoDetect ? 'auto' : undefined
        };
      
      case 'StaticValueNode':
        return {
          ...baseData,
          value: node.value || ''
        };
      
      default:
        return baseData;
    }
  }

  private static convertEdges(aiEdges: AIEdge[], aiNodes: AINode[]): ReactFlowEdge[] {
    const edges: ReactFlowEdge[] = [];
    
    // Convert provided edges
    aiEdges.forEach(edge => {
      edges.push({
        id: `${edge.from}-${edge.to}`,
        source: edge.from,
        target: edge.to
      });
    });

    // Add missing transform input connections
    this.addMissingTransformConnections(edges, aiNodes);

    return edges;
  }

  private static addMissingTransformConnections(edges: ReactFlowEdge[], aiNodes: AINode[]): void {
    aiNodes.forEach(node => {
      if (node.source && ['ConversionMappingNode', 'TransformNode'].includes(node.type)) {
        const sourceNodeId = `source_${node.source}`;
        const connectionExists = edges.some(edge => 
          edge.source === sourceNodeId && edge.target === node.id
        );
        
        if (!connectionExists) {
          edges.push({
            id: `${sourceNodeId}-${node.id}`,
            source: sourceNodeId,
            target: node.id
          });
        }
      }
    });
  }

  private static calculateLayout(nodes: AINode[]): Record<string, { x: number; y: number }> {
    const layout: Record<string, { x: number; y: number }> = {};
    
    // Group nodes by type for better layout
    const targetNodes = nodes.filter(n => n.type === 'TargetFieldNode');
    const sourceNodes = nodes.filter(n => n.type === 'SourceFieldNode');
    const transformNodes = nodes.filter(n => !['TargetFieldNode', 'SourceFieldNode'].includes(n.type));

    // Position targets on the left
    targetNodes.forEach((node, i) => {
      layout[node.id] = { x: 100, y: 100 + (i * 80) };
    });

    // Position sources on the right
    sourceNodes.forEach((node, i) => {
      layout[node.id] = { x: 800, y: 100 + (i * 80) };
    });

    // Position transforms in the middle
    transformNodes.forEach((node, i) => {
      layout[node.id] = { x: 450, y: 100 + (i * 80) };
    });

    return layout;
  }
}