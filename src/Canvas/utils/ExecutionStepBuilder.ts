
import { Node, Edge } from '@xyflow/react';
import { ExecutionStep } from '../types/MappingTypes';

export const buildExecutionSteps = (
  nodes: Node[],
  edges: Edge[]
): ExecutionStep[] => {
  const steps: ExecutionStep[] = [];
  let stepCounter = 1;

  // Process each edge to create execution steps
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return;

    // Get field information
    const getFieldInfo = (node: Node, handleId: string) => {
      const nodeData = node.data as any;
      if (nodeData?.fields && Array.isArray(nodeData.fields)) {
        const field = nodeData.fields.find((f: any) => f.id === handleId);
        return field ? { id: field.id, name: field.name } : { id: handleId, name: handleId };
      }
      return { id: handleId, name: handleId };
    };

    const sourceField = getFieldInfo(sourceNode, edge.sourceHandle || '');
    const targetField = getFieldInfo(targetNode, edge.targetHandle || '');

    // Get sample data for source field
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

    // Transform step (source to transform, then transform to target)
    if (sourceNode.type === 'source' && 
        (targetNode.type === 'transform' || targetNode.type === 'splitterTransform' || 
         targetNode.type === 'ifThen' || targetNode.type === 'staticValue')) {
      
      // Find the edge from this transform to a target
      const transformToTargetEdge = edges.find(e => e.source === targetNode.id);
      const finalTargetNode = transformToTargetEdge ? 
        nodes.find(n => n.id === transformToTargetEdge.target) : null;

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
      // Find the edge from this mapping to a target
      const mappingToTargetEdge = edges.find(e => e.source === targetNode.id);
      const finalTargetNode = mappingToTargetEdge ? 
        nodes.find(n => n.id === mappingToTargetEdge.target) : null;

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
