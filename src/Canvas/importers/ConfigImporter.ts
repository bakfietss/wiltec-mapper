
import { Node, Edge } from '@xyflow/react';
import { MappingConfiguration } from '../types/MappingTypes';

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
        schemaType: 'source'
      }
    });
  });

  // Import target nodes with complete data preservation
  config.nodes.targets.forEach(targetConfig => {
    const nodeData: any = {
      label: targetConfig.label,
      fields: targetConfig.schema.fields,
      data: targetConfig.outputData || [],
      schemaType: 'target'
    };
    
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

  // Import transform nodes with complete data preservation
  config.nodes.transforms.forEach(transformConfig => {
    // Handle coalesce transforms with proper data extraction
    if (transformConfig.transformType === 'coalesce') {
      console.log('Processing coalesce transform node:', transformConfig.id);
      
      // Extract coalesce data from config
      const coalesceConfig = transformConfig.config || {};
      const rules = coalesceConfig.rules || [];
      const defaultValue = coalesceConfig.defaultValue || '';
      const outputType = coalesceConfig.outputType || 'value';
      const inputValues = coalesceConfig.inputValues || {};

      // Create the node with correct data structure
      nodes.push({
        id: transformConfig.id,
        type: 'transform',
        position: transformConfig.position,
        data: {
          label: transformConfig.label,
          transformType: 'coalesce',
          rules: rules,
          defaultValue: defaultValue,
          outputType: outputType,
          inputValues: inputValues
        }
      });
    } else if (transformConfig.transformType === 'IF THEN' || transformConfig.type === 'ifThen') {
      let nodeData: any = {
        label: transformConfig.label
      };
      
      const params = transformConfig.config?.parameters || {};
      nodeData = {
        ...nodeData,
        operator: params.operator || '=',
        compareValue: params.compareValue || '',
        thenValue: params.thenValue || '',
        elseValue: params.elseValue || ''
      };
      
      nodes.push({
        id: transformConfig.id,
        type: 'ifThen',
        position: transformConfig.position,
        data: nodeData
      });
    } else if (transformConfig.transformType === 'Static Value' || transformConfig.type === 'staticValue') {
      let nodeData: any = {
        label: transformConfig.label
      };
      
      const params = transformConfig.config?.parameters || {};
      nodeData.values = params.values || [];
      
      nodes.push({
        id: transformConfig.id,
        type: 'staticValue',
        position: transformConfig.position,
        data: nodeData
      });
    } else if (transformConfig.transformType === 'Text Splitter' || transformConfig.type === 'splitterTransform') {
      let nodeData: any = {
        label: transformConfig.label
      };
      
      const params = transformConfig.config?.parameters || {};
      nodeData = {
        ...nodeData,
        delimiter: params.delimiter || ',',
        splitIndex: params.splitIndex || 0,
        config: transformConfig.config
      };
      
      nodes.push({
        id: transformConfig.id,
        type: 'splitterTransform',
        position: transformConfig.position,
        data: nodeData
      });
    } else {
      // Handle generic transform nodes
      nodes.push({
        id: transformConfig.id,
        type: 'transform',
        position: transformConfig.position,
        data: {
          label: transformConfig.label,
          transformType: transformConfig.transformType,
          config: transformConfig.config
        }
      });
    }
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

  // Import connections with proper validation
  config.connections.forEach(connectionConfig => {
    const sourceNode = nodes.find(n => n.id === connectionConfig.sourceNodeId);
    const targetNode = nodes.find(n => n.id === connectionConfig.targetNodeId);
    
    if (sourceNode && targetNode) {
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
    }
  });

  console.log('Import completed - Nodes:', nodes.length, 'Edges:', edges.length);

  return { nodes, edges };
};
