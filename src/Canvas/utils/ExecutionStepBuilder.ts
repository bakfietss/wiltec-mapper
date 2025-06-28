
import { Node, Edge } from '@xyflow/react';
import { ExecutionStep } from '../types/MappingTypes';

export const buildExecutionSteps = (
  nodes: Node[],
  edges: Edge[]
): ExecutionStep[] => {
  const steps: ExecutionStep[] = [];
  let stepCounter = 1;

  // Create maps for O(1) lookups instead of O(n) finds
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const edgesBySource = new Map<string, Edge[]>();
  const edgesByTarget = new Map<string, Edge[]>();
  
  // Group edges by source and target for faster lookup
  edges.forEach(edge => {
    const sourceEdges = edgesBySource.get(edge.source) || [];
    sourceEdges.push(edge);
    edgesBySource.set(edge.source, sourceEdges);
    
    const targetEdges = edgesByTarget.get(edge.target) || [];
    targetEdges.push(edge);
    edgesByTarget.set(edge.target, targetEdges);
  });

  const getFieldInfo = (node: Node, handleId: string) => {
    const nodeData = node.data as any;
    if (nodeData?.fields && Array.isArray(nodeData.fields)) {
      const field = nodeData.fields.find((f: any) => f.id === handleId);
      return field ? { id: field.id, name: field.name } : { id: handleId, name: handleId };
    }
    return { id: handleId, name: handleId };
  };

  const getSampleValue = (node: Node, fieldName: string) => {
    const nodeData = node.data as any;
    if (nodeData?.data && Array.isArray(nodeData.data) && nodeData.data.length > 0) {
      return nodeData.data[0][fieldName];
    }
    if (nodeData?.fields && Array.isArray(nodeData.fields)) {
      const field = nodeData.fields.find((f: any) => f.name === fieldName);
      return field?.exampleValue;
    }
    return undefined;
  };

  // Handle coalesce transforms specially - they need comprehensive rule information
  const processedCoalesceNodes = new Set<string>();
  
  nodes.forEach(node => {
    if ((node.type === 'transform' && node.data?.transformType === 'coalesce') || 
        node.type === 'coalesceTransform') {
      
      if (processedCoalesceNodes.has(node.id)) return;
      processedCoalesceNodes.add(node.id);
      
      const nodeData = node.data as any;
      const inputEdges = edgesByTarget.get(node.id) || [];
      const outputEdges = edgesBySource.get(node.id) || [];
      
      // Build rules from input edges and node configuration
      const rules: any[] = [];
      
      // Get rules from node data if available
      const existingRules = nodeData?.rules || nodeData?.config?.rules || [];
      
      // Merge with input edges to create comprehensive rules
      inputEdges.forEach((edge, index) => {
        const sourceNode = nodeMap.get(edge.source);
        if (!sourceNode || sourceNode.type !== 'source') return;
        
        const sourceField = getFieldInfo(sourceNode, edge.sourceHandle || '');
        const ruleId = edge.targetHandle || `rule_${index}_${Date.now()}`;
        
        // Find existing rule or create new one
        let rule = existingRules.find((r: any) => r.id === ruleId);
        if (!rule) {
          rule = {
            id: ruleId,
            priority: index + 1,
            outputValue: '', // Will be determined by the transform logic
            sourceField: edge.sourceHandle || sourceField.name,
            sourceHandle: edge.sourceHandle || sourceField.name
          };
        }
        
        rules.push(rule);
      });
      
      // Create execution step for each output edge
      outputEdges.forEach(outputEdge => {
        const finalTargetNode = nodeMap.get(outputEdge.target);
        if (!finalTargetNode || finalTargetNode.type !== 'target') return;
        
        const finalTargetField = getFieldInfo(finalTargetNode, outputEdge.targetHandle || '');
        
        steps.push({
          stepId: `step_${stepCounter++}`,
          type: 'transform',
          source: {
            nodeId: node.id, // The coalesce node itself as the source
            fieldId: 'output',
            fieldName: 'output'
          },
          target: {
            nodeId: finalTargetNode.id,
            fieldId: finalTargetField.id,
            fieldName: finalTargetField.name
          },
          transform: {
            type: 'coalesce',
            operation: 'coalesce',
            parameters: {
              rules: rules,
              defaultValue: nodeData?.defaultValue || nodeData?.config?.defaultValue || '',
              outputType: nodeData?.outputType || nodeData?.config?.outputType || 'value'
            }
          }
        });
      });
    }
  });

  // Process regular edges for non-coalesce transforms
  edges.forEach(edge => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    
    if (!sourceNode || !targetNode) return;

    const sourceField = getFieldInfo(sourceNode, edge.sourceHandle || '');
    const targetField = getFieldInfo(targetNode, edge.targetHandle || '');

    // Skip if this is a coalesce-related edge (already processed above)
    if ((targetNode.type === 'transform' && targetNode.data?.transformType === 'coalesce') || 
        targetNode.type === 'coalesceTransform' ||
        (sourceNode.type === 'transform' && sourceNode.data?.transformType === 'coalesce') ||
        sourceNode.type === 'coalesceTransform') {
      return;
    }

    // Direct mapping (source to target)
    if (sourceNode.type === 'source' && targetNode.type === 'target') {
      steps.push({
        stepId: `step_${stepCounter++}`,
        type: 'direct_mapping',
        source: {
          nodeId: sourceNode.id,
          fieldId: sourceField.id,
          fieldName: sourceField.name,
          value: getSampleValue(sourceNode, sourceField.name)
        },
        target: {
          nodeId: targetNode.id,
          fieldId: targetField.id,
          fieldName: targetField.name
        }
      });
    }

    // Transform step (source to transform, then transform to target) - for non-coalesce transforms
    if (sourceNode.type === 'source' && 
        (targetNode.type === 'transform' || targetNode.type === 'splitterTransform' || 
         targetNode.type === 'ifThen' || targetNode.type === 'staticValue')) {
      
      const transformToTargetEdges = edgesBySource.get(targetNode.id) || [];
      const transformToTargetEdge = transformToTargetEdges.find(e => {
        const finalTarget = nodeMap.get(e.target);
        return finalTarget?.type === 'target';
      });
      
      const finalTargetNode = transformToTargetEdge ? nodeMap.get(transformToTargetEdge.target) : null;

      if (finalTargetNode && finalTargetNode.type === 'target') {
        const finalTargetField = getFieldInfo(finalTargetNode, transformToTargetEdge!.targetHandle || '');
        const transformData = targetNode.data as any;
        
        steps.push({
          stepId: `step_${stepCounter++}`,
          type: 'transform',
          source: {
            nodeId: sourceNode.id,
            fieldId: sourceField.id,
            fieldName: sourceField.name,
            value: getSampleValue(sourceNode, sourceField.name)
          },
          target: {
            nodeId: finalTargetNode.id,
            fieldId: finalTargetField.id,
            fieldName: finalTargetField.name
          },
          transform: {
            type: transformData?.transformType || targetNode.type || 'unknown',
            operation: transformData?.config?.operation,
            parameters: transformData?.config?.parameters || {},
            expression: transformData?.config?.expression
          }
        });
      }
    }

    // Conversion mapping step
    if (sourceNode.type === 'source' && targetNode.type === 'conversionMapping') {
      const mappingToTargetEdges = edgesBySource.get(targetNode.id) || [];
      const mappingToTargetEdge = mappingToTargetEdges.find(e => {
        const finalTarget = nodeMap.get(e.target);
        return finalTarget?.type === 'target';
      });
      
      const finalTargetNode = mappingToTargetEdge ? nodeMap.get(mappingToTargetEdge.target) : null;

      if (finalTargetNode && finalTargetNode.type === 'target') {
        const finalTargetField = getFieldInfo(finalTargetNode, mappingToTargetEdge!.targetHandle || '');
        const mappingData = targetNode.data as any;
        
        steps.push({
          stepId: `step_${stepCounter++}`,
          type: 'conversion_mapping',
          source: {
            nodeId: sourceNode.id,
            fieldId: sourceField.id,
            fieldName: sourceField.name,
            value: getSampleValue(sourceNode, sourceField.name)
          },
          target: {
            nodeId: finalTargetNode.id,
            fieldId: finalTargetField.id,
            fieldName: finalTargetField.name
          },
          conversion: {
            rules: Array.isArray(mappingData?.mappings) ? mappingData.mappings : []
          }
        });
      }
    }
  });

  return steps;
};
