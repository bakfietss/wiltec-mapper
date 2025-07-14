import { useReactFlow } from '@xyflow/react';
import { useMemo } from 'react';
import { transformDate } from '../utils/dateTransform';

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
    
    const updatedNodes = nodes.map(node => {
        // Handle target nodes (editable schema with target type)
        if (node.type === 'target' && node.data?.fields) {
            return calculateTargetNodeValues(node, nodes, edges);
        }
        
        // Handle transform nodes
        if (node.type === 'transform' && node.data?.transformType === 'coalesce') {
            return calculateCoalesceNodeValues(node, nodes, edges);
        }
        
        // Handle concat transform nodes
        if (node.type === 'concatTransform' || (node.type === 'transform' && node.data?.transformType === 'concat')) {
            return calculateConcatNodeValues(node, nodes, edges);
        }
        
        // Handle IF THEN nodes
        if (node.type === 'ifThen') {
            return calculateIfThenNodeValues(node, nodes, edges);
        }
        
        return node;
    });
    
    return updatedNodes;
};

// Helper function to find field by ID recursively
const findFieldById = (fields: any[], fieldId: string): any => {
    for (const field of fields) {
        if (field.id === fieldId) {
            return field;
        }
        if (field.children) {
            const childField = findFieldById(field.children, fieldId);
            if (childField) {
                return childField;
            }
        }
    }
    return null;
};

// Helper function to set nested value in target data object
const setNestedValue = (obj: any, field: any, value: any, allFields: any[]) => {
    // For root level fields, set directly
    if (!field.parent) {
        obj[field.name] = value;
        return;
    }
    
    // For nested fields, we need to build the path
    const pathParts = [];
    let currentField = field;
    
    // Build path from current field up to root
    while (currentField) {
        pathParts.unshift(currentField.name);
        if (currentField.parent) {
            currentField = findFieldById(allFields, currentField.parent);
        } else {
            break;
        }
    }
    
    // Create nested structure
    let current = obj;
    for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part]) {
            // Determine if this should be an object or array based on field type
            const fieldForPart = findFieldRecursiveByName(allFields, part);
            current[part] = fieldForPart?.type === 'array' ? [] : {};
        }
        current = current[part];
        
        // Handle array case - if it's an array, we typically want the first element
        if (Array.isArray(current) && current.length === 0) {
            current.push({});
            current = current[0];
        } else if (Array.isArray(current)) {
            current = current[0];
        }
    }
    
    // Set the final value
    const finalPart = pathParts[pathParts.length - 1];
    current[finalPart] = value;
};

// Helper to find field by name recursively
const findFieldRecursiveByName = (fields: any[], name: string): any => {
    for (const field of fields) {
        if (field.name === name) {
            return field;
        }
        if (field.children) {
            const childField = findFieldRecursiveByName(field.children, name);
            if (childField) {
                return childField;
            }
        }
    }
    return null;
};

// Calculate target node field values - ENHANCED for nested fields
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
        // Use recursive field finder to handle nested fields
        const targetField = findFieldById(fields, edge.targetHandle);
        
        if (sourceNode && targetField) {
            let value: any = undefined;
            
            // Handle different source node types
            if (sourceNode.type === 'source') {
                value = getSourceNodeValue(sourceNode, edge.sourceHandle);
            } else if (sourceNode.type === 'staticValue') {
                value = getStaticNodeValue(sourceNode, edge.sourceHandle);
            } else if (sourceNode.type === 'transform') {
                value = getTransformNodeValue(sourceNode, nodes, edges);
            } else if (sourceNode.type === 'concatTransform') {
                value = getConcatTransformValue(sourceNode, nodes, edges);
            } else if (sourceNode.type === 'ifThen') {
                value = getIfThenNodeValue(sourceNode, nodes, edges);
            } else if (sourceNode.type === 'conversionMapping') {
                value = getConversionMappingValue(sourceNode, nodes, edges, edge);
            }
            
            if (value !== undefined && value !== null) {
                valueMap[targetField.id] = value;
                
                // Set value in the target data object (handles nested paths)
                setNestedValue(newTargetData, targetField, value, fields);
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
        if (inputSourceNode?.type === 'source') {
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

// Calculate concat node input values
const calculateConcatNodeValues = (concatNode: any, nodes: any[], edges: any[]) => {
    const inputEdges = edges.filter(e => e.target === concatNode.id);
    let inputValues: Record<string, any> = {};
    
    inputEdges.forEach(inputEdge => {
        const inputSourceNode = nodes.find(n => n.id === inputEdge.source);
        if (inputSourceNode?.type === 'source') {
            const sourceValue = getSourceNodeValue(inputSourceNode, inputEdge.sourceHandle);
            inputValues[inputEdge.targetHandle] = sourceValue;
        }
    });
    
    return {
        ...concatNode,
        data: {
            ...concatNode.data,
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
        if (inputSourceNode?.type === 'source') {
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

// Get value from source node - with manual field values support
const getSourceNodeValue = (sourceNode: any, handleId: string): any => {
    // First, check if there's a manual value set in the field
    const sourceFields = sourceNode.data?.fields || [];
    const findFieldRecursively = (fields: any[], fieldId: string): any => {
        for (const field of fields) {
            if (field.id === fieldId) {
                return field;
            }
            if (field.children) {
                const childField = findFieldRecursively(field.children, fieldId);
                if (childField) return childField;
            }
        }
        return null;
    };
    
    const sourceField = findFieldRecursively(sourceFields, handleId);
    
    // Return manual value if it exists (has priority over imported data)
    if (sourceField && sourceField.value !== undefined && sourceField.value !== null && sourceField.value !== '') {
        return sourceField.value;
    }
    
    // Then try to get from imported data
    const sourceData = sourceNode.data?.data || [];
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
        
        // Return any value from sampleData, including null, empty strings, etc.
        if (dataValue !== undefined) {
            return dataValue;
        }
    }
    
    return null;
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
        if (inputSourceNode?.type === 'source') {
            const inputValue = getSourceNodeValue(inputSourceNode, inputEdge.sourceHandle);
            return applyTransformation(inputValue, transformNode);
        }
    }
    
    return null;
};

// Get value from concat transform node
const getConcatTransformValue = (concatNode: any, nodes: any[], edges: any[]): any => {
    const rules = concatNode.data?.rules || [];
    const delimiter = concatNode.data?.delimiter || ',';
    
    const inputEdges = edges.filter(e => e.target === concatNode.id);
    let inputValues: Record<string, any> = {};
    
    inputEdges.forEach(inputEdge => {
        const inputSourceNode = nodes.find(n => n.id === inputEdge.source);
        if (inputSourceNode?.type === 'source') {
            const sourceValue = getSourceNodeValue(inputSourceNode, inputEdge.sourceHandle);
            inputValues[inputEdge.targetHandle] = sourceValue;
        }
    });
    
    // Sort rules by priority and concatenate values
    const sortedRules = rules.sort((a: any, b: any) => a.priority - b.priority);
    const values = sortedRules
        .map((rule: any) => inputValues[rule.id])
        .filter((val: any) => val !== undefined && val !== null);
    
    return values.length > 0 ? values.join(delimiter) : '';
};

// Get value from IF THEN node
const getIfThenNodeValue = (ifThenNode: any, nodes: any[], edges: any[]): any => {
    const inputEdges = edges.filter(e => e.target === ifThenNode.id);
    let inputValue: any = null;
    
    // Get input value
    inputEdges.forEach(inputEdge => {
        const inputSourceNode = nodes.find(n => n.id === inputEdge.source);
        if (inputSourceNode?.type === 'source') {
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
        let sourceValue: any = null;
        
        // Handle different source node types
        if (sourceNode?.type === 'source') {
            sourceValue = getSourceNodeValue(sourceNode, inputEdge.sourceHandle);
        } else if (sourceNode?.type === 'transform') {
            sourceValue = getTransformNodeValue(sourceNode, nodes, edges);
        }
        
        if (sourceValue !== null) {
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
        if (inputSourceNode?.type === 'source') {
            const sourceValue = getSourceNodeValue(inputSourceNode, inputEdge.sourceHandle);
            inputValues[inputEdge.targetHandle] = sourceValue;
        }
    });
    
    // Try each rule in priority order
    for (const rule of rules.sort((a: any, b: any) => a.priority - b.priority)) {
        const inputValue = inputValues[rule.id];
        if (inputValue !== undefined && inputValue !== null) {
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
            case 'dateFormat':
                return transformDate(sourceValue, {
                    inputDateFormat: config.inputDateFormat,
                    outputDateFormat: config.outputDateFormat
                });
            default:
                return sourceValue;
        }
    }
    
    // Handle standalone Date Format transform type
    if (transformType === 'Date Format') {
        return transformDate(sourceValue, {
            inputDateFormat: config.inputDateFormat,
            outputDateFormat: config.outputDateFormat
        });
    }
    
    return sourceValue;
};

// Main hook for centralized node updates - FIXED to properly pass edges
export const useNodeValueUpdates = (updateTrigger: number, baseNodes?: any[], baseEdges?: any[]) => {
    let reactFlowInstance: any = null;
    let getNodes: any = () => baseNodes || [];
    let getEdges: any = () => baseEdges || [];
    
    try {
        const reactFlow = useReactFlow();
        reactFlowInstance = reactFlow;
        getNodes = reactFlow.getNodes;
        getEdges = reactFlow.getEdges;
    } catch (error) {
        // ReactFlow not available, using baseNodes/baseEdges
    }
    
    const enhancedNodes = useMemo(() => {
        const nodes = getNodes();
        const currentEdges = getEdges();
        
        if (nodes.length === 0) {
            return [];
        }
        
        const enhanced = calculateNodeFieldValues(nodes, currentEdges);
        
        return enhanced;
    }, [updateTrigger, baseNodes, baseEdges]);
    
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
