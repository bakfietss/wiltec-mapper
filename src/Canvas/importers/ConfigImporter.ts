
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
        data: src.sampleData,
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

  // 3. Transforms
  config.nodes.transforms.forEach(tx => {
    let node: Node;
    
    if (tx.transformType === 'coalesce') {
      node = {
        id: tx.id,
        type: 'transform',
        position: tx.position,
        data: {
          label: tx.label,
          transformType: 'coalesce',
          config: {
            rules: tx.config?.rules || [],
            defaultValue: tx.config?.defaultValue || ''
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

  // 5. Original Connections - restore basic connections first
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

  // 6. Enhanced edge reconstruction from execution mappings
  if (config.execution && config.execution.steps) {
    config.execution.steps.forEach(step => {
      // Handle all types of execution steps to rebuild connections
      const sourceNodeId = step.source?.nodeId;
      const targetNodeId = step.target?.nodeId;
      const sourceFieldId = step.source?.fieldId || step.source?.fieldName;
      const targetFieldId = step.target?.fieldId || step.target?.fieldName;

      if (sourceNodeId && targetNodeId && sourceFieldId && targetFieldId) {
        const edgeId = `execution-edge-${sourceNodeId}-${targetNodeId}-${sourceFieldId}-${targetFieldId}`;
        
        // Check if edge already exists to avoid duplicates
        const existingEdge = edges.find(e => 
          e.source === sourceNodeId && 
          e.target === targetNodeId && 
          e.sourceHandle === sourceFieldId && 
          e.targetHandle === targetFieldId
        );

        if (!existingEdge) {
          edges.push({
            id: edgeId,
            source: sourceNodeId,
            target: targetNodeId,
            sourceHandle: sourceFieldId,
            targetHandle: targetFieldId,
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 2, stroke: '#3b82f6' }
          });
        }
      }

      // Special handling for coalesce transforms
      if (step.transform && step.transform.type === 'coalesce' && step.transform.parameters) {
        const parameters = step.transform.parameters as any;
        
        if (parameters && Array.isArray(parameters.rules)) {
          const coalesceNodeId = step.target.nodeId;
          const coalesceNode = nodeMap.get(coalesceNodeId);
          
          if (coalesceNode) {
            // Update the coalesce node with the rules from execution mapping
            const enhancedRules = parameters.rules.map((rule: any) => ({
              id: rule.id || `rule_${Date.now()}_${Math.random()}`,
              priority: rule.priority || 1,
              outputValue: rule.outputValue || '',
              sourceField: rule.sourceField || '',
              sourceHandle: rule.sourceHandle || ''
            }));
            
            // Ensure coalesceNode.data exists and has proper structure
            if (!coalesceNode.data) {
              coalesceNode.data = {};
            }
            
            // Ensure config exists and is properly typed
            if (!coalesceNode.data.config) {
              coalesceNode.data.config = {};
            }
            
            // Update the config with proper typing
            const nodeConfig = coalesceNode.data.config as any;
            nodeConfig.rules = enhancedRules;
            nodeConfig.defaultValue = parameters.defaultValue || '';
            
            // Create input edges for each rule with improved field matching
            enhancedRules.forEach((rule: any) => {
              if (rule.sourceHandle || rule.sourceField) {
                const handleToMatch = rule.sourceHandle || rule.sourceField;
                
                // Find the source node that contains this field with more flexible matching
                const sourceNode = Array.from(nodeMap.values()).find(node => {
                  if (node.type === 'source' && node.data?.fields && Array.isArray(node.data.fields)) {
                    return findFieldInSource(node.data.fields, handleToMatch);
                  }
                  // Also check other node types that might be sources
                  if ((node.type === 'transform' || node.type === 'staticValue' || node.type === 'ifThen') && node.id.includes(handleToMatch)) {
                    return true;
                  }
                  return false;
                });
                
                if (sourceNode) {
                  const edgeId = `coalesce-rule-${sourceNode.id}-${coalesceNodeId}-${rule.id}`;
                  
                  // Only add edge if it doesn't already exist
                  const existingEdge = edges.find(e => e.id === edgeId);
                  if (!existingEdge) {
                    edges.push({
                      id: edgeId,
                      source: sourceNode.id,
                      target: coalesceNodeId,
                      sourceHandle: handleToMatch,
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
    });
  }

  console.log('Import completed:', { 
    nodesCount: nodes.length, 
    edgesCount: edges.length,
    nodeTypes: nodes.map(n => n.type),
    edgeConnections: edges.map(e => `${e.source} -> ${e.target}`)
  });

  return { nodes, edges };
};

// Helper function to check if a field exists in source fields (including nested) - improved matching
const findFieldInSource = (fields: any[], handleId: string): boolean => {
  if (!Array.isArray(fields)) return false;
  
  for (const field of fields) {
    // Check exact ID match
    if (field.id === handleId) return true;
    // Check exact name match
    if (field.name === handleId) return true;
    // Check partial matches for flexibility
    if (field.id && field.id.includes(handleId)) return true;
    if (field.name && field.name.includes(handleId)) return true;
    // Check nested children
    if (field.children && Array.isArray(field.children)) {
      if (findFieldInSource(field.children, handleId)) return true;
    }
  }
  
  return false;
};
