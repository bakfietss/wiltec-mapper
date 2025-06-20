
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
        
        // Get coalesce data from config - check both direct config and nested config
        const coalesceConfig = transformConfig.config as any;
        
        // Extract the rules - they might be in config.rules or config.config.rules
        let rules = coalesceConfig?.rules || [];
        let defaultValue = coalesceConfig?.defaultValue || '';
        let outputType = coalesceConfig?.outputType || 'value';
        let inputValues = coalesceConfig?.inputValues || {};
        
        // If rules not found in direct config, check nested config
        if (rules.length === 0 && coalesceConfig?.config) {
          rules = coalesceConfig.config.rules || [];
          defaultValue = coalesceConfig.config.defaultValue || defaultValue;
          outputType = coalesceConfig.config.outputType || outputType;
          inputValues = coalesceConfig.config.inputValues || inputValues;
        }
        
        console.log('Restoring coalesce rules:', rules);
        console.log('Restoring coalesce defaultValue:', defaultValue);
        
        // Create the node data with rules at the root level (where CoalesceTransformNode expects them)
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

  // Import connections with improved validation for coalesce nodes
  config.connections.forEach(connectionConfig => {
    const sourceNode = nodes.find(n => n.id === connectionConfig.sourceNodeId);
    const targetNode = nodes.find(n => n.id === connectionConfig.targetNodeId);
    
    console.log('Importing connection:', connectionConfig.id, 'from', connectionConfig.sourceNodeId, 'to', connectionConfig.targetNodeId);
    console.log('Source handle:', connectionConfig.sourceHandle, 'Target handle:', connectionConfig.targetHandle);
    
    if (sourceNode && targetNode) {
      let canCreateEdge = true;
      
      // For source nodes, validate that the source handle exists
      if (sourceNode.type === 'source') {
        const sourceFields = (sourceNode.data?.fields || []) as any[];
        const sourceHandle = connectionConfig.sourceHandle;
        
        // Try multiple validation strategies
        let sourceHandleExists = false;
        
        // 1. Direct ID match
        sourceHandleExists = sourceFields.some((field: any) => field.id === sourceHandle);
        
        // 2. If not found and handle contains dots, try finding by the last part (field name)
        if (!sourceHandleExists && sourceHandle && sourceHandle.includes('.')) {
          const fieldName = sourceHandle.split('.').pop();
          sourceHandleExists = sourceFields.some((field: any) => field.id === fieldName || field.name === fieldName);
          
          if (sourceHandleExists) {
            console.log('Found field by extracted name:', fieldName, 'from handle:', sourceHandle);
          }
        }
        
        // 3. Try finding by name match
        if (!sourceHandleExists) {
          sourceHandleExists = sourceFields.some((field: any) => field.name === sourceHandle);
          if (sourceHandleExists) {
            console.log('Found field by name match:', sourceHandle);
          }
        }
        
        // 4. For nested data structures, check if the handle represents a valid path
        if (!sourceHandleExists && sourceNode.data?.data && Array.isArray(sourceNode.data.data) && sourceNode.data.data.length > 0) {
          const sampleData = sourceNode.data.data[0];
          const pathExists = checkNestedPath(sampleData, sourceHandle);
          if (pathExists) {
            sourceHandleExists = true;
            console.log('Found valid nested path:', sourceHandle);
          }
        }
        
        if (!sourceHandleExists) {
          console.warn('Source handle not found:', sourceHandle, 'Available fields:', sourceFields.map(f => ({ id: f.id, name: f.name })));
          canCreateEdge = false;
        }
      }
      
      // For coalesce target nodes, validate that the target handle (rule) exists
      if (canCreateEdge && targetNode.type === 'transform' && targetNode.data?.transformType === 'coalesce') {
        const targetRules = (targetNode.data?.rules || []) as any[];
        const targetHandle = connectionConfig.targetHandle;
        const targetHandleExists = targetRules.some((rule: any) => rule.id === targetHandle);
        
        if (!targetHandleExists) {
          console.warn('Target handle (rule) not found in coalesce node:', targetHandle, 'Available rules:', targetRules.map(r => r.id));
          canCreateEdge = false;
        }
      }
      
      if (canCreateEdge) {
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
        console.warn('Skipping edge - validation failed:', connectionConfig);
      }
    } else {
      console.warn('Skipping edge - source or target node not found:', connectionConfig);
    }
  });

  console.log('Import completed - Nodes:', nodes.length, 'Edges:', edges.length);
  console.log('Final nodes:', nodes);
  console.log('Final edges:', edges);

  return { nodes, edges };
};

// Helper function to check if a nested path exists in an object
const checkNestedPath = (obj: any, path: string): boolean => {
  if (!obj || !path) return false;
  
  try {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return false;
      }
    }
    
    return true;
  } catch (e) {
    return false;
  }
};
