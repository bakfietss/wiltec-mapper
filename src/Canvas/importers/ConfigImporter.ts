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

    // Handle coalesce transforms FIRST with proper data extraction
    if (transformConfig.transformType === 'coalesce') {
      console.log('Processing coalesce transform node:', transformConfig.id);
      console.log('Transform config structure:', transformConfig);
      
      // The JSON structure has the data nested under 'config'
      const configData = transformConfig.config as any;
      console.log('Config data:', configData);
      
      // Extract coalesce-specific data and put it at root level for CoalesceTransformNode
      nodeData = {
        label: transformConfig.label,
        transformType: 'coalesce',
        rules: configData?.rules || [],
        defaultValue: configData?.defaultValue || '',
        outputType: configData?.outputType || 'value',
        inputValues: configData?.inputValues || {}
      };
      
      // Set the correct node type for coalesce
      nodeType = 'transform'; // This will route to TransformNode which then routes to CoalesceTransformNode
      
      console.log('Final coalesce node data:', nodeData);
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
    } else {
      // Handle generic transform nodes and any other types
      console.log('Processing generic transform node:', transformConfig.id, 'with type:', transformConfig.type);
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

  // Track which nested paths we need to expand in source nodes
  const nestedPathsToExpand = new Set<string>();

  // First pass: collect all nested paths that are being used in connections
  config.connections.forEach(connectionConfig => {
    const sourceHandle = connectionConfig.sourceHandle;
    if (sourceHandle && sourceHandle.includes('.')) {
      nestedPathsToExpand.add(`${connectionConfig.sourceNodeId}:${sourceHandle}`);
    }
  });

  // Second pass: expand source nodes that have nested connections
  nestedPathsToExpand.forEach(pathKey => {
    const [nodeId, path] = pathKey.split(':');
    const sourceNode = nodes.find(n => n.id === nodeId);
    
    if (sourceNode && sourceNode.type === 'source') {
      console.log('Expanding nested path for source node:', nodeId, 'path:', path);
      
      // Add nested field to the source node's fields if it doesn't exist
      const fields = sourceNode.data.fields as any[] || [];
      const pathParts = path.split('.');
      
      // Create nested field structure
      let currentFields = fields;
      let currentPath = '';
      
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        currentPath = currentPath ? `${currentPath}.${part}` : part;
        
        // Check if field exists at this level
        let existingField = currentFields.find((f: any) => f.id === part || f.name === part);
        
        if (!existingField) {
          // Create the field
          existingField = {
            id: part,
            name: part,
            type: i === pathParts.length - 1 ? 'string' : 'object',
            children: i === pathParts.length - 1 ? undefined : []
          };
          currentFields.push(existingField);
          console.log('Added field:', part, 'to path:', currentPath);
        }
        
        // Move to children for next iteration if not the last part
        if (i < pathParts.length - 1) {
          if (!existingField.children) {
            existingField.children = [];
          }
          currentFields = existingField.children;
        }
      }
      
      // Update the node data
      sourceNode.data = {
        ...sourceNode.data,
        fields: fields
      };
    }
  });

  // Import connections with improved validation
  config.connections.forEach(connectionConfig => {
    const sourceNode = nodes.find(n => n.id === connectionConfig.sourceNodeId);
    const targetNode = nodes.find(n => n.id === connectionConfig.targetNodeId);
    
    console.log('Importing connection:', connectionConfig.id, 'from', connectionConfig.sourceNodeId, 'to', connectionConfig.targetNodeId);
    console.log('Source handle:', connectionConfig.sourceHandle, 'Target handle:', connectionConfig.targetHandle);
    
    if (sourceNode && targetNode) {
      let canCreateEdge = true;
      
      // For source nodes, validate that the source handle exists (more flexible validation)
      if (sourceNode.type === 'source') {
        const sourceFields = (sourceNode.data?.fields || []) as any[];
        const sourceHandle = connectionConfig.sourceHandle;
        
        if (sourceHandle) {
          let sourceHandleExists = false;
          
          // Check if it's a direct field match first
          sourceHandleExists = sourceFields.some((field: any) => field.id === sourceHandle || field.name === sourceHandle);
          
          // If not found and it's a nested path, validate the nested structure
          if (!sourceHandleExists && sourceHandle.includes('.')) {
            sourceHandleExists = validateNestedFieldPath(sourceFields, sourceHandle);
          }
          
          // If still not found, check in sample data
          if (!sourceHandleExists && sourceNode.data?.data && Array.isArray(sourceNode.data.data) && sourceNode.data.data.length > 0) {
            const sampleData = sourceNode.data.data[0];
            sourceHandleExists = checkNestedPath(sampleData, sourceHandle);
          }
          
          // For nested paths, try extracting the last part and check if it exists
          if (!sourceHandleExists && sourceHandle.includes('.')) {
            const lastPart = sourceHandle.split('.').pop();
            sourceHandleExists = sourceFields.some((field: any) => field.id === lastPart || field.name === lastPart);
          }
          
          if (!sourceHandleExists) {
            console.warn('Source handle not found, but allowing edge creation:', sourceHandle);
            // Allow edge creation anyway - the field might be dynamically created
          }
        }
      }
      
      // For coalesce target nodes, validate that the target handle (rule) exists
      if (canCreateEdge && targetNode.type === 'transform' && targetNode.data?.transformType === 'coalesce') {
        const targetRules = (targetNode.data?.rules || []) as any[];
        const targetHandle = connectionConfig.targetHandle;
        
        if (targetHandle && targetRules.length > 0) {
          const targetHandleExists = targetRules.some((rule: any) => rule.id === targetHandle);
          
          if (!targetHandleExists) {
            console.warn('Target handle (rule) not found in coalesce node:', targetHandle, 'Available rules:', targetRules.map(r => r.id));
            // Still allow the edge - the rule might be created later
          }
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

// Helper function to validate nested field paths
const validateNestedFieldPath = (fields: any[], path: string): boolean => {
  const pathParts = path.split('.');
  let currentFields = fields;
  
  for (const part of pathParts) {
    const field = currentFields.find((f: any) => f.id === part || f.name === part);
    if (!field) {
      return false;
    }
    if (field.children) {
      currentFields = field.children;
    }
  }
  
  return true;
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
