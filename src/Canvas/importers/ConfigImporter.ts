
import { Node, Edge } from '@xyflow/react';
import { MappingConfiguration } from '../types/MappingTypes';

export const importMappingConfiguration = (
  config: MappingConfiguration
): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // 1. Sources - use Map for better performance when looking up nodes later
  const nodeMap = new Map<string, Node>();
  
  config.nodes.sources.forEach(src => {
    const node = {
      id: src.id,
      type: 'source',
      position: src.position,
      data: {
        label: src.label,
        fields: src.schema.fields,
        data: src.sampleData || [],
        schemaType: 'source'
      }
    };
    nodes.push(node);
    nodeMap.set(src.id, node);
  });

  // 2. Targets
  config.nodes.targets.forEach(tgt => {
    const nodeData: any = {
      label: tgt.label,
      fields: tgt.schema.fields,
      data: tgt.outputData ?? [],
      schemaType: 'target'
    };
    if ((tgt as any).fieldValues) {
      nodeData.fieldValues = (tgt as any).fieldValues;
    }
    const node = {
      id: tgt.id,
      type: 'target',
      position: tgt.position,
      data: nodeData
    };
    nodes.push(node);
    nodeMap.set(tgt.id, node);
  });

  // 3. Transforms - with proper coalesce handling
  config.nodes.transforms.forEach(tx => {
    let node: Node;
    
    if (tx.transformType === 'coalesce') {
      // Handle different config structures for coalesce
      let rules: any[] = [];
      let defaultValue = '';
      
      // Check for rules in different locations
      if (tx.config?.rules && Array.isArray(tx.config.rules)) {
        rules = tx.config.rules;
      } else if (tx.config?.parameters && typeof tx.config.parameters === 'object' && tx.config.parameters !== null) {
        const params = tx.config.parameters as any;
        if (params.rules && Array.isArray(params.rules)) {
          rules = params.rules;
        }
      }
      
      // Check for default value in different locations
      if (tx.config?.defaultValue) {
        defaultValue = tx.config.defaultValue;
      } else if (tx.config?.parameters && typeof tx.config.parameters === 'object' && tx.config.parameters !== null) {
        const params = tx.config.parameters as any;
        if (params.defaultValue) {
          defaultValue = params.defaultValue;
        }
      }
      
      node = {
        id: tx.id,
        type: 'coalesceTransform',
        position: tx.position,
        data: {
          label: tx.label,
          transformType: 'coalesce',
          config: {
            rules: rules.map((rule: any, index: number) => ({
              id: rule.id || `rule-${Date.now()}-${index}`,
              priority: rule.priority || index + 1,
              outputValue: rule.outputValue || `Value ${index + 1}`
            })),
            defaultValue: defaultValue
          }
        }
      };
    } else if (tx.transformType === 'ifThen' || tx.transformType === 'IF THEN') {
      const params = (tx.config?.parameters as any) ?? {};
      node = {
        id: tx.id,
        type: 'ifThen',
        position: tx.position,
        data: {
          label: tx.label,
          operator: params.operator ?? '=',
          compareValue: params.compareValue ?? '',
          thenValue: params.thenValue ?? '',
          elseValue: params.elseValue ?? ''
        }
      };
    } else if (tx.transformType === 'staticValue' || tx.transformType === 'Static Value') {
      const params = (tx.config?.parameters as any) ?? {};
      node = {
        id: tx.id,
        type: 'staticValue',
        position: tx.position,
        data: {
          label: tx.label,
          values: params.values ?? []
        }
      };
    } else if (tx.transformType === 'splitterTransform' || tx.transformType === 'Text Splitter') {
      const params = (tx.config?.parameters as any) ?? {};
      node = {
        id: tx.id,
        type: 'splitterTransform',
        position: tx.position,
        data: {
          label: tx.label,
          delimiter: params.delimiter ?? ',',
          splitIndex: params.splitIndex ?? 0,
          config: tx.config
        }
      };
    } else {
      node = {
        id: tx.id,
        type: 'transform',
        position: tx.position,
        data: {
          label: tx.label,
          transformType: tx.transformType,
          config: tx.config
        }
      };
    }
    
    nodes.push(node);
    nodeMap.set(tx.id, node);
  });

  // 4. Conversion Mappings
  config.nodes.mappings.forEach(mp => {
    const node = {
      id: mp.id,
      type: 'conversionMapping',
      position: mp.position,
      data: {
        label: mp.label,
        mappings: mp.mappings,
        isExpanded: false
      }
    };
    nodes.push(node);
    nodeMap.set(mp.id, node);
  });

  // 5. Connections - use nodeMap for O(1) lookup instead of O(n) find operations
  config.connections.forEach(conn => {
    const src = nodeMap.get(conn.sourceNodeId);
    const tgt = nodeMap.get(conn.targetNodeId);
    
    if (src && tgt) {
      edges.push({
        id: conn.id,
        source: conn.sourceNodeId,
        target: conn.targetNodeId,
        sourceHandle: conn.sourceHandle || undefined,
        targetHandle: conn.targetHandle || undefined,
        type: 'smoothstep',
        animated: true,
        style: { strokeWidth: 2, stroke: '#3b82f6' }
      });
    }
  });

  // 6. Enhanced coalesce reconstruction from execution mappings
  if (config.execution && config.execution.steps) {
    config.execution.steps.forEach(step => {
      if (step.transform && step.transform.type === 'coalesce' && step.transform.parameters) {
        // Add type guard for parameters
        const parameters = step.transform.parameters;
        
        if (parameters && typeof parameters === 'object' && parameters !== null) {
          const params = parameters as any;
          
          if (params.rules && Array.isArray(params.rules)) {
            const coalesceNodeId = step.target.nodeId;
            const coalesceNode = nodeMap.get(coalesceNodeId);
            
            if (coalesceNode && coalesceNode.type === 'coalesceTransform') {
              // Update the coalesce node with the rules from execution mapping
              const enhancedRules = params.rules.map((rule: any, index: number) => ({
                id: rule.id || `rule_${Date.now()}_${Math.random()}`,
                priority: rule.priority || index + 1,
                outputValue: rule.outputValue || '',
                sourceField: rule.sourceField || '',
                sourceHandle: rule.sourceHandle || ''
              }));
              
              // Ensure proper config structure
              if (!coalesceNode.data.config) {
                coalesceNode.data.config = {};
              }
              
              coalesceNode.data.config.rules = enhancedRules;
              coalesceNode.data.config.defaultValue = params.defaultValue || '';
              
              // Create input edges for each rule
              enhancedRules.forEach((rule: any) => {
                if (rule.sourceHandle) {
                  // Find the source node that contains this field
                  const sourceNode = Array.from(nodeMap.values()).find(node => {
                    if (node.type === 'source' && node.data?.fields && Array.isArray(node.data.fields)) {
                      return findFieldInSource(node.data.fields, rule.sourceHandle);
                    }
                    return false;
                  });
                  
                  if (sourceNode) {
                    const edgeId = `xy-edge__${sourceNode.id}${rule.sourceHandle}-${coalesceNodeId}${rule.id}`;
                    
                    // Only add edge if it doesn't already exist
                    const existingEdge = edges.find(e => e.id === edgeId);
                    if (!existingEdge) {
                      edges.push({
                        id: edgeId,
                        source: sourceNode.id,
                        target: coalesceNodeId,
                        sourceHandle: rule.sourceHandle,
                        targetHandle: rule.id,
                        type: 'smoothstep',
                        animated: true,
                        style: { strokeWidth: 2, stroke: '#3b82f6' }
                      });
                    }
                  }
                }
              });
            }
          }
        }
      }
    });
  }

  return { nodes, edges };
};

// Helper function to check if a field exists in source fields (including nested)
const findFieldInSource = (fields: any[], handleId: string): boolean => {
  if (!Array.isArray(fields)) return false;
  
  for (const field of fields) {
    // Check exact ID match
    if (field.id === handleId) return true;
    // Check exact name match
    if (field.name === handleId) return true;
    // Check nested children
    if (field.children && Array.isArray(field.children)) {
      if (findFieldInSource(field.children, handleId)) return true;
    }
  }
  
  return false;
};
