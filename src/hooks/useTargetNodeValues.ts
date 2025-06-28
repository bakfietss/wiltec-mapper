
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
        
        console.log('=== TARGET NODE VALUES PROCESSING ===');
        console.log('Target Node ID:', targetNodeId);
        console.log('Fields:', fields?.map(f => ({ id: f.id, name: f.name })));
        console.log('Processed Data:', processedData);
        
        // First priority: Use processed data if available
        const firstRecord = processedData?.[0] ?? {};
        
        if (Object.keys(firstRecord).length > 0) {
            console.log('Using processed data for values');
            // Use processed data from DataMappingProcessor
            fields.forEach(field => {
                if (firstRecord[field.name] !== undefined) {
                    valueMap[field.id] = firstRecord[field.name];
                }
            });
        } else {
            console.log('No processed data, resolving values from connections');
            // Fallback: Direct value resolution for immediate updates
            const incomingEdges = edges.filter(edge => edge.target === targetNodeId);
            console.log('Incoming edges:', incomingEdges);
            
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
                    
                    // Handle different source node types
                    if (sourceNode.type === 'staticValue' && sourceNode.data?.value) {
                        value = sourceNode.data.value;
                        console.log('Static value:', value);
                    } else if (sourceNode.type === 'ifThen') {
                        // For IF THEN nodes, show configuration summary
                        const { operator, compareValue, thenValue, elseValue } = sourceNode.data || {};
                        if (operator && compareValue) {
                            value = `IF ? ${operator} ${compareValue} THEN ${thenValue} ELSE ${elseValue}`;
                        }
                        console.log('IF THEN value:', value);
                    } else if (sourceNode.type === 'source' || sourceNode.type === 'editableSchema') {
                        // Handle source nodes - extract data from sample data
                        const nodeData = sourceNode.data;
                        console.log('Source node data:', nodeData);
                        
                        if (nodeData && typeof nodeData === 'object') {
                            // Get sample data from the source node
                            const sourceData = (nodeData.data && Array.isArray(nodeData.data)) ? nodeData.data : [];
                            console.log('Source sample data:', sourceData);
                            
                            if (sourceData.length > 0 && edge.sourceHandle) {
                                // Navigate through the data structure using the source handle
                                const sourceHandle = edge.sourceHandle;
                                value = getNestedValue(sourceData[0], sourceHandle);
                                console.log('Extracted value from source data:', { sourceHandle, value });
                            }
                        }
                    } else if (sourceNode.type === 'transform' && sourceNode.data?.transformType === 'coalesce') {
                        // Handle coalesce transform output
                        value = 'Coalesce Result';
                        console.log('Coalesce transform value:', value);
                    }
                    
                    if (value !== undefined) {
                        valueMap[targetField.id] = value;
                        console.log('Set value for field:', targetField.id, '=', value);
                    }
                }
            });
        }
        
        console.log('Final value map:', valueMap);
        return valueMap;
    }, [targetNodeId, fields, processedData, getNodes, getEdges]);
    
    return handleValueMap;
};

// Helper function to get nested values from objects using dot notation
function getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    
    // Handle array notation like containers[0].container_number
    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
    const parts = normalizedPath.split('.');
    
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }
        
        // Handle array indices
        if (/^\d+$/.test(part)) {
            const index = parseInt(part, 10);
            if (Array.isArray(current) && index < current.length) {
                current = current[index];
            } else {
                return undefined;
            }
        } else {
            current = current[part];
        }
    }
    
    return current;
}
