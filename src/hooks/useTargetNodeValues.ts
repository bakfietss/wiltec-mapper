
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

export const useTargetNodeValues = (targetNodeId: string, fields: SchemaField[], processedData: any[]) => {
    const { getNodes, getEdges } = useReactFlow();
    
    const handleValueMap = useMemo(() => {
        const nodes = getNodes();
        const edges = getEdges();
        const valueMap: Record<string, any> = {};
        
        console.log('=== TARGET NODE VALUES PROCESSING ===');
        console.log('Target Node ID:', targetNodeId);
        console.log('Fields:', fields?.map(f => ({ id: f.id, name: f.name })));
        console.log('All Edges:', edges);
        
        // Use processed data if available (this takes priority)
        const firstRecord = processedData?.[0] ?? {};
        
        if (Object.keys(firstRecord).length > 0) {
            console.log('Using processed data for values');
            fields.forEach(field => {
                if (firstRecord[field.name] !== undefined) {
                    valueMap[field.id] = firstRecord[field.name];
                }
            });
        } else {
            console.log('No processed data, resolving values from connections');
            // Direct value resolution from connections
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
