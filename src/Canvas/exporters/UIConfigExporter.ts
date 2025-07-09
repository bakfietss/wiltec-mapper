
import { Node, Edge } from '@xyflow/react';
import { MappingConfiguration, SourceNodeConfig, TargetNodeConfig } from '../types/MappingTypes';
import { buildExecutionSteps } from '../utils/ExecutionStepBuilder';

export const exportUIMappingConfiguration = (
  nodes: Node[],
  edges: Edge[],
  name: string = 'Untitled Mapping'
): MappingConfiguration => {
  console.log('=== EXPORT DEBUG START ===');
  console.log('Exporting nodes:', nodes.length);
  console.log('All nodes and their types:', nodes.map(n => ({ id: n.id, type: n.type, transformType: n.data?.transformType })));
  
  // Add comprehensive debug for ALL nodes that contain "coalesce" anywhere
  nodes.forEach(node => {
    const nodeId = typeof node.id === 'string' ? node.id.toLowerCase() : '';
    const nodeType = typeof node.type === 'string' ? node.type.toLowerCase() : '';
    const transformType = typeof node.data?.transformType === 'string' ? node.data.transformType.toLowerCase() : '';
    
    if (nodeId.includes('coalesce') || nodeType.includes('coalesce') || transformType.includes('coalesce')) {
      console.log('FOUND COALESCE-LIKE NODE:', {
        id: node.id,
        type: node.type,
        transformType: node.data?.transformType,
        fullData: node.data
      });
    }
  });

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

  // Extract source nodes - USING ONLY SAMPLEDATA AS SINGLE SOURCE OF TRUTH
  nodes.filter(node => node.type === 'source')
    .forEach(node => {
      // Clean fields structure - remove exampleValue since we use sampleData only
      const cleanFields = Array.isArray(node.data?.fields) ? 
        node.data.fields.map((field: any) => ({
          id: field.id,
          name: field.name,
          type: field.type,
          ...(field.children && { children: field.children }),
          ...(field.parent && { parent: field.parent }),
          ...(field.groupBy && { groupBy: field.groupBy })
          // NOTE: No exampleValue - using sampleData only
        })) : [];

      config.nodes.sources.push({
        id: node.id,
        type: 'source',
        label: String(node.data?.label || 'Source Node'),
        position: node.position,
        schema: {
          fields: cleanFields
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

  // Extract ALL transform-like nodes - FIXED LOGIC
  const allTransformNodes = nodes.filter(node => {
    // Include any node that is NOT a basic node type (source, target, conversionMapping)
    const isBasicNode = ['source', 'target', 'conversionMapping'].includes(node.type);
    return !isBasicNode;
  });

  console.log('Transform nodes found:', allTransformNodes.length);
  console.log('Transform nodes details:', allTransformNodes.map(n => ({ 
    id: n.id, 
    type: n.type, 
    transformType: n.data?.transformType,
    hasData: !!n.data 
  })));

  allTransformNodes.forEach(node => {
    console.log('Processing transform node:', node.id, 'type:', node.type);
    
    let transformConfig: any = {
      id: node.id,
      type: node.type, // Use the actual node type directly
      label: String(node.data?.label || 'Transform Node'),
      position: node.position,
      transformType: String(node.data?.transformType || node.type || 'unknown'),
      config: {}
    };

    // Handle different node types based on their actual type
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
    } else if (node.type === 'coalesceTransform' || (node.type === 'transform' && node.data?.transformType === 'coalesce')) {
      console.log('COALESCE EXPORT:', node);
      console.log('PROCESSING COALESCE TRANSFORM NODE:', node.id);
      console.log('Coalesce node data:', node.data);
      
      // Get the actual rules from the node's current data with proper type checking
      const nodeData = node.data as any;
      const nodeRules = (nodeData?.rules && Array.isArray(nodeData.rules)) ? nodeData.rules : 
                       (nodeData?.config?.rules && Array.isArray(nodeData.config.rules)) ? nodeData.config.rules : [];
      console.log('Raw node rules:', nodeRules);
      
      // If rules are empty, try to build them from connections and inputValues
      let processedRules = [];
      
      if (nodeRules.length > 0) {
        // Use existing rules
        processedRules = nodeRules.map((rule: any) => ({
          id: rule.id,
          priority: rule.priority || 1,
          outputValue: rule.outputValue || '',
          sourceField: rule.sourceField || '',
          sourceHandle: rule.sourceHandle || rule.sourceField || ''
        }));
      } else {
        // Build rules from connections and inputValues
        const incomingEdges = edges.filter(edge => edge.target === node.id);
        console.log('Building rules from connections:', incomingEdges);
        
        processedRules = incomingEdges.map((edge, index) => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const sourceFieldName = edge.sourceHandle;
          
          // Try to find existing rule with this ID or create new one
          const existingRule = nodeRules.find((r: any) => r.id === edge.targetHandle);
          
          return {
            id: edge.targetHandle || `rule-${Date.now()}-${index}`,
            priority: index + 1,
            outputValue: existingRule?.outputValue || `Value ${index + 1}`, // Use existing or default
            sourceField: sourceFieldName || '',
            sourceHandle: sourceFieldName || ''
          };
        }).sort((a, b) => a.priority - b.priority);
      }
      
      // Safe access to defaultValue with type checking
      const defaultValue = (nodeData?.defaultValue && typeof nodeData.defaultValue === 'string') ? nodeData.defaultValue :
                          (nodeData?.config?.defaultValue && typeof nodeData.config.defaultValue === 'string') ? nodeData.config.defaultValue : '';
      
      transformConfig.config = {
        operation: 'coalesce',
        parameters: {
          rules: processedRules,
          defaultValue: defaultValue,
          outputType: nodeData?.outputType || 'value'
        }
      };
      transformConfig.nodeData = {
        rules: processedRules,
        defaultValue: defaultValue,
        outputType: nodeData?.outputType || 'value',
        inputValues: nodeData?.inputValues || {}
      };
      
      console.log('Coalesce transform config created:', transformConfig);
    } else {
      // Handle generic transform nodes and any other types
      console.log('Processing generic transform node:', node.id, 'with type:', node.type);
      transformConfig.config = node.data?.config || node.data || {};
      if (node.data) {
        transformConfig.nodeData = node.data;
      }
    }

    console.log('Adding transform config:', transformConfig.id, 'with type:', transformConfig.type);
    config.nodes.transforms.push(transformConfig);
  });

  console.log('Final transforms in config:', config.nodes.transforms.length);
  console.log('Transform IDs and types:', config.nodes.transforms.map(t => ({ id: t.id, type: t.type, transformType: t.transformType })));

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

  // Extract connections with proper source handle normalization
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    
    let connectionType: 'direct' | 'transform' | 'mapping' = 'direct';
    
    if (sourceNode && !['source', 'target', 'conversionMapping'].includes(sourceNode.type)) {
      connectionType = 'transform';
    } else if (sourceNode?.type === 'conversionMapping') {
      connectionType = 'mapping';
    }

    // Normalize source handle - ensure we use current field names, not old IDs
    let normalizedSourceHandle = edge.sourceHandle || '';
    
    // If source is a source node, ensure we're using the field name not any legacy ID
    if (sourceNode?.type === 'source' && normalizedSourceHandle) {
      // Find the actual field in the source node data by ID or name
      const sourceFields = Array.isArray(sourceNode.data?.fields) ? sourceNode.data.fields : [];
      const matchingField = sourceFields.find((field: any) => 
        field.id === normalizedSourceHandle || field.name === normalizedSourceHandle
      );
      
      if (matchingField) {
        normalizedSourceHandle = matchingField.name; // Always use the field name
        console.log(`Normalized source handle from ${edge.sourceHandle} to ${normalizedSourceHandle}`);
      }
    }

    config.connections.push({
      id: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      sourceHandle: normalizedSourceHandle,
      targetHandle: edge.targetHandle || '',
      type: connectionType
    });
  });

  console.log('=== EXPORT DEBUG END ===');
  console.log('Final config transforms:', config.nodes.transforms);
  
  return config;
};
