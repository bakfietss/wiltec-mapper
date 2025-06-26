
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

  // Helper function to get source path from a node and handle
  const getSourcePath = (nodeId: string, handleId: string | null): string => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !handleId) return '';
    
    if (node.type === 'source') {
      const nodeData = node.data as any;
      const fields = nodeData?.fields;
      if (Array.isArray(fields)) {
        const field = fields.find((f: any) => f.id === handleId);
        return field?.name || '';
      }
    }
    return '';
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
        
        console.log(`Target field ${targetField.name} has ${incomingEdges.length} incoming edges`);
        
        incomingEdges.forEach(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          if (!sourceNode) return;
          
          console.log(`Processing edge from ${sourceNode.type} to ${targetField.name}`);
          console.log('Source node ID:', sourceNode.id);
          console.log('Source node type:', sourceNode.type);
          console.log('Source node data:', sourceNode.data);
          console.log('Source node transformType:', sourceNode.data?.transformType);
          
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
              type: 'direct',
              sourcePath: sourceField?.name || ''
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
              value: staticValue?.value || '',
              sourcePath: '' // Static values don't have source paths
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
            const inputSourcePath = ifThenInputEdge ? getSourcePath(ifThenInputEdge.source, ifThenInputEdge.sourceHandle) : '';
            
            mapping = {
              from: inputSourcePath,
              to: targetField.name,
              type: 'ifThen',
              if: {
                operator,
                value: compareValue
              },
              then: thenValue,
              else: elseValue,
              sourcePath: inputSourcePath
            };
            
          } else if (sourceNode.type === 'transform') {
            console.log('=== FOUND TRANSFORM NODE ===');
            console.log('Transform type:', sourceNode.data?.transformType);
            
            // Check if this is a coalesce transform
            if (sourceNode.data?.transformType === 'coalesce') {
              console.log('=== PROCESSING COALESCE TRANSFORM NODE ===');
              console.log('Coalesce node ID:', sourceNode.id);
              console.log('Coalesce node data:', sourceNode.data);
              
              const sourceData = sourceNode.data as any;
              
              // Get coalesce configuration from the node data
              const coalesceConfig = sourceData?.config || {};
              const rules = coalesceConfig?.rules || [];
              const defaultValue = coalesceConfig?.defaultValue || '';
              
              console.log('Original coalesce rules from config:', rules);
              console.log('Coalesce defaultValue from config:', defaultValue);
              
              // Find all input edges to the coalesce node
              const coalesceInputEdges = edges.filter(e => e.target === sourceNode.id);
              console.log('Coalesce input edges:', coalesceInputEdges);
              
              // Create a map of rule ID to source path
              const ruleSourcePaths: Record<string, string> = {};
              coalesceInputEdges.forEach(inputEdge => {
                const sourcePath = getSourcePath(inputEdge.source, inputEdge.sourceHandle);
                if (inputEdge.targetHandle && sourcePath) {
                  ruleSourcePaths[inputEdge.targetHandle] = sourcePath;
                  console.log(`Mapped rule ${inputEdge.targetHandle} to source path: ${sourcePath}`);
                }
              });
              
              console.log('Rule source paths map:', ruleSourcePaths);
              
              // Build enhanced rules with source paths - REMOVE id property and add sourcePath
              const enhancedRules = rules.map((rule: any) => {
                const sourcePath = ruleSourcePaths[rule.id] || '';
                console.log(`Rule ${rule.id} (priority ${rule.priority}) -> sourcePath: ${sourcePath}`);
                
                // Return rule WITHOUT the id property and WITH sourcePath
                return {
                  priority: rule.priority,
                  outputValue: rule.outputValue,
                  sourcePath: sourcePath
                };
              });
              
              console.log('Final enhanced coalesce rules for export:', enhancedRules);
              
              mapping = {
                from: '', // Keep empty for coalesce as it has multiple sources
                to: targetField.name,
                type: 'transform',
                transform: {
                  type: 'coalesce',
                  parameters: {
                    rules: enhancedRules,
                    defaultValue: defaultValue
                  }
                },
                sourcePath: '' // Multiple source paths are in the rules
              };
              
              console.log('Created enhanced coalesce execution mapping:', mapping);
            } else {
              // Generic transform mapping
              const sourceData = sourceNode.data as any;
              const transformConfig = sourceData?.config || {};
              
              // Find the input to the transform node
              const transformInputEdge = edges.find(e => e.target === sourceNode.id);
              const inputSourcePath = transformInputEdge ? getSourcePath(transformInputEdge.source, transformInputEdge.sourceHandle) : '';
              
              const operation = transformConfig?.stringOperation || transformConfig?.operation || 'unknown';
              let transformInfo: any = {
                type: sourceData?.transformType || 'unknown',
                operation,
                parameters: transformConfig
              };
              
              // Handle substring operation specifically for cleaner output
              if (operation === 'substring') {
                transformInfo = {
                  type: 'substring',
                  start: transformConfig.substringStart || 0
                };
                if (transformConfig.substringEnd !== undefined) {
                  transformInfo.end = transformConfig.substringEnd;
                }
              }
              
              mapping = {
                from: inputSourcePath,
                to: targetField.name,
                type: 'transform',
                transform: transformInfo,
                sourcePath: inputSourcePath
              };
            }
            
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
            let originalSourcePath: string = '';
            let transformInfo: any = null;
            
            if (conversionInputEdge) {
              originalSourcePath = getSourcePath(conversionInputEdge.source, conversionInputEdge.sourceHandle);
              
              // Check if there's a transform node in the chain
              const inputNode = nodes.find(n => n.id === conversionInputEdge.source);
              if (inputNode && (inputNode.type === 'transform' || inputNode.type === 'splitterTransform')) {
                const transformData = inputNode.data as any;
                
                // Find the input to the transform node to get the original source
                const transformInputEdge = edges.find(e => e.target === inputNode.id);
                if (transformInputEdge) {
                  originalSourcePath = getSourcePath(transformInputEdge.source, transformInputEdge.sourceHandle);
                  
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
              from: originalSourcePath,
              to: targetField.name,
              type: 'map',
              map: mapObject,
              defaultValue: 'NotMapped',
              sourcePath: originalSourcePath
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
