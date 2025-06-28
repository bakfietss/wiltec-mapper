
import { useReactFlow } from '@xyflow/react';
import { useMemo } from 'react';

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

// Enhanced centralized function to calculate all node field values
export const calculateNodeFieldValues = (nodes: any[], edges: any[]) => {
    console.log('=== CENTRALIZED VALUE CALCULATION ===');
    console.log('Processing nodes:', nodes.length, 'edges:', edges.length);
    
    const updatedNodes = nodes.map(node => {
        // Handle target nodes (editable schema with target type)
        if (node.type === 'editableSchema' && node.data?.schemaType === 'target' && node.data?.fields) {
            return calculateTargetNodeValues(node, nodes, edges);
        }
        
        // Handle transform nodes
        if (node.type === 'transform' && node.data?.transformType === 'coalesce') {
            return calculateCoalesceNodeValues(node, nodes, edges);
        }
        
        // Handle IF THEN nodes
        if (node.type === 'ifThen') {
            return calculateIfThenNodeValues(node, nodes, edges);
        }
        
        return node;
    });
    
    return updatedNodes;
};

// Calculate target node field values
const calculateTargetNodeValues = (targetNode: any, nodes: any[], edges: any[]) => {
    const fields = targetNode.data.fields;
    const valueMap: Record<string, any> = {};
    const newTargetData: any = {};
    
    // Find incoming edges to this target node
    const incomingEdges = edges.filter(edge => edge.target === targetNode.id);
    
    if (incomingEdges.length === 0) {
        return {
            ...targetNode,
            data: {
                ...targetNode.data,
                fieldValues: {},
                data: [{}]
            }
        };
    }
    
    incomingEdges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetField = fields.find((f: any) => f.id === edge.targetHandle);
        
        if (sourceNode && targetField) {
            let value: any = undefined;
            
            // Handle different source node types
            if (sourceNode.type === 'editableSchema' && sourceNode.data?.schemaType === 'source') {
                value = getSourceNodeValue(sourceNode, edge.sourceHandle);
            } else if (sourceNode.type === 'staticValue') {
                value = getStaticNodeValue(sourceNode, edge.sourceHandle);
            } else if (sourceNode.type === 'transform') {
                value = getTransformNodeValue(sourceNode, nodes, edges);
            } else if (sourceNode.type === 'ifThen') {
                value = getIfThenNodeValue(sourceNode, nodes, edges);
            } else if (sourceNode.type === 'conversionMapping') {
                value = getConversionMappingValue(sourceNode, nodes, edges, edge);
            }
            
            if (value !== undefined && value !== null && value !== '') {
                valueMap[targetField.id] = value;
                newTargetData[targetField.name] = value;
            }
        }
    });
    
    return {
        ...targetNode,
        data: {
            ...targetNode.data,
            fieldValues: valueMap,
            data: [newTargetData]
        }
    };
};

// Calculate coalesce node input values
const calculateCoalesceNodeValues = (coalesceNode: any, nodes: any[], edges: any[]) => {
    const inputEdges = edges.filter(e => e.target === coalesceNode.id);
    let inputValues: Record<string, any> = {};
    
    inputEdges.forEach(inputEdge => {
        const inputSourceNode = nodes.find(n => n.id === inputEdge.source);
        if (inputSourceNode?.type === 'editableSchema' && inputSourceNode.data?.schemaType === 'source') {
            const sourceValue = getSourceNodeValue(inputSourceNode, inputEdge.sourceHandle);
            inputValues[inputEdge.targetHandle] = sourceValue;
        }
    });
    
    return {
        ...coalesceNode,
        data: {
            ...coalesceNode.data,
            inputValues
        }
    };
};

// Calculate IF THEN node values (for display purposes)
const calculateIfThenNodeValues = (ifThenNode: any, nodes: any[], edges: any[]) => {
    const inputEdges = edges.filter(e => e.target === ifThenNode.id);
    let inputValue: any = null;
    
    inputEdges.forEach(inputEdge => {
        const inputSourceNode = nodes.find(n => n.id === inputEdge.source);
        if (inputSourceNode?.type === 'editableSchema' && inputSourceNode.data?.schemaType === 'source') {
            inputValue = getSourceNodeValue(inputSourceNode, inputEdge.sourceHandle);
        }
    });
    
    return {
        ...ifThenNode,
        data: {
            ...ifThenNode.data,
            currentInputValue: inputValue
        }
    };
};

// Get value from source node
const getSourceNodeValue = (sourceNode: any, handleId: string): any => {
    const sourceFields = sourceNode.data?.fields || [];
    const sourceData = sourceNode.data?.data || [];
    
    // Try to get from actual data first
    if (sourceData.length > 0) {
        const dataObject = sourceData[0];
        const getValue = (obj: any, path: string) => {
            try {
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
    
    // Fallback to schema fields
    const sourceField = sourceFields.find((f: any) => f.id === handleId || f.name === handleId);
    return sourceField ? (sourceField.exampleValue || 'No data') : null;
};

// Get value from static value node
const getStaticNodeValue = (staticNode: any, handleId: string): any => {
    if (Array.isArray(staticNode.data?.values)) {
        const staticValue = staticNode.data.values.find((v: any) => v.id === handleId);
        return staticValue ? staticValue.value : '';
    }
    return staticNode.data?.value || '';
};

// Get value from transform node
const getTransformNodeValue = (transformNode: any, nodes: any[], edges: any[]): any => {
    if (transformNode.data?.transformType === 'coalesce') {
        return applyCoalesceTransform(transformNode, nodes, edges);
    }
    
    // Handle other transform types
    const inputEdges = edges.filter(e => e.target === transformNode.id);
    for (const inputEdge of inputEdges) {
        const inputSourceNode = nodes.find(n => n.id === inputEdge.source);
        if (inputSourceNode?.type === 'editableSchema' && inputSourceNode.data?.schemaType === 'source') {
            const inputValue = getSourceNodeValue(inputSourceNode, inputEdge.sourceHandle);
            return applyTransformation(inputValue, transformNode);
        }
    }
    
    return null;
};

// Get value from IF THEN node
const getIfThenNodeValue = (ifThenNode: any, nodes: any[], edges: any[]): any => {
    const inputEdges = edges.filter(e => e.target === ifThenNode.id);
    let inputValue: any = null;
    
    // Get input value
    inputEdges.forEach(inputEdge => {
        const inputSourceNode = nodes.find(n => n.id === inputEdge.source);
        if (inputSourceNode?.type === 'editableSchema' && inputSourceNode.data?.schemaType === 'source') {
            inputValue = getSourceNodeValue(inputSourceNode, inputEdge.sourceHandle);
        }
    });
    
    // Evaluate condition
    if (inputValue !== null && ifThenNode.data?.operator && ifThenNode.data?.compareValue) {
        const conditionResult = evaluateCondition(inputValue, ifThenNode.data.operator, ifThenNode.data.compareValue);
        return conditionResult ? ifThenNode.data.thenValue : ifThenNode.data.elseValue;
    }
    
    return ifThenNode.data?.elseValue || '';
};

// Get value from conversion mapping node
const getConversionMappingValue = (conversionNode: any, nodes: any[], edges: any[], targetEdge: any): any => {
    const inputEdges = edges.filter(e => e.target === conversionNode.id && e.targetHandle === 'input');
    
    for (const inputEdge of inputEdges) {
        const sourceNode = nodes.find(n => n.id === inputEdge.source);
        if (sourceNode?.type === 'editableSchema' && sourceNode.data?.schemaType === 'source') {
            let sourceValue = getSourceNodeValue(sourceNode, inputEdge.sourceHandle);
            const mappings = conversionNode.data?.mappings || [];
            
            if (mappings.length > 0) {
                const sourceValueStr = String(sourceValue).trim();
                const mappingRule = mappings.find((mapping: any) => 
                    String(mapping.from).trim() === sourceValueStr
                );
                
                return mappingRule ? mappingRule.to : 'NotMapped';
            }
        }
    }
    
    return 'NotMapped';
};

// Apply coalesce transformation
const applyCoalesceTransform = (coalesceNode: any, nodes: any[], edges: any[]): any => {
    const rules = coalesceNode.data?.rules || coalesceNode.data?.config?.rules || [];
    const defaultValue = coalesceNode.data?.defaultValue || coalesceNode.data?.config?.defaultValue || '';
    
    const inputEdges = edges.filter(e => e.target === coalesceNode.id);
    let inputValues: Record<string, any> = {};
    
    inputEdges.forEach(inputEdge => {
        const inputSourceNode = nodes.find(n => n.id === inputEdge.source);
        if (inputSourceNode?.type === 'editableSchema' && inputSourceNode.data?.schemaType === 'source') {
            const sourceValue = getSourceNodeValue(inputSourceNode, inputEdge.sourceHandle);
            inputValues[inputEdge.targetHandle] = sourceValue;
        }
    });
    
    // Try each rule in priority order
    for (const rule of rules.sort((a: any, b: any) => a.priority - b.priority)) {
        const inputValue = inputValues[rule.id];
        if (inputValue !== undefined && inputValue !== null && inputValue !== '') {
            return rule.outputValue || inputValue;
        }
    }
    
    return defaultValue;
};

// Evaluate IF THEN conditions
const evaluateCondition = (inputValue: any, operator: string, compareValue: string): boolean => {
    try {
        const leftValue = String(inputValue).trim();
        const rightValue = String(compareValue).trim();
        
        switch (operator) {
            case '=':
                return leftValue === rightValue;
            case '!=':
                return leftValue !== rightValue;
            case '>':
                return Number(leftValue) > Number(rightValue);
            case '<':
                return Number(leftValue) < Number(rightValue);
            case '>=':
                return Number(leftValue) >= Number(rightValue);
            case '<=':
                return Number(leftValue) <= Number(rightValue);
            case 'date_before_today':
                return new Date(leftValue) < new Date();
            case 'date_after_today':
                return new Date(leftValue) > new Date();
            case 'date_before':
                return new Date(leftValue) < new Date(rightValue);
            case 'date_after':
                return new Date(leftValue) > new Date(rightValue);
            default:
                return false;
        }
    } catch (error) {
        console.error('Error evaluating condition:', error);
        return false;
    }
};

// Apply other transformations
const applyTransformation = (sourceValue: any, transformNode: any): any => {
    const transformType = transformNode.data?.transformType;
    const config = transformNode.data?.config || {};
    
    if (transformType === 'String Transform') {
        const operation = config.stringOperation || config.operation;
        const inputValue = String(sourceValue);
        
        switch (operation) {
            case 'uppercase':
                return inputValue.toUpperCase();
            case 'lowercase':
                return inputValue.toLowerCase();
            case 'trim':
                return inputValue.trim();
            case 'prefix':
                return (config.prefix || '') + inputValue;
            case 'suffix':
                return inputValue + (config.suffix || '');
            case 'substring':
                const start = config.substringStart || 0;
                const end = config.substringEnd;
                return end !== undefined ? inputValue.substring(start, end) : inputValue.substring(start);
            case 'replace':
                const regex = new RegExp(config.regex || '', 'g');
                return inputValue.replace(regex, config.replacement || '');
            default:
                return sourceValue;
        }
    }
    
    return sourceValue;
};

// Main hook for centralized node updates
export const useNodeValueUpdates = (updateTrigger: number, baseNodes?: any[]) => {
    let reactFlowInstance: any = null;
    let getNodes: any = () => baseNodes || [];
    let getEdges: any = () => [];
    
    try {
        const reactFlow = useReactFlow();
        reactFlowInstance = reactFlow;
        getNodes = reactFlow.getNodes;
        getEdges = reactFlow.getEdges;
    } catch (error) {
        console.log('ReactFlow not available, using baseNodes');
    }
    
    const enhancedNodes = useMemo(() => {
        console.log('=== CENTRALIZED RECALCULATION ===');
        console.log('Update trigger:', updateTrigger);
        
        const nodes = getNodes();
        const currentEdges = getEdges();
        
        if (nodes.length === 0) {
            return [];
        }
        
        const enhanced = calculateNodeFieldValues(nodes, currentEdges);
        console.log('Enhanced nodes calculated:', enhanced.length);
        
        return enhanced;
    }, [updateTrigger, baseNodes]);
    
    return { enhancedNodes };
};

// Simplified hook for backward compatibility
export const useTargetNodeValues = (targetNodeId: string, fields: any[], processedData: any[], updateTrigger: number) => {
    const { enhancedNodes } = useNodeValueUpdates(updateTrigger);
    
    const handleValueMap = useMemo(() => {
        const targetNode = enhancedNodes.find(node => node.id === targetNodeId);
        return targetNode?.data?.fieldValues || {};
    }, [enhancedNodes, targetNodeId, updateTrigger]);
    
    return handleValueMap;
};
