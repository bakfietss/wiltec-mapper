
import { Node, Edge } from '@xyflow/react';
import { MappingConfiguration } from '../types/MappingTypes';

export const importMappingConfiguration = (
  config: MappingConfiguration
): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // 1. Sources - use Map for better performance when looking up nodes later
  const nodeMap = new Map<string, Node>();
  
  // Track which fields have connections to determine expansion
  const connectedFields = new Set<string>();
  
  // Pre-scan execution steps to identify connected fields
  if (config.execution && config.execution.steps) {
    config.execution.steps.forEach(step => {
      // Handle direct mappings
      if (step.source?.fieldId || step.source?.fieldName) {
        const fieldId = step.source.fieldId || step.source.fieldName;
        connectedFields.add(`${step.source.nodeId}.${fieldId}`);
        
        // Also mark parent paths for expansion
        const pathParts = fieldId.split('.');
        for (let i = 1; i < pathParts.length; i++) {
          const parentPath = pathParts.slice(0, i).join('.');
          connectedFields.add(`${step.source.nodeId}.${parentPath}`);
        }
      }
      
      // Handle coalesce transforms - check rules for source fields
      if (step.transform && step.transform.type === 'coalesce' && step.transform.parameters) {
        const parameters = step.transform.parameters as any;
        if (parameters.rules && Array.isArray(parameters.rules)) {
          parameters.rules.forEach((rule: any) => {
            if (rule.sourceField || rule.sourceHandle) {
              const fieldPath = rule.sourceField || rule.sourceHandle;
              // Find which source node this field belongs to by scanning all source nodes
              config.nodes.sources.forEach(src => {
                if (hasFieldInData(src.sampleData?.[0], fieldPath) || findFieldInSource(src.schema.fields, fieldPath)) {
                  connectedFields.add(`${src.id}.${fieldPath}`);
                  
                  // Also mark parent paths for expansion
                  const pathParts = fieldPath.split('.');
                  for (let i = 1; i < pathParts.length; i++) {
                    const parentPath = pathParts.slice(0, i).join('.');
                    connectedFields.add(`${src.id}.${parentPath}`);
                  }
                }
              });
            }
          });
        }
      }
    });
  }
  
  config.nodes.sources.forEach(src => {
    const node = {
      id: src.id,
      type: 'source',
      position: src.position,
      data: {
        label: src.label,
        fields: src.schema.fields,
        data: src.sampleData,
        schemaType: 'source',
        initialExpandedFields: connectedFields // Pass connected fields for auto-expansion
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
      const sourceNodeId = step.source?.nodeId;
      const targetNodeId = step.target?.nodeId;
      const sourceFieldId = step.source?.fieldId || step.source?.fieldName;
      const targetFieldId = step.target?.fieldId || step.target?.fieldName;

      console.log('Processing execution step:', {
        sourceNodeId,
        targetNodeId,
        sourceFieldId,
        targetFieldId,
        stepType: step.type,
        transform: step.transform
      });

      // Handle coalesce transforms specially - NEW UNIFIED APPROACH
      if (step.transform && step.transform.type === 'coalesce' && step.transform.parameters) {
        const parameters = step.transform.parameters as any;
        const coalesceNodeId = targetNodeId;
        const coalesceNode = nodeMap.get(coalesceNodeId);
        
        console.log('Processing coalesce transform:', { coalesceNodeId, parameters });
        
        if (coalesceNode && parameters && Array.isArray(parameters.rules)) {
          // Update the coalesce node with the rules from execution mapping
          const enhancedRules = parameters.rules.map((rule: any, index: number) => ({
            id: rule.id || `rule_${index}_${Date.now()}`,
            priority: rule.priority || (index + 1),
            outputValue: rule.outputValue || '',
            sourceField: rule.sourceField || rule.sourceHandle || '',
            sourceHandle: rule.sourceHandle || rule.sourceField || ''
          }));
          
          // Ensure the node data structure is correct
          if (!coalesceNode.data.config) {
            coalesceNode.data.config = {};
          }
          
          const nodeConfig = coalesceNode.data.config as any;
          nodeConfig.rules = enhancedRules;
          nodeConfig.defaultValue = parameters.defaultValue || '';
          
          console.log('Updated coalesce node config:', nodeConfig);
          
          // Create input edges for each rule based on the sourceField in the rule
          enhancedRules.forEach((rule: any) => {
            if (rule.sourceField) {
              const fieldPath = rule.sourceField;
              console.log('Creating edge for coalesce rule:', { ruleId: rule.id, fieldPath });
              
              // Find the source node that contains this field
              const sourceNode = Array.from(nodeMap.values()).find(node => {
                if (node.type === 'source' && node.data?.fields && Array.isArray(node.data.fields)) {
                  return findFieldInSource(node.data.fields, fieldPath);
                }
                if (node.type === 'source' && node.data?.data && Array.isArray(node.data.data) && node.data.data.length > 0) {
                  return hasFieldInData(node.data.data[0], fieldPath);
                }
                return false;
              });
              
              console.log('Found source node for field:', { fieldPath, sourceNodeId: sourceNode?.id });
              
              if (sourceNode) {
                const edgeId = `coalesce-rule-${sourceNode.id}-${coalesceNodeId}-${rule.id}`;
                
                // Only add edge if it doesn't already exist
                const existingEdge = edges.find(e => e.id === edgeId);
                if (!existingEdge) {
                  console.log('Creating coalesce edge:', edgeId);
                  edges.push({
                    id: edgeId,
                    source: sourceNode.id,
                    target: coalesceNodeId,
                    sourceHandle: fieldPath,
                    targetHandle: rule.id,
                    type: 'smoothstep',
                    animated: true,
                    style: { strokeWidth: 2, stroke: '#3b82f6' }
                  });
                }
              } else {
                console.warn('Could not find source node for field:', fieldPath);
              }
            }
          });
        }
      } else if (sourceNodeId && targetNodeId && sourceFieldId && targetFieldId) {
        // Handle regular direct mappings
        const edgeId = `execution-edge-${sourceNodeId}-${targetNodeId}-${sourceFieldId}-${targetFieldId}`;
        
        // Check if edge already exists to avoid duplicates
        const existingEdge = edges.find(e => 
          e.source === sourceNodeId && 
          e.target === targetNodeId && 
          e.sourceHandle === sourceFieldId && 
          e.targetHandle === targetFieldId
        );

        if (!existingEdge) {
          console.log('Creating regular edge:', edgeId);
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
    });
  }

  console.log('Import completed:', { 
    nodesCount: nodes.length, 
    edgesCount: edges.length,
    nodeTypes: nodes.map(n => n.type),
    edgeConnections: edges.map(e => `${e.source}[${e.sourceHandle}] -> ${e.target}[${e.targetHandle}]`),
    connectedFieldsCount: connectedFields.size
  });

  return { nodes, edges };
};

// Helper function to check if a field exists in source fields (including nested)
const findFieldInSource = (fields: any[], handleId: string): boolean => {
  if (!Array.isArray(fields)) return false;
  
  for (const field of fields) {
    if (field.id === handleId || field.name === handleId) return true;
    if (field.children && Array.isArray(field.children)) {
      if (findFieldInSource(field.children, handleId)) return true;
    }
  }
  
  return false;
};

// Helper function to check if a field exists in data structure
const hasFieldInData = (data: any, fieldPath: string): boolean => {
  if (!data || typeof data !== 'object') return false;
  
  const pathParts = fieldPath.split('.');
  let current = data;
  
  for (const part of pathParts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return false;
    }
  }
  
  return true;
};
