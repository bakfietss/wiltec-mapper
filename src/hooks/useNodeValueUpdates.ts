
import { useReactFlow } from '@xyflow/react';
import { useMemo, useEffect, useState, useCallback } from 'react';

interface SchemaField {
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    children?: SchemaField[];
}

interface CoalesceRule {
    id: string;
    priority: number;
    outputValue: string;
}

interface CoalesceNodeData {
    rules?: CoalesceRule[];
    config?: {
        rules?: CoalesceRule[];
        defaultValue?: string;
    };
    defaultValue?: string;
    [key: string]: any;
}

// Get source value from a node
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

// Apply coalesce transformation
const applyCoalesceTransform = (inputValues: Record<string, any>, nodeData: CoalesceNodeData): any => {
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

// Centralized function to calculate node field values
export const calculateNodeFieldValues = (nodes: any[], edges: any[]) => {
    console.log('=== CALCULATING ALL NODE FIELD VALUES ===');
    console.log('Total nodes:', nodes.length);
    console.log('Total edges:', edges.length);
    
    const updatedNodes = nodes.map(node => {
        if (node.type === 'target' && node.data?.fields && Array.isArray(node.data.fields)) {
            // Calculate field values for target nodes
            const fields = node.data.fields;
            const valueMap: Record<string, any> = {};
            
            // Reset all field values
            fields.forEach((field: SchemaField) => {
                valueMap[field.id] = undefined;
            });
            
            // Find incoming edges to this target node
            const incomingEdges = edges.filter(edge => edge.target === node.id);
            
            incomingEdges.forEach(edge => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetField = fields.find((f: SchemaField) => f.id === edge.targetHandle);
                
                if (sourceNode && targetField) {
                    let value: any = undefined;
                    
                    if (sourceNode.type === 'source') {
                        value = getSourceValue(sourceNode, edge.sourceHandle);
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
                        
                        const coalesceData = sourceNode.data as CoalesceNodeData;
                        if (Object.keys(inputValues).length > 0 || (coalesceData?.rules || coalesceData?.config?.rules || []).length > 0) {
                            value = applyCoalesceTransform(inputValues, coalesceData);
                        }
                    }
                    
                    if (value !== undefined && value !== null && value !== '') {
                        valueMap[targetField.id] = value;
                    }
                }
            });
            
            return {
                ...node,
                data: {
                    ...node.data,
                    fieldValues: valueMap
                }
            };
        } else if (node.type === 'transform' && node.data?.transformType === 'coalesce') {
            // Calculate input values for coalesce nodes to display
            const transformInputEdges = edges.filter(e => e.target === node.id);
            let inputValues: Record<string, any> = {};
            
            transformInputEdges.forEach(inputEdge => {
                const inputSourceNode = nodes.find(n => n.id === inputEdge.source);
                
                if (inputSourceNode && inputSourceNode.type === 'source') {
                    const sourceValue = getSourceValue(inputSourceNode, inputEdge.sourceHandle);
                    inputValues[inputEdge.targetHandle] = sourceValue;
                }
            });
            
            return {
                ...node,
                data: {
                    ...node.data,
                    inputValues,
                }
            };
        }
        return node;
    });
    
    return updatedNodes;
};

// Centralized hook for managing node updates
export const useNodeValueUpdates = (baseNodes?: any[]) => {
    const [updateTrigger, setUpdateTrigger] = useState(0);
    
    // Always try to get React Flow instance, but handle gracefully if not available
    let reactFlowInstance: any = null;
    let getNodes: any = () => baseNodes || [];
    let getEdges: any = () => [];
    
    try {
        const reactFlow = useReactFlow();
        reactFlowInstance = reactFlow;
        getNodes = reactFlow.getNodes;
        getEdges = reactFlow.getEdges;
    } catch (error) {
        // ReactFlow not available, use baseNodes
        console.log('ReactFlow not available, using baseNodes');
    }
    
    const enhancedNodes = useMemo(() => {
        console.log('=== ENHANCED NODES RECALCULATION (CENTRALIZED) ===');
        console.log('Update trigger:', updateTrigger);
        
        const nodes = getNodes();
        const currentEdges = getEdges();
        
        console.log('Raw nodes count:', nodes.length);
        console.log('Raw edges count:', currentEdges.length);
        
        if (nodes.length === 0) {
            console.log('No nodes to process');
            return [];
        }
        
        const enhanced = calculateNodeFieldValues(nodes, currentEdges);
        console.log('Enhanced nodes count:', enhanced.length);
        
        return enhanced;
    }, [updateTrigger, baseNodes]);
    
    // Force update function
    const forceUpdate = useCallback(() => {
        console.log('=== FORCING UPDATE ===');
        setUpdateTrigger(prev => prev + 1);
    }, []);
    
    return {
        enhancedNodes,
        forceUpdate
    };
};

// Hook specifically for target node field values (simplified)
export const useTargetNodeValues = (targetNodeId: string, fields: SchemaField[], processedData: any[]) => {
    const { enhancedNodes } = useNodeValueUpdates();
    
    const handleValueMap = useMemo(() => {
        console.log('=== TARGET NODE VALUES FROM CENTRALIZED SYSTEM ===');
        console.log('Target Node ID:', targetNodeId);
        
        // Find the enhanced target node
        const targetNode = enhancedNodes.find(node => node.id === targetNodeId);
        if (targetNode && targetNode.data?.fieldValues) {
            console.log('Using enhanced node field values:', targetNode.data.fieldValues);
            return targetNode.data.fieldValues;
        }
        
        // Fallback to processed data if available
        const valueMap: Record<string, any> = {};
        const firstRecord = processedData?.[0] ?? {};
        if (Object.keys(firstRecord).length > 0 && fields) {
            fields.forEach(field => {
                if (firstRecord[field.name] !== undefined) {
                    valueMap[field.id] = firstRecord[field.name];
                }
            });
        }
        
        console.log('Final value map:', valueMap);
        return valueMap;
    }, [enhancedNodes, targetNodeId, processedData, fields]);
    
    return handleValueMap;
};
