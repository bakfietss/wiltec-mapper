
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
  type: 'transform' | 'splitterTransform' | 'ifThen' | 'staticValue';
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

  // Get source and target nodes for reference - updated to use new types
  const sourceNodes = nodes.filter(node => node.type === 'source');
  const targetNodes = nodes.filter(node => node.type === 'target');
  const transformNodes = nodes.filter(node => 
    node.type === 'transform' || node.type === 'splitterTransform' || 
    node.type === 'ifThen' || node.type === 'staticValue'
  );
  const mappingNodes = nodes.filter(node => node.type === 'conversionMapping');

  // Process each edge to create execution steps
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return;

    // Get field information
    const getFieldInfo = (node: Node, handleId: string) => {
      const nodeData = node.data as any;
      if (nodeData?.fields && Array.isArray(nodeData.fields)) {
        const field = nodeData.fields.find((f: any) => f.id === handleId);
        return field ? { id: field.id, name: field.name } : { id: handleId, name: handleId };
      }
      return { id: handleId, name: handleId };
    };

    const sourceField = getFieldInfo(sourceNode, edge.sourceHandle || '');
    const targetField = getFieldInfo(targetNode, edge.targetHandle || '');

    // Get sample data for source field
    const getSampleValue = (node: Node, fieldName: string) => {
      const nodeData = node.data as any;
      if (nodeData?.data && Array.isArray(nodeData.data) && nodeData.data.length > 0) {
        return nodeData.data[0][fieldName];
      }
      if (nodeData?.fields && Array.isArray(nodeData.fields)) {
        const field = nodeData.fields.find((f: any) => f.name === fieldName);
        return field?.exampleValue;
      }
      return undefined;
    };

    // Direct mapping (source to target) - updated to use new types
    if (sourceNode.type === 'source' && targetNode.type === 'target') {
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

    // Transform step (source to transform, then transform to target) - updated check
    if (sourceNode.type === 'source' && 
        (targetNode.type === 'transform' || targetNode.type === 'splitterTransform' || 
         targetNode.type === 'ifThen' || targetNode.type === 'staticValue')) {
      
      // Find the edge from this transform to a target
      const transformToTargetEdge = edges.find(e => e.source === targetNode.id);
      const finalTargetNode = transformToTargetEdge ? 
        nodes.find(n => n.id === transformToTargetEdge.target) : null;

      if (finalTargetNode && finalTargetNode.type === 'target') {
        const finalTargetField = getFieldInfo(finalTargetNode, transformToTargetEdge!.targetHandle || '');
        const transformData = targetNode.data as any;
        
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
            type: transformData?.transformType || targetNode.type || 'unknown',
            operation: transformData?.config?.operation,
            parameters: transformData?.config?.parameters || {},
            expression: transformData?.config?.expression
          }
        });
      }
    }

    // Conversion mapping step - updated check
    if (sourceNode.type === 'source' && targetNode.type === 'conversionMapping') {
      // Find the edge from this mapping to a target
      const mappingToTargetEdge = edges.find(e => e.source === targetNode.id);
      const finalTargetNode = mappingToTargetEdge ? 
        nodes.find(n => n.id === mappingToTargetEdge.target) : null;

      if (finalTargetNode && finalTargetNode.type === 'target') {
        const finalTargetField = getFieldInfo(finalTargetNode, mappingToTargetEdge!.targetHandle || '');
        const mappingData = targetNode.data as any;
        
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
            rules: Array.isArray(mappingData?.mappings) ? mappingData.mappings : []
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
  nodes.filter(node => node.type === 'source')
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
  nodes.filter(node => node.type === 'target')
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

  // Extract transform nodes - preserve ALL data for each transform type
  nodes.filter(node => 
    node.type === 'transform' || node.type === 'splitterTransform' || 
    node.type === 'ifThen' || node.type === 'staticValue'
  ).forEach(node => {
    let transformConfig: any = {
      id: node.id,
      type: node.type as any,
      label: String(node.data?.label || 'Transform Node'),
      position: node.position,
      transformType: String(node.data?.transformType || node.type || 'unknown'),
      config: {}
    };

    // Preserve complete node data based on type
    if (node.type === 'ifThen') {
      // Store IF THEN specific data
      transformConfig.config = {
        operation: 'conditional',
        parameters: {
          operator: node.data?.operator || '=',
          compareValue: node.data?.compareValue || '',
          thenValue: node.data?.thenValue || '',
          elseValue: node.data?.elseValue || ''
        }
      };
    } else if (node.type === 'staticValue') {
      // Store Static Value specific data
      transformConfig.config = {
        operation: 'static',
        parameters: {
          value: node.data?.value || '',
          valueType: node.data?.valueType || 'string',
          values: node.data?.values || []
        }
      };
    } else if (node.type === 'splitterTransform') {
      // Store Splitter Transform specific data
      transformConfig.config = {
        operation: 'split',
        parameters: {
          delimiter: node.data?.delimiter || ',',
          splitIndex: node.data?.splitIndex || 0,
          ...node.data?.config
        }
      };
    } else {
      // Generic transform node
      transformConfig.config = node.data?.config || node.data || {};
    }

    config.nodes.transforms.push(transformConfig);
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

  // Extract connections with complete edge information
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    let connectionType: 'direct' | 'transform' | 'mapping' = 'direct';
    
    if (sourceNode?.type === 'transform' || sourceNode?.type === 'splitterTransform' || 
        sourceNode?.type === 'ifThen' || sourceNode?.type === 'staticValue') {
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

  // Import source nodes with complete data preservation
  config.nodes.sources.forEach(sourceConfig => {
    nodes.push({
      id: sourceConfig.id,
      type: 'source',
      position: sourceConfig.position,
      data: {
        label: sourceConfig.label,
        fields: sourceConfig.schema.fields,
        data: sourceConfig.sampleData,
        schemaType: 'source' // Ensure schema type is preserved
      }
    });
  });

  // Import target nodes with complete data preservation
  config.nodes.targets.forEach(targetConfig => {
    nodes.push({
      id: targetConfig.id,
      type: 'target',
      position: targetConfig.position,
      data: {
        label: targetConfig.label,
        fields: targetConfig.schema.fields,
        data: targetConfig.outputData || [],
        schemaType: 'target' // Ensure schema type is preserved
      }
    });
  });

  // Import transform nodes with complete data preservation
  config.nodes.transforms.forEach(transformConfig => {
    let nodeType = transformConfig.type;
    let nodeData: any = {
      label: transformConfig.label,
      transformType: transformConfig.transformType
    };

    // Restore node data based on transform type
    if (transformConfig.transformType === 'IF THEN' || transformConfig.type === 'ifThen') {
      nodeType = 'ifThen';
      const params = transformConfig.config?.parameters || {};
      nodeData = {
        label: transformConfig.label,
        operator: params.operator || '=',
        compareValue: params.compareValue || '',
        thenValue: params.thenValue || '',
        elseValue: params.elseValue || ''
      };
    } else if (transformConfig.transformType === 'Static Value' || transformConfig.type === 'staticValue') {
      nodeType = 'staticValue';
      const params = transformConfig.config?.parameters || {};
      nodeData = {
        label: transformConfig.label,
        value: params.value || '',
        valueType: params.valueType || 'string',
        values: params.values || []
      };
    } else if (transformConfig.transformType === 'Text Splitter' || transformConfig.type === 'splitterTransform') {
      nodeType = 'splitterTransform';
      const params = transformConfig.config?.parameters || {};
      nodeData = {
        label: transformConfig.label,
        delimiter: params.delimiter || ',',
        splitIndex: params.splitIndex || 0,
        config: transformConfig.config
      };
    } else {
      nodeType = 'transform';
      nodeData = {
        label: transformConfig.label,
        transformType: transformConfig.transformType,
        config: transformConfig.config
      };
    }

    nodes.push({
      id: transformConfig.id,
      type: nodeType,
      position: transformConfig.position,
      data: nodeData
    });
  });

  // Import mapping nodes with complete data preservation
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

  // Import connections with complete edge styling
  config.connections.forEach(connectionConfig => {
    const sourceExists = nodes.some(n => n.id === connectionConfig.sourceNodeId);
    const targetExists = nodes.some(n => n.id === connectionConfig.targetNodeId);
    
    if (sourceExists && targetExists) {
      edges.push({
        id: connectionConfig.id,
        source: connectionConfig.sourceNodeId,
        target: connectionConfig.targetNodeId,
        sourceHandle: connectionConfig.sourceHandle || undefined,
        targetHandle: connectionConfig.targetHandle || undefined,
        type: 'smoothstep',
        animated: true,
        style: { 
          strokeWidth: 2.0,
          stroke: '#3b82f6'
        }
      });
    } else {
      console.warn(`Skipping connection ${connectionConfig.id} - missing nodes:`, {
        sourceExists,
        targetExists,
        sourceId: connectionConfig.sourceNodeId,
        targetId: connectionConfig.targetNodeId
      });
    }
  });

  console.log('Import completed - Nodes:', nodes.length, 'Edges:', edges.length);
  console.log('Imported nodes:', nodes.map(n => ({ id: n.id, type: n.type, hasData: !!n.data })));
  console.log('Imported edges:', edges.map(e => ({ id: e.id, source: e.source, target: e.target })));

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
