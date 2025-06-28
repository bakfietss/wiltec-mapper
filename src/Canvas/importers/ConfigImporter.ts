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
        fields: src.schema?.fields || [], // Import schema fields directly
        data: src.sampleData || [], // Sample data array
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
      fields: tgt.schema?.fields || [],
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

  // 3. Transforms - Fixed coalesce handling
  config.nodes.transforms.forEach(tx => {
    let node: Node;
    
    console.log('Processing transform:', tx.id, 'transformType:', tx.transformType);
    
    if (tx.transformType === 'coalesce') {
      console.log('FOUND COALESCE TRANSFORM:', tx.id);
      
      // Create coalesceTransform node with proper structure
      node = {
        id: tx.id,
        type: 'coalesceTransform', // Use the correct type
        position: tx.position,
        data: {
          label: tx.label,
          transformType: 'coalesce',
          config: {
            rules: [], // Will be populated from execution steps
            defaultValue: ''
          }
        }
      };
    } else if (tx.transformType === 'ifThen' || tx.transformType === 'IF THEN') {
      const rawConfig = (tx.config ?? {}) as any;
      const params = (rawConfig.parameters && typeof rawConfig.parameters === 'object')
        ? rawConfig.parameters
        : rawConfig;
      
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
      const rawConfig = (tx.config ?? {}) as any;
      const params = (rawConfig.parameters && typeof rawConfig.parameters === 'object')
        ? rawConfig.parameters
        : rawConfig;
      
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
      const rawConfig = (tx.config ?? {}) as any;
      const params = (rawConfig.parameters && typeof rawConfig.parameters === 'object')
        ? rawConfig.parameters
        : rawConfig;
      
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

  // 6. Reconstruct coalesce rules from connections
  const coalesceNodes = nodes.filter(n => n.type === 'coalesceTransform');
  console.log('Found coalesce nodes:', coalesceNodes.length);
  
  coalesceNodes.forEach(coalesceNode => {
    console.log('Processing coalesce node:', coalesceNode.id);
    
    // Find all incoming edges to this coalesce node
    const incomingEdges = edges.filter(edge => 
      edge.target === coalesceNode.id && 
      edge.targetHandle && 
      edge.targetHandle.startsWith('rule-')
    );
    
    console.log('Found incoming edges:', incomingEdges.length);
    
    // Group edges by rule ID and create rules
    const ruleMap = new Map<string, any>();
    
    incomingEdges.forEach(edge => {
      const ruleId = edge.targetHandle;
      if (ruleId && ruleId.startsWith('rule-')) {
        if (!ruleMap.has(ruleId)) {
          ruleMap.set(ruleId, {
            id: ruleId,
            priority: ruleMap.size + 1,
            outputValue: `Value ${ruleMap.size + 1}`,
            sourceHandle: edge.sourceHandle
          });
        }
      }
    });
    
    const rules = Array.from(ruleMap.values());
    console.log('Created rules for coalesce node:', coalesceNode.id, rules);
    
    // Update the coalesce node with the rules
    if (coalesceNode.data && coalesceNode.data.config) {
      coalesceNode.data.config.rules = rules;
    }
  });

  console.log('Import completed:', { 
    nodesCount: nodes.length, 
    edgesCount: edges.length,
    sourceNodes: nodes.filter(n => n.type === 'source').map(n => ({ 
      id: n.id, 
      fields: (n.data?.fields && Array.isArray(n.data.fields)) ? n.data.fields.length : 0,
      sampleData: (n.data?.data && Array.isArray(n.data.data)) ? n.data.data.length : 0
    }))
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
