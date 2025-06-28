
import { useReactFlow } from '@xyflow/react';
import { useMemo } from 'react';

interface SchemaField {
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    children?: SchemaField[];
}

const getSourceValue = (node: any, handleId: string): any => {
    if (node.type !== 'source') return null;
    
    const sourceFields = node.data?.fields;
    const sourceData = node.data?.data;
    
    // First try to get value from actual data using the handleId as a path
    if (sourceData && Array.isArray(sourceData) && sourceData.length > 0) {
        const dataObject = sourceData[0];
        
        // Handle nested paths (like "user.name" or "items[0].title")
        const getValue = (obj: any, path: string) => {
            try {
                // Handle array indices in path like "items[0]"
                const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
                const keys = normalizedPath.split('.');
                let value = obj;
                for (const key of keys) {
                    if (value && typeof value === 'object') {
                        value = value[key];
                    } else {
                        return undefined;
                    }
                }
                return value;
            } catch (e) {
                return undefined;
            }
        };
        
        const dataValue = getValue(dataObject, handleId);
        if (dataValue !== undefined) {
            return dataValue;
        }
    }
    
    // Fallback to manual schema fields
    if (sourceFields && Array.isArray(sourceFields)) {
        const sourceField = sourceFields.find((f: any) => f.id === handleId || f.name === handleId);
        if (sourceField) {
            return sourceField.exampleValue || 'No data';
        }
    }
    
    return null;
};

// Apply coalesce transformation - same logic as in Pipeline.tsx
const applyCoalesceTransform = (inputValues: Record<string, any>, nodeData: any): any => {
  const rules = nodeData?.rules || nodeData?.config?.rules || [];
  const defaultValue = nodeData?.defaultValue || nodeData?.config?.defaultValue || '';
  
  // Try each rule in priority order
  for (const rule of rules.sort((a: any, b: any) => a.priority - b.priority)) {
    const inputValue = inputValues[rule.id];
    if (inputValue !== undefined && inputValue !== null && inputValue !== '') {
      return rule.outputValue || inputValue;
    }
  }
  
  return defaultValue;
};

export const useTargetNodeValues = (targetNodeId: string, fields: SchemaField[], processedData: any[]) => {
    const { getNodes, getEdges } = useReactFlow();
    
    const handleValueMap = useMemo(() => {
        const nodes = getNodes();
        const edges = getEdges();
        const valueMap: Record<string, any> = {};
        
        console.log('=== TARGET NODE VALUES PROCESSING (HOOK) ===');
        console.log('Target Node ID:', targetNodeId);
        console.log('Fields:', fields?.map(f => ({ id: f.id, name: f.name })));
        
        if (!fields || !Array.isArray(fields)) {
            return {};
        }
        
        // Find incoming edges to this target node
        const incomingEdges = edges.filter(edge => edge.target === targetNodeId);
        console.log('Incoming edges to target:', incomingEdges.length);
        
        incomingEdges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetField = fields.find(f => f.id === edge.targetHandle);
            
            console.log('Processing edge:', {
                edgeId: edge.id,
                sourceNodeId: edge.source,
                sourceHandle: edge.sourceHandle,
                targetHandle: edge.targetHandle,
                sourceNode: sourceNode?.type,
                targetField: targetField?.name
            });
            
            if (sourceNode && targetField) {
                let value: any = undefined;
                
                if (sourceNode.type === 'source') {
                    value = getSourceValue(sourceNode, edge.sourceHandle);
                    console.log('Source value extracted:', value);
                } else if (sourceNode.type === 'staticValue') {
                    const staticValues = sourceNode.data?.values;
                    if (Array.isArray(staticValues)) {
                        const staticValue = staticValues.find((v: any) => v.id === edge.sourceHandle);
                        if (staticValue) {
                            value = staticValue.value || '';
                        }
                    } else {
                        value = sourceNode.data?.value || '';
                    }
                    console.log('Static value:', value);
                } else if (sourceNode.type === 'transform' && sourceNode.data?.transformType === 'coalesce') {
                    // Handle coalesce nodes
                    const transformInputEdges = edges.filter(e => e.target === sourceNode.id);
                    let inputValues: Record<string, any> = {};
                    
                    transformInputEdges.forEach(inputEdge => {
                        const inputSourceNode = nodes.find(n => n.id === inputEdge.source);
                        if (inputSourceNode && inputSourceNode.type === 'source') {
                            const sourceValue = getSourceValue(inputSourceNode, inputEdge.sourceHandle);
                            inputValues[inputEdge.targetHandle] = sourceValue;
                        }
                    });
                    
                    // Fix: Check if rules exist and is an array before accessing length
                    const rules = sourceNode.data?.rules || sourceNode.data?.config?.rules;
                    if (Object.keys(inputValues).length > 0 || (Array.isArray(rules) && rules.length > 0)) {
                        value = applyCoalesceTransform(inputValues, sourceNode.data);
                        console.log('Coalesce transform result:', value);
                    }
                }
                
                if (value !== undefined && value !== null && value !== '') {
                    valueMap[targetField.id] = value;
                    console.log(`Set target field value: ${targetField.name} (${targetField.id}) = ${value}`);
                }
            }
        });
        
        // Use processed data as fallback if available
        const firstRecord = processedData?.[0] ?? {};
        if (Object.keys(firstRecord).length > 0) {
            fields.forEach(field => {
                if (valueMap[field.id] === undefined && firstRecord[field.name] !== undefined) {
                    valueMap[field.id] = firstRecord[field.name];
                }
            });
        }
        
        console.log('Final value map (HOOK):', valueMap);
        return valueMap;
    }, [targetNodeId, fields, processedData, getNodes, getEdges]);
    
    return handleValueMap;
};
