
import { Node, Edge } from '@xyflow/react';
import { ExecutionMapping, ExecutionMappingConfig } from '../types/MappingTypes';

export const exportExecutionMapping = (
  nodes: Node[],
  edges: Edge[],
  name: string = 'Untitled Mapping'
): ExecutionMappingConfig => {
  const mappings: ExecutionMapping[] = [];
  
  console.log('=== GENERATING EXECUTION MAPPINGS ===');
  console.log('Processing nodes:', nodes.length, 'edges:', edges.length);

  const targetNodes = nodes.filter(node => node.type === 'target');
  
  console.log('Target nodes:', targetNodes.length);

  // Helper function to find source field by handle (supports nested field names)
  const findSourceFieldByHandle = (sourceFields: any[], handleId: string): any => {
    if (!Array.isArray(sourceFields)) return null;
    
    console.log(`Searching for handle: "${handleId}" in fields:`, sourceFields.map(f => f.name || f.id));
    
    // First try exact ID match
    let field = sourceFields.find((f: any) => f.id === handleId);
    if (field) {
      console.log(`Found exact ID match:`, field);
      return field;
    }
    
    // Then try exact name match
    field = sourceFields.find((f: any) => f.name === handleId);
    if (field) {
      console.log(`Found exact name match:`, field);
      return field;
    }
    
    // For nested fields, recursively search children
    for (const sourceField of sourceFields) {
      if (sourceField.children && Array.isArray(sourceField.children)) {
        const nestedField = findSourceFieldByHandle(sourceField.children, handleId);
        if (nestedField) {
          console.log(`Found nested field:`, nestedField);
          return nestedField;
        }
      }
    }
    
    // If still not found, try to match by the handle itself as field name
    // This handles cases where the handle is the actual field path like "itinerary.actual_time_of_arrival"
    console.log(`No exact match found, using handle as field name: "${handleId}"`);
    return { id: handleId, name: handleId };
  };

  // Process each target node to find its incoming mappings
  targetNodes.forEach(targetNode => {
    const nodeData = targetNode.data as any;
    const targetFields = nodeData?.fields || [];
    console.log(`Processing target node: ${targetNode.id} with ${targetFields.length} fields`);
    
    if (Array.isArray(targetFields)) {
      targetFields.forEach(targetField => {
        // Find edges that connect to this target field
        const incomingEdges = edges.filter(edge => 
          edge.target === targetNode.id && edge.targetHandle === targetField.id
        );
        
        console.log(`Target field ${targetField.name} (${targetField.id}) has ${incomingEdges.length} incoming edges`);
        
        incomingEdges.forEach(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          if (!sourceNode) return;
          
          console.log(`Processing edge from ${sourceNode.type} (${sourceNode.id}) to ${targetField.name}`);
          
          let mapping: ExecutionMapping;
          
          if (sourceNode.type === 'source') {
            // Direct mapping from source to target
            const sourceData = sourceNode.data as any;
            const sourceFields = sourceData?.fields;
            const sourceField = findSourceFieldByHandle(sourceFields, edge.sourceHandle || '');
            
            console.log(`Looking for source field with handle: "${edge.sourceHandle}"`);
            console.log('Available source fields:', sourceFields);
            console.log('Found source field:', sourceField);
            
            mapping = {
              from: sourceField?.name || edge.sourceHandle || '',
              to: targetField.name,
              type: 'direct'
            };
            
          } else if (sourceNode.type === 'staticValue') {
            // Static value mapping
            const sourceData = sourceNode.data as any;
            const staticValues = sourceData?.values;
            const staticValue = Array.isArray(staticValues) ? 
              staticValues.find((v: any) => v.id === edge.sourceHandle) : null;
            
            mapping = {
              from: null,
              to: targetField.name,
              type: 'static',
              value: staticValue?.value || ''
            };
            
          } else if (sourceNode.type === 'ifThen') {
            // IF THEN conditional mapping
            const sourceData = sourceNode.data as any;
            const operator = typeof sourceData?.operator === 'string' ? sourceData.operator : '=';
            const compareValue = typeof sourceData?.compareValue === 'string' ? sourceData.compareValue : '';
            const thenValue = typeof sourceData?.thenValue === 'string' ? sourceData.thenValue : '';
            const elseValue = typeof sourceData?.elseValue === 'string' ? sourceData.elseValue : '';
            
            // Find the input to the IF THEN node
            const ifThenInputEdge = edges.find(e => e.target === sourceNode.id);
            const inputSourceNode = ifThenInputEdge ? nodes.find(n => n.id === ifThenInputEdge.source) : null;
            const inputData = inputSourceNode?.data as any;
            const inputFields = inputData?.fields;
            const inputField = findSourceFieldByHandle(inputFields, ifThenInputEdge?.sourceHandle || '');
            
            mapping = {
              from: inputField?.name || '',
              to: targetField.name,
              type: 'ifThen',
              if: {
                operator,
                value: compareValue
              },
              then: thenValue,
              else: elseValue
            };
            
          } else if (sourceNode.type === 'transform' && sourceNode.data?.transformType === 'coalesce') {
            // Coalesce transform mapping
            console.log('=== PROCESSING COALESCE TRANSFORM NODE ===');
            console.log('Coalesce node ID:', sourceNode.id);
            console.log('Coalesce node data:', sourceNode.data);
            
            const sourceData = sourceNode.data as any;
            
            // Get coalesce configuration from the node data config
            const config = sourceData?.config || {};
            const rules = config.rules || [];
            const defaultValue = config.defaultValue || '';
            
            console.log('Coalesce rules from config:', rules);
            console.log('Coalesce defaultValue from config:', defaultValue);
            
            // Find all inputs to the coalesce node and build the source field mappings
            const coalesceInputEdges = edges.filter(e => e.target === sourceNode.id);
            console.log('=== COALESCE INPUT EDGES ===');
            console.log('All edges going to coalesce node:', coalesceInputEdges);
            
            // Create enhanced rules with source field information
            const enhancedRules = rules.map((rule: any) => {
              // Find the edge that connects to this specific rule
              const ruleEdge = coalesceInputEdges.find(edge => edge.targetHandle === rule.id);
              
              if (ruleEdge) {
                const inputNode = nodes.find(n => n.id === ruleEdge.source);
                if (inputNode && inputNode.type === 'source') {
                  const inputData = inputNode.data as any;
                  const inputFields = inputData?.fields;
                  const inputField = findSourceFieldByHandle(inputFields, ruleEdge.sourceHandle || '');
                  
                  console.log(`Rule ${rule.id} connected to source field:`, inputField?.name || ruleEdge.sourceHandle);
                  
                  return {
                    ...rule,
                    sourceField: inputField?.name || ruleEdge.sourceHandle || '',
                    sourceHandle: ruleEdge.sourceHandle
                  };
                }
              }
              
              console.log(`Rule ${rule.id} has no source connection`);
              return {
                ...rule,
                sourceField: '',
                sourceHandle: ''
              };
            });
            
            console.log('Enhanced rules with source information:', enhancedRules);
            
            mapping = {
              from: null, // For coalesce, we don't have a single 'from' field
              to: targetField.name,
              type: 'transform',
              transform: {
                type: 'coalesce',
                operation: 'coalesce',
                parameters: {
                  rules: enhancedRules, // Use enhanced rules with source field info
                  defaultValue: defaultValue
                }
              }
            };
            
            console.log('=== FINAL COALESCE MAPPING ===');
            console.log('Created coalesce execution mapping:', mapping);
            
          } else if (sourceNode.type === 'conversionMapping') {
            // Conversion mapping - handle transform chain
            const sourceData = sourceNode.data as any;
            const conversionMappings = sourceData?.mappings;
            const mapObject: Record<string, string> = {};
            
            if (Array.isArray(conversionMappings)) {
              conversionMappings.forEach((mapping: any) => {
                mapObject[mapping.from] = mapping.to;
              });
            }
            
            // Find the input to the conversion mapping node
            const conversionInputEdge = edges.find(e => e.target === sourceNode.id);
            const inputNode = conversionInputEdge ? nodes.find(n => n.id === conversionInputEdge.source) : null;
            
            let originalSourceField: string = '';
            let transformInfo: any = null;
            
            if (inputNode) {
              if (inputNode.type === 'source') {
                // Direct source to conversion mapping
                const inputData = inputNode.data as any;
                const inputFields = inputData?.fields;
                const inputField = findSourceFieldByHandle(inputFields, conversionInputEdge?.sourceHandle || '');
                originalSourceField = inputField?.name || '';
              } else if (inputNode.type === 'transform' || inputNode.type === 'splitterTransform') {
                // Transform node feeding into conversion mapping
                const transformData = inputNode.data as any;
                
                // Find the input to the transform node
                const transformInputEdge = edges.find(e => e.target === inputNode.id);
                const transformSourceNode = transformInputEdge ? nodes.find(n => n.id === transformInputEdge.source) : null;
                
                if (transformSourceNode && transformSourceNode.type === 'source') {
                  const transformSourceData = transformSourceNode.data as any;
                  const transformSourceFields = transformSourceData?.fields;
                  const transformSourceField = findSourceFieldByHandle(transformSourceFields, transformInputEdge?.sourceHandle || '');
                  originalSourceField = transformSourceField?.name || '';
                  
                  // Extract transform information
                  if (inputNode.type === 'transform') {
                    const config = transformData?.config || {};
                    transformInfo = {
                      type: transformData?.transformType || 'transform',
                      operation: config.stringOperation || config.operation || 'unknown',
                      parameters: config
                    };
                    
                    // Handle substring operation specifically
                    if (config.stringOperation === 'substring') {
                      transformInfo = {
                        type: 'substring',
                        start: config.substringStart || 0,
                        end: config.substringEnd
                      };
                    }
                  } else if (inputNode.type === 'splitterTransform') {
                    transformInfo = {
                      type: 'split',
                      delimiter: transformData?.delimiter || ',',
                      index: transformData?.splitIndex || 0
                    };
                  }
                }
              }
            }
            
            mapping = {
              from: originalSourceField,
              to: targetField.name,
              type: 'map',
              map: mapObject,
              defaultValue: 'NotMapped' // Ensure default value is always added for map type
            };
            
            // Add transform information if present
            if (transformInfo) {
              mapping.transform = transformInfo;
            }
          } else {
            // Fallback for unknown node types
            console.log('Unknown node type for execution mapping:', sourceNode.type);
            return;
          }
          
          if (mapping!) {
            console.log('Generated mapping:', mapping);
            mappings.push(mapping);
          }
        });
      });
    }
  });

  const config: ExecutionMappingConfig = {
    name,
    version: '1.0.0',
    mappings,
    metadata: {
      description: 'Simplified execution mapping configuration for integration tools',
      tags: ['execution', 'integration', 'data-transformation'],
      author: 'Lovable Mapping Tool'
    }
  };

  console.log('=== FINAL EXECUTION CONFIG ===');
  console.log(config);
  
  return config;
};
