import { useReactFlow } from '@xyflow/react';
import { useMemo } from 'react';

interface SchemaField {
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    children?: SchemaField[];
}

export const useTargetNodeValues = (targetNodeId: string, fields: SchemaField[], processedData: any[]) => {
    const { getNodes, getEdges } = useReactFlow();
    
    const handleValueMap = useMemo(() => {
        const nodes = getNodes();
        const edges = getEdges();
        const valueMap: Record<string, any> = {};
        
        // First priority: Use processed data if available
        const firstRecord = processedData?.[0] ?? {};
        
        if (Object.keys(firstRecord).length > 0) {
            // Use processed data from DataMappingProcessor
            fields.forEach(field => {
                if (firstRecord[field.name] !== undefined) {
                    valueMap[field.id] = firstRecord[field.name];
                }
            });
        } else {
            // Fallback: Direct value resolution for immediate updates
            const incomingEdges = edges.filter(edge => edge.target === targetNodeId);
            
            incomingEdges.forEach(edge => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetField = fields.find(f => f.id === edge.targetHandle);
                
                if (sourceNode && targetField) {
                    let value: any = undefined;
                    
                    // Handle different source node types
                    if (sourceNode.type === 'staticValue' && sourceNode.data?.value) {
                        value = sourceNode.data.value;
                    } else if (sourceNode.type === 'ifThen') {
                        // For IF THEN nodes, show configuration summary
                        const { operator, compareValue, thenValue, elseValue } = sourceNode.data || {};
                        if (operator && compareValue) {
                            value = `IF ? ${operator} ${compareValue} THEN ${thenValue} ELSE ${elseValue}`;
                        }
                    } else if (sourceNode.type === 'editableSchema' && sourceNode.data) {
                        // Handle schema nodes with proper type checking
                        const nodeData = sourceNode.data;
                        if (nodeData && typeof nodeData === 'object' && 'fields' in nodeData && Array.isArray(nodeData.fields)) {
                            const sourceField = nodeData.fields.find((f: any) => f.id === edge.sourceHandle);
                            if (sourceField) {
                                const sourceData = (nodeData.data && Array.isArray(nodeData.data)) ? nodeData.data : [];
                                value = sourceData.length > 0 
                                    ? sourceData[0][sourceField.name] 
                                    : sourceField.exampleValue;
                            }
                        }
                    }
                    
                    if (value !== undefined) {
                        valueMap[targetField.id] = value;
                    }
                }
            });
        }
        
        return valueMap;
    }, [targetNodeId, fields, processedData, getNodes, getEdges]);
    
    return handleValueMap;
};
