import { Node, Edge } from '@xyflow/react';

export interface MappingConfiguration {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  nodes: {
    sources: SourceNodeConfig[];
    targets: TargetNodeConfig[];
    transforms: TransformNodeConfig[];
    mappings: MappingNodeConfig[];
  };
  connections: ConnectionConfig[];
  execution: {
    steps: ExecutionStep[];
  };
  metadata?: {
    description?: string;
    tags?: string[];
    author?: string;
  };
}

export interface ExecutionStep {
  stepId: string;
  type: 'direct_mapping' | 'transform' | 'conversion_mapping';
  source: {
    nodeId: string;
    fieldId: string;
    fieldName: string;
    value?: any;
  };
  target: {
    nodeId: string;
    fieldId: string;
    fieldName: string;
  };
  transform?: {
    type: string;
    operation?: string;
    parameters?: Record<string, any>;
    expression?: string;
  };
  conversion?: {
    rules: Array<{
      from: string;
      to: string;
      transformation?: string;
    }>;
  };
}

export interface SourceNodeConfig {
  id: string;
  type: 'source';
  label: string;
  position: { x: number; y: number };
  schema: {
    fields: SchemaField[];
  };
  sampleData: any[];
}

export interface TargetNodeConfig {
  id: string;
  type: 'target';
  label: string;
  position: { x: number; y: number };
  schema: {
    fields: SchemaField[];
  };
  outputData?: any[];
}

export interface TransformNodeConfig {
  id: string;
  type: 'transform' | 'splitterTransform';
  label: string;
  position: { x: number; y: number };
  transformType: string;
  config: {
    operation?: string;
    parameters?: Record<string, any>;
    expression?: string;
  };
}

export interface MappingNodeConfig {
  id: string;
  type: 'mapping';
  label: string;
  position: { x: number; y: number };
  mappings: Array<{
    from: string;
    to: string;
    transformation?: string;
  }>;
}

export interface ConnectionConfig {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string;
  targetHandle: string;
  type: 'direct' | 'transform' | 'mapping';
}

interface SchemaField {
  id: string;
  name: string;
  type: string;
  exampleValue?: any;
  children?: SchemaField[];
}

const buildExecutionSteps = (
  nodes: Node[],
  edges: Edge[]
): ExecutionStep[] => {
  const steps: ExecutionStep[] = [];
  let stepCounter = 1;

  // Get source and target nodes for reference
  const sourceNodes = nodes.filter(node => 
    node.type === 'editableSchema' && node.data?.schemaType === 'source'
  );
  const targetNodes = nodes.filter(node => 
    node.type === 'editableSchema' && node.data?.schemaType === 'target'
  );
  const transformNodes = nodes.filter(node => 
    node.type === 'editableTransform' || node.type === 'splitterTransform'
  );
  const mappingNodes = nodes.filter(node => node.type === 'conversionMapping');

  // Process each edge to create execution steps
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return;

    // Get field information
    const getFieldInfo = (node: Node, handleId: string) => {
      if (node.data?.fields) {
        const field = node.data.fields.find((f: any) => f.id === handleId);
        return field ? { id: field.id, name: field.name } : { id: handleId, name: handleId };
      }
      return { id: handleId, name: handleId };
    };

    const sourceField = getFieldInfo(sourceNode, edge.sourceHandle || '');
    const targetField = getFieldInfo(targetNode, edge.targetHandle || '');

    // Get sample data for source field
    const getSampleValue = (node: Node, fieldName: string) => {
      if (node.data?.data && Array.isArray(node.data.data) && node.data.data.length > 0) {
        return node.data.data[0][fieldName];
      }
      if (node.data?.fields) {
        const field = node.data.fields.find((f: any) => f.name === fieldName);
        return field?.exampleValue;
      }
      return undefined;
    };

    // Direct mapping (source to target)
    if (sourceNode.data?.schemaType === 'source' && targetNode.data?.schemaType === 'target') {
      steps.push({
        stepId: `step_${stepCounter++}`,
        type: 'direct_mapping',
        source: {
          nodeId: sourceNode.id,
          fieldId: sourceField.id,
          fieldName: sourceField.name,
          value: getSampleValue(sourceNode, sourceField.name)
        },
        target: {
          nodeId: targetNode.id,
          fieldId: targetField.id,
          fieldName: targetField.name
        }
      });
    }

    // Transform step (source to transform, then transform to target)
    if (sourceNode.data?.schemaType === 'source' && 
        (targetNode.type === 'editableTransform' || targetNode.type === 'splitterTransform')) {
      
      // Find the edge from this transform to a target
      const transformToTargetEdge = edges.find(e => e.source === targetNode.id);
      const finalTargetNode = transformToTargetEdge ? 
        nodes.find(n => n.id === transformToTargetEdge.target) : null;

      if (finalTargetNode && finalTargetNode.data?.schemaType === 'target') {
        const finalTargetField = getFieldInfo(finalTargetNode, transformToTargetEdge!.targetHandle || '');
        
        steps.push({
          stepId: `step_${stepCounter++}`,
          type: 'transform',
          source: {
            nodeId: sourceNode.id,
            fieldId: sourceField.id,
            fieldName: sourceField.name,
            value: getSampleValue(sourceNode, sourceField.name)
          },
          target: {
            nodeId: finalTargetNode.id,
            fieldId: finalTargetField.id,
            fieldName: finalTargetField.name
          },
          transform: {
            type: targetNode.data?.transformType || 'unknown',
            operation: targetNode.data?.config?.operation,
            parameters: targetNode.data?.config?.parameters || {},
            expression: targetNode.data?.config?.expression
          }
        });
      }
    }

    // Conversion mapping step
    if (sourceNode.data?.schemaType === 'source' && targetNode.type === 'conversionMapping') {
      // Find the edge from this mapping to a target
      const mappingToTargetEdge = edges.find(e => e.source === targetNode.id);
      const finalTargetNode = mappingToTargetEdge ? 
        nodes.find(n => n.id === mappingToTargetEdge.target) : null;

      if (finalTargetNode && finalTargetNode.data?.schemaType === 'target') {
        const finalTargetField = getFieldInfo(finalTargetNode, mappingToTargetEdge!.targetHandle || '');
        
        steps.push({
          stepId: `step_${stepCounter++}`,
          type: 'conversion_mapping',
          source: {
            nodeId: sourceNode.id,
            fieldId: sourceField.id,
            fieldName: sourceField.name,
            value: getSampleValue(sourceNode, sourceField.name)
          },
          target: {
            nodeId: finalTargetNode.id,
            fieldId: finalTargetField.id,
            fieldName: finalTargetField.name
          },
          conversion: {
            rules: Array.isArray(targetNode.data?.mappings) ? targetNode.data.mappings : []
          }
        });
      }
    }
  });

  return steps;
};

export const exportMappingConfiguration = (
  nodes: Node[],
  edges: Edge[],
  name: string = 'Untitled Mapping'
): MappingConfiguration => {
  const config: MappingConfiguration = {
    id: `mapping_${Date.now()}`,
    name,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    nodes: {
      sources: [],
      targets: [],
      transforms: [],
      mappings: []
    },
    connections: [],
    execution: {
      steps: buildExecutionSteps(nodes, edges)
    },
    metadata: {
      description: 'Auto-generated mapping configuration with execution steps',
      tags: ['data-mapping', 'etl', 'transformation'],
      author: 'Lovable Mapping Tool'
    }
  };

  // Extract source nodes
  nodes.filter(node => node.type === 'editableSchema' && node.data?.schemaType === 'source')
    .forEach(node => {
      config.nodes.sources.push({
        id: node.id,
        type: 'source',
        label: String(node.data?.label || 'Source Node'),
        position: node.position,
        schema: {
          fields: Array.isArray(node.data?.fields) ? node.data.fields : []
        },
        sampleData: Array.isArray(node.data?.data) ? node.data.data : []
      });
    });

  // Extract target nodes
  nodes.filter(node => node.type === 'editableSchema' && node.data?.schemaType === 'target')
    .forEach(node => {
      config.nodes.targets.push({
        id: node.id,
        type: 'target',
        label: String(node.data?.label || 'Target Node'),
        position: node.position,
        schema: {
          fields: Array.isArray(node.data?.fields) ? node.data.fields : []
        },
        outputData: Array.isArray(node.data?.data) ? node.data.data : []
      });
    });

  // Extract transform nodes
  nodes.filter(node => node.type === 'editableTransform' || node.type === 'splitterTransform')
    .forEach(node => {
      config.nodes.transforms.push({
        id: node.id,
        type: node.type as 'transform' | 'splitterTransform',
        label: String(node.data?.label || 'Transform Node'),
        position: node.position,
        transformType: String(node.data?.transformType || 'unknown'),
        config: node.data?.config || {}
      });
    });

  // Extract mapping nodes
  nodes.filter(node => node.type === 'conversionMapping')
    .forEach(node => {
      config.nodes.mappings.push({
        id: node.id,
        type: 'mapping',
        label: String(node.data?.label || 'Mapping Node'),
        position: node.position,
        mappings: Array.isArray(node.data?.mappings) ? node.data.mappings : []
      });
    });

  // Extract connections
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    let connectionType: 'direct' | 'transform' | 'mapping' = 'direct';
    
    if (sourceNode?.type === 'editableTransform' || sourceNode?.type === 'splitterTransform') {
      connectionType = 'transform';
    } else if (sourceNode?.type === 'conversionMapping') {
      connectionType = 'mapping';
    }

    config.connections.push({
      id: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      sourceHandle: edge.sourceHandle || '',
      targetHandle: edge.targetHandle || '',
      type: connectionType
    });
  });

  return config;
};

export const importMappingConfiguration = (
  config: MappingConfiguration
): { nodes: Node[], edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Import source nodes
  config.nodes.sources.forEach(sourceConfig => {
    nodes.push({
      id: sourceConfig.id,
      type: 'editableSchema',
      position: sourceConfig.position,
      data: {
        label: sourceConfig.label,
        schemaType: 'source',
        fields: sourceConfig.schema.fields,
        data: sourceConfig.sampleData
      }
    });
  });

  // Import target nodes
  config.nodes.targets.forEach(targetConfig => {
    nodes.push({
      id: targetConfig.id,
      type: 'editableSchema',
      position: targetConfig.position,
      data: {
        label: targetConfig.label,
        schemaType: 'target',
        fields: targetConfig.schema.fields,
        data: targetConfig.outputData || []
      }
    });
  });

  // Import transform nodes
  config.nodes.transforms.forEach(transformConfig => {
    nodes.push({
      id: transformConfig.id,
      type: transformConfig.type,
      position: transformConfig.position,
      data: {
        label: transformConfig.label,
        transformType: transformConfig.transformType,
        config: transformConfig.config
      }
    });
  });

  // Import mapping nodes
  config.nodes.mappings.forEach(mappingConfig => {
    nodes.push({
      id: mappingConfig.id,
      type: 'conversionMapping',
      position: mappingConfig.position,
      data: {
        label: mappingConfig.label,
        mappings: mappingConfig.mappings,
        isExpanded: false
      }
    });
  });

  // Import connections
  config.connections.forEach(connectionConfig => {
    edges.push({
      id: connectionConfig.id,
      source: connectionConfig.sourceNodeId,
      target: connectionConfig.targetNodeId,
      sourceHandle: connectionConfig.sourceHandle,
      targetHandle: connectionConfig.targetHandle,
      type: 'smoothstep',
      animated: true,
      style: { 
        strokeWidth: 3,
        stroke: '#3b82f6'
      }
    });
  });

  return { nodes, edges };
};

// Example of what a complete mapping configuration would look like
export const exampleMappingConfiguration: MappingConfiguration = {
  id: "mapping_1703123456789",
  name: "Customer Data Transform",
  version: "1.0.0",
  createdAt: "2024-01-01T12:00:00.000Z",
  nodes: {
    sources: [
      {
        id: "source-1",
        type: "source",
        label: "Customer API",
        position: { x: 100, y: 100 },
        schema: {
          fields: [
            { id: "field-1", name: "customer_name", type: "string", exampleValue: "John Doe" },
            { id: "field-2", name: "birth_date", type: "date", exampleValue: "1990-05-15" },
            { id: "field-3", name: "email", type: "string", exampleValue: "john@example.com" }
          ]
        },
        sampleData: [
          { customer_name: "John Doe", birth_date: "1990-05-15", email: "john@example.com" }
        ]
      }
    ],
    targets: [
      {
        id: "target-1",
        type: "target",
        label: "CRM System",
        position: { x: 800, y: 100 },
        schema: {
          fields: [
            { id: "field-4", name: "full_name", type: "string" },
            { id: "field-5", name: "formatted_date", type: "string" },
            { id: "field-6", name: "contact_email", type: "string" }
          ]
        },
        outputData: [
          { full_name: "JOHN DOE", formatted_date: "15/05/1990", contact_email: "john@example.com" }
        ]
      }
    ],
    transforms: [
      {
        id: "transform-1",
        type: "transform",
        label: "String Transform",
        position: { x: 300, y: 100 },
        transformType: "String Transform",
        config: {
          operation: "uppercase",
          parameters: {}
        }
      },
      {
        id: "transform-2",
        type: "transform",
        label: "Date Format",
        position: { x: 300, y: 200 },
        transformType: "Date Format",
        config: {
          operation: "format",
          parameters: {
            inputFormat: "YYYY-MM-DD",
            outputFormat: "DD/MM/YYYY"
          }
        }
      }
    ],
    mappings: []
  },
  connections: [
    {
      id: "edge-1",
      sourceNodeId: "source-1",
      targetNodeId: "transform-1",
      sourceHandle: "field-1",
      targetHandle: "input",
      type: "transform"
    },
    {
      id: "edge-2",
      sourceNodeId: "transform-1",
      targetNodeId: "target-1",
      sourceHandle: "output",
      targetHandle: "field-4",
      type: "direct"
    },
    {
      id: "edge-3",
      sourceNodeId: "source-1",
      targetNodeId: "transform-2",
      sourceHandle: "field-2",
      targetHandle: "input",
      type: "transform"
    },
    {
      id: "edge-4",
      sourceNodeId: "transform-2",
      targetNodeId: "target-1",
      sourceHandle: "output",
      targetHandle: "field-5",
      type: "direct"
    },
    {
      id: "edge-5",
      sourceNodeId: "source-1",
      targetNodeId: "target-1",
      sourceHandle: "field-3",
      targetHandle: "field-6",
      type: "direct"
    }
  ],
  execution: {
    steps: [
      {
        stepId: "step_1",
        type: "transform",
        source: {
          nodeId: "source-1",
          fieldId: "field-1",
          fieldName: "customer_name",
          value: "John Doe"
        },
        target: {
          nodeId: "target-1",
          fieldId: "field-4",
          fieldName: "full_name"
        },
        transform: {
          type: "String Transform",
          operation: "uppercase",
          parameters: {}
        }
      },
      {
        stepId: "step_2",
        type: "transform",
        source: {
          nodeId: "source-1",
          fieldId: "field-2",
          fieldName: "birth_date",
          value: "1990-05-15"
        },
        target: {
          nodeId: "target-1",
          fieldId: "field-5",
          fieldName: "formatted_date"
        },
        transform: {
          type: "Date Format",
          operation: "format",
          parameters: {
            inputFormat: "YYYY-MM-DD",
            outputFormat: "DD/MM/YYYY"
          }
        }
      },
      {
        stepId: "step_3",
        type: "direct_mapping",
        source: {
          nodeId: "source-1",
          fieldId: "field-3",
          fieldName: "email",
          value: "john@example.com"
        },
        target: {
          nodeId: "target-1",
          fieldId: "field-6",
          fieldName: "contact_email"
        }
      }
    ]
  },
  metadata: {
    description: "Transform customer data from API format to CRM format",
    tags: ["customer", "data-transform", "api-integration"],
    author: "Data Team"
  }
};
