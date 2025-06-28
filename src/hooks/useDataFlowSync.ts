
import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

/**
 * Hook to sync data flow between connected nodes
 * Ensures target nodes receive values from connected source nodes
 */
export const useDataFlowSync = () => {
  const { getNodes, getEdges, setNodes } = useReactFlow();

  useEffect(() => {
    const nodes = getNodes();
    const edges = getEdges();
    
    // Find all target nodes and update their field values
    const targetNodes = nodes.filter(node => node.type === 'target');
    
    targetNodes.forEach(targetNode => {
      const incomingEdges = edges.filter(edge => edge.target === targetNode.id);
      const fieldValues: Record<string, any> = {};
      
      incomingEdges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (!sourceNode) return;
        
        const targetFieldId = edge.targetHandle;
        if (!targetFieldId) return;
        
        let value: any = undefined;
        
        // Handle different source node types
        if (sourceNode.type === 'source' && sourceNode.data) {
          // Get value from source data
          const sourceFieldPath = edge.sourceHandle;
          if (sourceFieldPath && sourceNode.data.data && Array.isArray(sourceNode.data.data) && sourceNode.data.data.length > 0) {
            value = getNestedValue(sourceNode.data.data[0], sourceFieldPath);
          }
        } else if (sourceNode.type === 'staticValue' && sourceNode.data?.value) {
          value = sourceNode.data.value;
        } else if (sourceNode.type === 'transform' && sourceNode.data?.transformType === 'coalesce') {
          // For coalesce transforms, we need to evaluate the rules
          value = evaluateCoalesceTransform(sourceNode, nodes, edges);
        }
        
        if (value !== undefined) {
          fieldValues[targetFieldId] = value;
        }
      });
      
      // Update target node with field values
      setNodes(nodes => 
        nodes.map(node => 
          node.id === targetNode.id 
            ? { ...node, data: { ...node.data, fieldValues } }
            : node
        )
      );
    });
  }, [getNodes, getEdges, setNodes]);
};

// Helper function to get nested values from objects
const getNestedValue = (obj: any, path: string): any => {
  if (!obj || !path) return undefined;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (key.includes('[') && key.includes(']')) {
      // Handle array access like containers[0]
      const arrayKey = key.substring(0, key.indexOf('['));
      const indexStr = key.substring(key.indexOf('[') + 1, key.indexOf(']'));
      const index = parseInt(indexStr);
      
      if (current[arrayKey] && Array.isArray(current[arrayKey]) && current[arrayKey][index]) {
        current = current[arrayKey][index];
      } else {
        return undefined;
      }
    } else {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
  }
  
  return current;
};

// Helper function to evaluate coalesce transforms
const evaluateCoalesceTransform = (coalesceNode: any, allNodes: any[], allEdges: any[]): any => {
  const inputEdges = allEdges.filter(edge => edge.target === coalesceNode.id);
  
  // Get rules from coalesce node
  const rules = coalesceNode.data?.rules || coalesceNode.data?.config?.rules || [];
  
  // Sort rules by priority
  const sortedRules = [...rules].sort((a, b) => (a.priority || 0) - (b.priority || 0));
  
  // Evaluate each rule in order
  for (const rule of sortedRules) {
    const ruleEdge = inputEdges.find(edge => edge.targetHandle === rule.id);
    if (!ruleEdge) continue;
    
    const sourceNode = allNodes.find(n => n.id === ruleEdge.source);
    if (!sourceNode || sourceNode.type !== 'source') continue;
    
    const sourceFieldPath = ruleEdge.sourceHandle;
    if (!sourceFieldPath || !sourceNode.data?.data) continue;
    
    const sourceData = Array.isArray(sourceNode.data.data) ? sourceNode.data.data : [];
    if (sourceData.length === 0) continue;
    
    const value = getNestedValue(sourceData[0], sourceFieldPath);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  
  // Return default value if no rule matched
  return coalesceNode.data?.defaultValue || coalesceNode.data?.config?.defaultValue || '';
};
