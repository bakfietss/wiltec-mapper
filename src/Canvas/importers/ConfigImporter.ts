
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
    let nodeType = transformConfig.type;
    let nodeData: any = {
      label: transformConfig.label,
      transformType: transformConfig.transformType
    };

    console.log('Importing transform node:', transformConfig.id, 'type:', transformConfig.type, 'transformType:', transformConfig.transformType);

    // Restore node data based on transform type
    if (transformConfig.transformType === 'coalesce' || transformConfig.type === 'transform') {
      nodeType = 'transform';
      
      // For coalesce transforms, ensure we have the proper structure
      if (transformConfig.transformType === 'coalesce') {
        console.log('Restoring coalesce transform node:', transformConfig.id);
        
        // Get coalesce data from config - using type assertion to access properties
        const coalesceConfig = transformConfig.config as any;
        
        // Extract the rules directly from the config
        const rules = coalesceConfig?.rules || [];
        const defaultValue = coalesceConfig?.defaultValue || '';
        const outputType = coalesceConfig?.outputType || 'value';
        const inputValues = coalesceConfig?.inputValues || {};
        
        console.log('Restoring coalesce rules:', rules);
        console.log('Restoring coalesce defaultValue:', defaultValue);
        
        nodeData = {
          label: transformConfig.label,
          transformType: 'coalesce',
          rules: rules,
          defaultValue: defaultValue,
          outputType: outputType,
          inputValues: inputValues,
          config: {
            rules: rules,
            defaultValue: defaultValue,
            outputType: outputType,
            inputValues: inputValues
          }
        };
        
        console.log('Restored coalesce node data:', nodeData);
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
      if ((transformConfig as any).nodeData) {
        nodeData = {
          label: transformConfig.label,
          ...((transformConfig as any).nodeData)
        };
      } else {
        const params = transformConfig.config?.parameters || {};
        nodeData = {
          label: transformConfig.label,
          operator: params.operator || '=',
          compareValue: params.compareValue || '',
          thenValue: params.thenValue || '',
          elseValue: params.elseValue || ''
        };
      }
    } else if (transformConfig.transformType === 'Static Value' || transformConfig.type === 'staticValue') {
      nodeType = 'staticValue';
      if ((transformConfig as any).nodeData && (transformConfig as any).nodeData.values) {
        nodeData = {
          label: transformConfig.label,
          values: (transformConfig as any).nodeData.values
        };
      } else {
        const params = transformConfig.config?.parameters || {};
        nodeData = {
          label: transformConfig.label,
          values: params.values || []
        };
      }
    } else if (transformConfig.transformType === 'Text Splitter' || transformConfig.type === 'splitterTransform') {
      nodeType = 'splitterTransform';
      if ((transformConfig as any).nodeData) {
        nodeData = {
          label: transformConfig.label,
          ...((transformConfig as any).nodeData)
        };
      } else {
        const params = transformConfig.config?.parameters || {};
        nodeData = {
          label: transformConfig.label,
          delimiter: params.delimiter || ',',
          splitIndex: params.splitIndex || 0,
          config: transformConfig.config
        };
      }
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

  // Import connections - with better validation
  config.connections.forEach(connectionConfig => {
    const sourceNode = nodes.find(n => n.id === connectionConfig.sourceNodeId);
    const targetNode = nodes.find(n => n.id === connectionConfig.targetNodeId);
    
    console.log('Importing connection:', connectionConfig.id, 'from', connectionConfig.sourceNodeId, 'to', connectionConfig.targetNodeId);
    console.log('Source handle:', connectionConfig.sourceHandle, 'Target handle:', connectionConfig.targetHandle);
    
    if (sourceNode && targetNode) {
      // For source nodes, validate that the source handle exists in the fields
      if (sourceNode.type === 'source') {
        const sourceFields = sourceNode.data?.fields || [];
        const sourceHandleExists = sourceFields.some((field: any) => field.id === connectionConfig.sourceHandle);
        
        if (!sourceHandleExists) {
          console.warn('Source handle not found in source node fields:', connectionConfig.sourceHandle, 'Available fields:', sourceFields);
          // Try to find a field with matching name instead of id
          const fieldByName = sourceFields.find((field: any) => field.name === connectionConfig.sourceHandle);
          if (fieldByName) {
            console.log('Found field by name, using field id:', fieldByName.id);
            connectionConfig.sourceHandle = fieldByName.id;
          } else {
            console.warn('Could not find matching field, skipping connection');
            return;
          }
        }
      }
      
      // For coalesce target nodes, validate that the target handle (rule) exists
      if (targetNode.type === 'transform' && targetNode.data?.transformType === 'coalesce') {
        const targetRules = targetNode.data?.rules || [];
        const targetHandleExists = targetRules.some((rule: any) => rule.id === connectionConfig.targetHandle);
        
        if (!targetHandleExists) {
          console.warn('Target handle (rule) not found in coalesce node:', connectionConfig.targetHandle, 'Available rules:', targetRules);
          return;
        }
      }
      
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
