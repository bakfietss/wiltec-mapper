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
        
        console.log(`Target field ${targetField.name} has ${incomingEdges.length} incoming edges`);
        
        incomingEdges.forEach(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          if (!sourceNode) return;
          
          console.log(`Processing edge from ${sourceNode.type} (${sourceNode.id}) to ${targetField.name}`);
          
          let mapping: ExecutionMapping;
          
          if (sourceNode.type === 'source') {
            // Direct mapping from source to target
            const sourceData = sourceNode.data as any;
            const sourceFields = sourceData?.fields;
            const sourceField = Array.isArray(sourceFields) ? 
              sourceFields.find((f: any) => f.id === edge.sourceHandle) : null;
            
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
            const inputField = Array.isArray(inputFields) ? 
              inputFields.find((f: any) => f.id === ifThenInputEdge?.sourceHandle) : null;
            
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
            console.log('PROCESSING COALESCE TRANSFORM NODE FOR EXECUTION:', sourceNode.id);
            const sourceData = sourceNode.data as any;
            
            // Get coalesce configuration from the node data config
            const config = sourceData?.config || {};
            const rules = config.rules || [];
            const defaultValue = config.defaultValue || '';
            
            console.log('Coalesce rules from config:', rules);
            console.log('Coalesce defaultValue from config:', defaultValue);
            
            // Find all inputs to the coalesce node and build the source field mappings
            const coalesceInputEdges = edges.filter(e => e.target === sourceNode.id);
            const inputSources: string[] = [];
            const sourceFieldMappings: Record<string, string> = {};
            
            console.log('Coalesce input edges:', coalesceInputEdges.length);
            
            // Build mapping of rule IDs to their corresponding source fields
            coalesceInputEdges.forEach(inputEdge => {
              const inputNode = nodes.find(n => n.id === inputEdge.source);
              if (inputNode && inputNode.type === 'source') {
                const inputData = inputNode.data as any;
                const inputFields = inputData?.fields;
                const inputField = Array.isArray(inputFields) ? 
                  inputFields.find((f: any) => f.id === inputEdge.sourceHandle) : null;
                
                if (inputField && inputEdge.targetHandle) {
                  // Map the target handle (rule ID) to the source field name
                  sourceFieldMappings[inputEdge.targetHandle] = inputField.name;
                  inputSources.push(inputField.name);
                  console.log(`Mapped rule ${inputEdge.targetHandle} to source field: ${inputField.name}`);
                }
              }
            });
            
            // Build ordered sources array based on rule priority
            const orderedSources: string[] = [];
            rules.forEach((rule: any) => {
              const sourceField = sourceFieldMappings[rule.id];
              if (sourceField) {
                orderedSources.push(sourceField);
              } else {
                orderedSources.push(''); // Empty if no source connected to this rule
              }
            });
            
            mapping = {
              from: orderedSources.length > 0 ? orderedSources[0] : null,
              to: targetField.name,
              type: 'transform',
              transform: {
                type: 'coalesce',
                operation: 'coalesce',
                parameters: {
                  sources: orderedSources, // Now properly ordered based on rule priority
                  rules: rules,
                  defaultValue: defaultValue
                }
              }
            };
            
            console.log('Created coalesce execution mapping with ordered sources:', mapping);
            
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
                const inputField = Array.isArray(inputFields) ? 
                  inputFields.find((f: any) => f.id === conversionInputEdge?.sourceHandle) : null;
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
                  const transformSourceField = Array.isArray(transformSourceFields) ? 
                    transformSourceFields.find((f: any) => f.id === transformInputEdge?.sourceHandle) : null;
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
