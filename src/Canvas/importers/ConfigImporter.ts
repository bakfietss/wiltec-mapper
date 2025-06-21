import { Node, Edge } from '@xyflow/react';
import { MappingConfiguration } from '../types/MappingTypes';

export const importMappingConfiguration = (
  config: MappingConfiguration
): { nodes: Node[], edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  console.log('Starting import with config:', config);

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
        schemaType: 'source'
      }
    });
  });

  // Import target nodes with complete data preservation including fieldValues
  config.nodes.targets.forEach(targetConfig => {
    const nodeData: any = {
      label: targetConfig.label,
      fields: targetConfig.schema.fields,
      data: targetConfig.outputData || [],
      schemaType: 'target'
    };
    
    // Restore fieldValues if they exist
    if ((targetConfig as any).fieldValues) {
      nodeData.fieldValues = (targetConfig as any).fieldValues;
    }
    
    nodes.push({
      id: targetConfig.id,
      type: 'target',
      position: targetConfig.position,
      data: nodeData
    });
  });

  // Import transform nodes with simple structure matching other nodes
  config.nodes.transforms.forEach(transformConfig => {
    let nodeType = transformConfig.type;
    let nodeData: any = {
      label: transformConfig.label,
      transformType: transformConfig.transformType
    };

    if (transformConfig.transformType === 'coalesce' || transformConfig.type === 'transform') {
      nodeType = 'transform';
      
      if (transformConfig.transformType === 'coalesce') {
        // Handle coalesce with simple structure like other nodes
        nodeData = {
          label: transformConfig.label,
          transformType: 'coalesce',
          rules: transformConfig.config?.rules || [],
          defaultValue: transformConfig.config?.defaultValue || '',
        };
      } else {
        // Regular transform node
        nodeData = {
          label: transformConfig.label,
          transformType: transformConfig.transformType,
          config: transformConfig.config
        };
      }
      
    } else if (transformConfig.transformType === 'IF THEN' || transformConfig.type === 'ifThen') {
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
    }

    nodes.push({
      id: transformConfig.id,
      type: nodeType,
      position: transformConfig.position,
      data: nodeData
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
    const sourceExists = nodes.some(n => n.id === connectionConfig.sourceNodeId);
    const targetExists = nodes.some(n => n.id === connectionConfig.targetNodeId);
    
    console.log('Importing connection:', connectionConfig.id, 'from', connectionConfig.sourceNodeId, 'to', connectionConfig.targetNodeId);
    console.log('Source handle:', connectionConfig.sourceHandle, 'Target handle:', connectionConfig.targetHandle);
    
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
      
      console.log('Added edge:', connectionConfig.id);
    } else {
      console.warn('Skipping edge - source or target node not found:', connectionConfig);
    }
  });

  console.log('Import completed - Nodes:', nodes.length, 'Edges:', edges.length);
  console.log('Final nodes:', nodes);
  console.log('Final edges:', edges);

  return { nodes, edges };
};
