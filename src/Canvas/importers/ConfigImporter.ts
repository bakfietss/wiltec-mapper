
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
    console.log('Importing source node:', sourceConfig.id, 'with fields:', sourceConfig.schema.fields);
    
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

  // Import transform nodes with complete data preservation
  config.nodes.transforms.forEach(transformConfig => {
    console.log('Importing transform node:', transformConfig.id, 'type:', transformConfig.type, 'transformType:', transformConfig.transformType);

    // Handle coalesce transforms with proper data extraction
    if (transformConfig.transformType === 'coalesce') {
      console.log('Processing coalesce transform node:', transformConfig.id);
      console.log('Full transform config:', JSON.stringify(transformConfig, null, 2));
      
      // Extract coalesce data from various possible locations in the config
      let coalesceData: any = {};
      
      // Check if data is in config object
      if (transformConfig.config) {
        coalesceData = transformConfig.config;
      }
      
      // Check if data is nested under parameters
      if (transformConfig.config?.parameters) {
        coalesceData = { ...coalesceData, ...transformConfig.config.parameters };
      }
      
      // Check if data is directly on the transform config (from export)
      if ((transformConfig as any).rules) {
        coalesceData.rules = (transformConfig as any).rules;
      }
      if ((transformConfig as any).defaultValue !== undefined) {
        coalesceData.defaultValue = (transformConfig as any).defaultValue;
      }
      if ((transformConfig as any).outputType) {
        coalesceData.outputType = (transformConfig as any).outputType;
      }
      if ((transformConfig as any).inputValues) {
        coalesceData.inputValues = (transformConfig as any).inputValues;
      }

      const nodeData = {
        label: transformConfig.label,
        rules: coalesceData.rules || [],
        defaultValue: coalesceData.defaultValue || '',
        outputType: coalesceData.outputType || 'value',
        inputValues: coalesceData.inputValues || {}
      };
      
      console.log('Final coalesce node data:', nodeData);
      
      nodes.push({
        id: transformConfig.id,
        type: 'transform',
        position: transformConfig.position,
        data: nodeData
      });
    } else if (transformConfig.transformType === 'IF THEN' || transformConfig.type === 'ifThen') {
      let nodeData: any = {
        label: transformConfig.label
      };
      
      if ((transformConfig as any).nodeData) {
        nodeData = { ...nodeData, ...((transformConfig as any).nodeData) };
      } else {
        const params = transformConfig.config?.parameters || {};
        nodeData = {
          ...nodeData,
          operator: params.operator || '=',
          compareValue: params.compareValue || '',
          thenValue: params.thenValue || '',
          elseValue: params.elseValue || ''
        };
      }
      
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
      
      if ((transformConfig as any).nodeData && (transformConfig as any).nodeData.values) {
        nodeData.values = (transformConfig as any).nodeData.values;
      } else {
        const params = transformConfig.config?.parameters || {};
        nodeData.values = params.values || [];
      }
      
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
      
      if ((transformConfig as any).nodeData) {
        nodeData = { ...nodeData, ...((transformConfig as any).nodeData) };
      } else {
        const params = transformConfig.config?.parameters || {};
        nodeData = {
          ...nodeData,
          delimiter: params.delimiter || ',',
          splitIndex: params.splitIndex || 0,
          config: transformConfig.config
        };
      }
      
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

  // Expand source nodes for nested connections
  const nestedConnections = config.connections.filter(conn => 
    conn.sourceHandle && conn.sourceHandle.includes('.')
  );

  nestedConnections.forEach(connection => {
    const sourceNode = nodes.find(n => n.id === connection.sourceNodeId);
    if (sourceNode && sourceNode.type === 'source') {
      const path = connection.sourceHandle;
      const pathParts = path.split('.');
      
      console.log('Expanding nested path for source node:', sourceNode.id, 'path:', path);
      
      let currentFields = sourceNode.data.fields as any[] || [];
      let currentPath = '';
      
      // Ensure the nested structure exists
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        currentPath = currentPath ? `${currentPath}.${part}` : part;
        
        let existingField = currentFields.find((f: any) => f.id === part || f.name === part);
        
        if (!existingField) {
          existingField = {
            id: part,
            name: part,
            type: i === pathParts.length - 1 ? 'string' : 'object',
            children: i === pathParts.length - 1 ? undefined : []
          };
          currentFields.push(existingField);
          console.log('Added nested field:', part, 'to path:', currentPath);
        }
        
        if (i < pathParts.length - 1) {
          if (!existingField.children) {
            existingField.children = [];
          }
          currentFields = existingField.children;
        }
      }
    }
  });

  // Import connections with simplified validation
  config.connections.forEach(connectionConfig => {
    const sourceNode = nodes.find(n => n.id === connectionConfig.sourceNodeId);
    const targetNode = nodes.find(n => n.id === connectionConfig.targetNodeId);
    
    console.log('Importing connection:', connectionConfig.id, 'from', connectionConfig.sourceNodeId, 'to', connectionConfig.targetNodeId);
    
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
