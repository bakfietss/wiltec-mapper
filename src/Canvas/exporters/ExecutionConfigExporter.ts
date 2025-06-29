
import { Node, Edge } from '@xyflow/react';
import { ExecutionMapping, ExecutionMappingConfig } from '../types/MappingTypes';

interface ArrayMappingStructure {
  target: string;
  groupBy?: string;
  mappings: ExecutionMapping[];
  arrays?: ArrayMappingStructure[];
}

interface EnhancedExecutionMappingConfig extends Omit<ExecutionMappingConfig, 'mappings'> {
  mappings: ExecutionMapping[];
  arrays?: ArrayMappingStructure[];
}

// Helper function to detect if a field is part of an array structure
const getFieldPath = (field: any): string[] => {
  const path: string[] = [];
  let current = field;
  
  while (current) {
    path.unshift(current.name);
    current = current.parent;
  }
  
  return path;
};

// Helper function to build field hierarchy with parent references
const buildFieldHierarchy = (fields: any[], parent: any = null): any[] => {
  return fields.map(field => {
    const enhancedField = { ...field, parent };
    if (field.children && Array.isArray(field.children)) {
      enhancedField.children = buildFieldHierarchy(field.children, enhancedField);
    }
    return enhancedField;
  });
};

// Helper function to check if a field is an array type
const isArrayField = (field: any): boolean => {
  return field.type === 'array' || (field.children && Array.isArray(field.children) && field.children.length > 0);
};

// Helper function to find array ancestors for a field
const findArrayAncestors = (field: any): any[] => {
  const ancestors: any[] = [];
  let current = field.parent;
  
  while (current) {
    if (isArrayField(current)) {
      ancestors.unshift(current);
    }
    current = current.parent;
  }
  
  return ancestors;
};

// Helper function to determine groupBy field for array structures
const determineGroupBy = (field: any, mappings: ExecutionMapping[]): string | undefined => {
  console.log(`Determining groupBy for field: ${field.name}`, field);
  
  // 1. Use explicitly set groupBy from field configuration
  if (field.groupBy) {
    console.log(`Using explicit groupBy: ${field.groupBy}`);
    return field.groupBy;
  }
  
  // 2. If groupBy is explicitly set to empty string or null, respect that choice (no grouping)
  if (field.hasOwnProperty('groupBy') && (field.groupBy === '' || field.groupBy === null)) {
    console.log(`GroupBy explicitly set to empty - no grouping will be applied`);
    return undefined;
  }
  
  // 3. Only auto-detect if groupBy is completely undefined (legacy support)
  // Auto-detect based on common patterns in field names
  const groupingPatterns = ['Number', 'Id', 'Code', 'Key'];
  const candidate = mappings.find(m => 
    groupingPatterns.some(pattern => m.to.toLowerCase().includes(pattern.toLowerCase()))
  );
  
  if (candidate) {
    console.log(`Auto-detected groupBy from mappings: ${candidate.to}`);
    return candidate.to;
  }
  
  // 4. Fallback to first child field name if available (legacy support)
  if (field.children && field.children.length > 0) {
    const firstChild = field.children[0].name;
    console.log(`Using first child field as groupBy: ${firstChild}`);
    return firstChild;
  }
  
  console.log(`No groupBy determined for field: ${field.name}`);
  return undefined;
};

export const exportExecutionMapping = (
  nodes: Node[],
  edges: Edge[],
  name: string = 'Untitled Mapping'
): EnhancedExecutionMappingConfig => {
  const rootMappings: ExecutionMapping[] = [];
  const arrayStructures: Map<string, ArrayMappingStructure> = new Map();
  
  console.log('=== GENERATING ENHANCED EXECUTION MAPPINGS WITH CONCAT SUPPORT ===');
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
    console.log(`No exact match found, using handle as field name: "${handleId}"`);
    return { id: handleId, name: handleId };
  };

  // Process each target node to find its incoming mappings
  targetNodes.forEach(targetNode => {
    const nodeData = targetNode.data as any;
    const targetFields = nodeData?.fields || [];
    console.log(`Processing target node: ${targetNode.id} with ${targetFields.length} fields`);
    
    // Build field hierarchy with parent references
    const enhancedFields = buildFieldHierarchy(targetFields);
    
    // Recursive function to process fields and their children
    const processFields = (fields: any[], currentPath: string[] = []) => {
      fields.forEach(targetField => {
        const fieldPath = [...currentPath, targetField.name];
        
        // Find edges that connect to this target field
        const incomingEdges = edges.filter(edge => 
          edge.target === targetNode.id && edge.targetHandle === targetField.id
        );
        
        console.log(`Target field ${targetField.name} (${targetField.id}) at path ${fieldPath.join('.')} has ${incomingEdges.length} incoming edges`);
        
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
            
          } else if (sourceNode.type === 'concatTransform' || (sourceNode.type === 'transform' && sourceNode.data?.transformType === 'concat')) {
            // CONCAT TRANSFORM MAPPING - NEW IMPLEMENTATION
            console.log('=== PROCESSING CONCAT TRANSFORM NODE ===');
            console.log('Concat node ID:', sourceNode.id);
            console.log('Concat node data:', sourceNode.data);
            
            const sourceData = sourceNode.data as any;
            const rules = sourceData?.rules || [];
            const delimiter = sourceData?.delimiter || ',';
            
            console.log('Concat rules:', rules);
            console.log('Concat delimiter:', delimiter);
            
            // Find all inputs to the concat node and build the field list
            const concatInputEdges = edges.filter(e => e.target === sourceNode.id);
            console.log('=== CONCAT INPUT EDGES ===');
            console.log('All edges going to concat node:', concatInputEdges);
            
            // Build the fields array for concat parameters
            const fields: string[] = [];
            
            // Sort rules by priority to get correct field order
            const sortedRules = rules.sort((a: any, b: any) => a.priority - b.priority);
            
            sortedRules.forEach((rule: any) => {
              // Find the edge that connects to this specific rule
              const ruleEdge = concatInputEdges.find(edge => edge.targetHandle === rule.id);
              
              if (ruleEdge) {
                const inputNode = nodes.find(n => n.id === ruleEdge.source);
                if (inputNode && inputNode.type === 'source') {
                  const inputData = inputNode.data as any;
                  const inputFields = inputData?.fields;
                  const inputField = findSourceFieldByHandle(inputFields, ruleEdge.sourceHandle || '');
                  
                  const fieldName = inputField?.name || ruleEdge.sourceHandle || '';
                  if (fieldName) {
                    fields.push(fieldName);
                    console.log(`Added field to concat: ${fieldName} (from rule ${rule.id})`);
                  }
                }
              }
            });
            
            console.log('Final concat fields array:', fields);
            
            mapping = {
              from: null, // For concat, we don't have a single 'from' field
              to: targetField.name,
              type: 'transform',
              transform: {
                type: 'concat',
                parameters: {
                  fields: fields,
                  separator: delimiter
                }
              }
            };
            
            console.log('=== FINAL CONCAT MAPPING ===');
            console.log('Created concat execution mapping:', mapping);
            
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
          
          // Determine where to place this mapping based on field path
          const arrayAncestors = findArrayAncestors(targetField);
          
          if (arrayAncestors.length === 0) {
            // Root level mapping
            rootMappings.push(mapping);
          } else {
            // Nested in arrays - build the nested structure with groupBy support
            let currentStructures = arrayStructures;
            let currentArrays: ArrayMappingStructure[] = [];
            
            arrayAncestors.forEach((ancestor, index) => {
              const ancestorPath = fieldPath.slice(0, index + 1).join('.');
              
              if (!currentStructures.has(ancestorPath)) {
                // Determine groupBy for this array structure
                const currentMappings: ExecutionMapping[] = [];
                const groupBy = determineGroupBy(ancestor, currentMappings);
                
                const newArrayStructure: ArrayMappingStructure = {
                  target: ancestor.name,
                  groupBy, // Add the determined groupBy field
                  mappings: [],
                  arrays: []
                };
                
                console.log(`=== CREATED ARRAY STRUCTURE WITH GROUPBY ===`);
                console.log(`Array: ${ancestor.name}, GroupBy: ${groupBy}`);
                
                currentStructures.set(ancestorPath, newArrayStructure);
                
                if (index === 0) {
                  // Top level array
                  currentArrays.push(newArrayStructure);
                } else {
                  // Nested array - add to parent
                  const parentPath = fieldPath.slice(0, index).join('.');
                  const parentStructure = currentStructures.get(parentPath);
                  if (parentStructure) {
                    parentStructure.arrays = parentStructure.arrays || [];
                    parentStructure.arrays.push(newArrayStructure);
                  }
                }
              }
              
              const structure = currentStructures.get(ancestorPath)!;
              
              // Add mapping to the deepest array structure
              if (index === arrayAncestors.length - 1) {
                structure.mappings.push(mapping);
              }
            });
          }
        });
        
        // Process children recursively
        if (targetField.children && Array.isArray(targetField.children)) {
          processFields(targetField.children, fieldPath);
        }
      });
    };
    
    processFields(enhancedFields);
  });

  const config: EnhancedExecutionMappingConfig = {
    name,
    version: '1.0.0',
    mappings: rootMappings,
    metadata: {
      description: 'Enhanced execution mapping configuration with array support, concat transforms, and groupBy functionality for integration tools',
      tags: ['execution', 'integration', 'data-transformation', 'arrays', 'groupBy', 'concat'],
      author: 'Lovable Mapping Tool'
    }
  };

  // Add arrays if any exist
  if (arrayStructures.size > 0) {
    config.arrays = Array.from(arrayStructures.values()).filter(structure => 
      !Array.from(arrayStructures.values()).some(other => 
        other.arrays?.includes(structure)
      )
    );
  }

  console.log('=== FINAL ENHANCED EXECUTION CONFIG WITH CONCAT SUPPORT ===');
  console.log(config);
  
  return config;
};
