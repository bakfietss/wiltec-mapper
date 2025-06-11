
import { Node, Edge } from '@xyflow/react';
import { MappingConfiguration, SourceNodeConfig, TargetNodeConfig } from '../types/MappingTypes';
import { buildExecutionSteps } from '../utils/ExecutionStepBuilder';

export const exportUIMappingConfiguration = (
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
      description: 'UI mapping configuration for canvas restoration',
      tags: ['ui-state', 'canvas-layout', 'visual-mapping'],
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

  // Extract target nodes - preserve fieldValues
  nodes.filter(node => node.type === 'target')
    .forEach(node => {
      const targetConfig: TargetNodeConfig = {
        id: node.id,
        type: 'target',
        label: String(node.data?.label || 'Target Node'),
        position: node.position,
        schema: {
          fields: Array.isArray(node.data?.fields) ? node.data.fields : []
        },
        outputData: Array.isArray(node.data?.data) ? node.data.data : []
      };
      
      // Preserve fieldValues if they exist
      if (node.data?.fieldValues && typeof node.data.fieldValues === 'object') {
        (targetConfig as any).fieldValues = node.data.fieldValues;
      }
      
      config.nodes.targets.push(targetConfig);
    });

  // Extract transform nodes - preserve complete data for each transform type
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
      transformConfig.config = {
        operation: 'conditional',
        parameters: {
          operator: node.data?.operator || '=',
          compareValue: node.data?.compareValue || '',
          thenValue: node.data?.thenValue || '',
          elseValue: node.data?.elseValue || ''
        }
      };
      transformConfig.nodeData = {
        operator: node.data?.operator || '=',
        compareValue: node.data?.compareValue || '',
        thenValue: node.data?.thenValue || '',
        elseValue: node.data?.elseValue || ''
      };
    } else if (node.type === 'staticValue') {
      transformConfig.config = {
        operation: 'static',
        parameters: {
          values: node.data?.values || []
        }
      };
      transformConfig.nodeData = {
        values: node.data?.values || []
      };
    } else if (node.type === 'splitterTransform') {
      const additionalConfig = node.data?.config && typeof node.data.config === 'object' ? node.data.config : {};
      transformConfig.config = {
        operation: 'split',
        parameters: {
          delimiter: node.data?.delimiter || ',',
          splitIndex: node.data?.splitIndex || 0,
          ...additionalConfig
        }
      };
      transformConfig.nodeData = {
        delimiter: node.data?.delimiter || ',',
        splitIndex: node.data?.splitIndex || 0,
        config: additionalConfig
      };
    } else {
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

  // Extract connections
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    
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
