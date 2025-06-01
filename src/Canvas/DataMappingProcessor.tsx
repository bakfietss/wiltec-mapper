import { Edge, Node } from '@xyflow/react';

// Helper function to check if node data has schema properties
const isSchemaNodeData = (data: any): data is { schemaType: 'source' | 'target'; fields: any[]; data: any[] } => {
    return data && typeof data === 'object' && 'schemaType' in data && 'fields' in data;
};

// Helper function to check if data has transform config and transformType
const hasTransformConfig = (data: any): data is { config: Record<string, any>; transformType: string } => {
    return data && typeof data === 'object' && 'config' in data && data.config && typeof data.config === 'object' && 'transformType' in data;
};

// Helper function to check if node is a static value node
const isStaticValueNode = (data: any): data is { value: string; valueType: 'string' | 'number' | 'boolean' } => {
    return data && typeof data === 'object' && 'value' in data && 'valueType' in data;
};

// Helper function to check if node is an IF THEN node
const isIfThenNode = (data: any): data is { operator: string; compareValue: string; thenValue: string; elseValue: string } => {
    return data && typeof data === 'object' && 'operator' in data && 'compareValue' in data && 'thenValue' in data && 'elseValue' in data;
};

export const processDataMapping = (edges: Edge[], nodes: Node[]) => {
    console.log('Processing data mapping with edges:', edges.length, 'and nodes:', nodes.length);
    
    // Process each target node
    const updatedNodes = nodes.map(node => {
        if (node.type === 'editableSchema' && isSchemaNodeData(node.data) && node.data.schemaType === 'target') {
            const newTargetData: any = {};
            
            // Find all edges that connect to this target node
            const incomingEdges = edges.filter(edge => edge.target === node.id);
            
            // If no incoming edges, clear the target data
            if (incomingEdges.length === 0) {
                console.log('No incoming edges for target node, clearing data');
                const updatedNode = {
                    ...node,
                    data: {
                        ...node.data,
                        data: [{}] // Clear with empty object
                    }
                };
                return updatedNode;
            }
            
            incomingEdges.forEach(edge => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                
                console.log('Processing edge:', edge);
                console.log('Source node:', sourceNode?.type, sourceNode?.data);
                
                if (sourceNode?.type === 'editableSchema' && isSchemaNodeData(sourceNode.data)) {
                    // Direct schema-to-schema mapping
                    const sourceFields = Array.isArray(sourceNode.data?.fields) ? sourceNode.data.fields : [];
                    const targetFields = Array.isArray(node.data?.fields) ? node.data.fields : [];
                    const sourceData = Array.isArray(sourceNode.data?.data) ? sourceNode.data.data : [];
                    
                    const sourceField = sourceFields.find((f: any) => f.id === edge.sourceHandle);
                    const targetField = targetFields.find((f: any) => f.id === edge.targetHandle);
                    
                    if (sourceField && targetField) {
                        const sourceValue = sourceData.length > 0 
                            ? sourceData[0][sourceField.name] 
                            : sourceField.exampleValue;
                        
                        if (sourceValue !== undefined && sourceValue !== '') {
                            newTargetData[targetField.name] = sourceValue;
                            console.log(`Direct mapping ${sourceField.name}(${sourceValue}) -> ${targetField.name}`);
                        }
                    }
                } else if (sourceNode?.type === 'staticValue' && isStaticValueNode(sourceNode.data)) {
                    // Static value node
                    const targetFields = Array.isArray(node.data?.fields) ? node.data.fields : [];
                    const targetField = targetFields.find((f: any) => f.id === edge.targetHandle);
                    
                    if (targetField && sourceNode.data.value) {
                        let value: any = sourceNode.data.value;
                        
                        // Convert value based on type, but keep as string for now to avoid type errors
                        if (sourceNode.data.valueType === 'number') {
                            value = String(Number(sourceNode.data.value));
                        } else if (sourceNode.data.valueType === 'boolean') {
                            value = String(sourceNode.data.value === 'true');
                        } else {
                            value = String(sourceNode.data.value);
                        }
                        
                        newTargetData[targetField.name] = value;
                        console.log(`Static value mapping: ${value} (${sourceNode.data.valueType}) -> ${targetField.name}`);
                    }
                } else if (sourceNode?.type === 'ifThen' && isIfThenNode(sourceNode.data)) {
                    // IF THEN node - needs to evaluate condition based on connected input
                    const targetFields = Array.isArray(node.data?.fields) ? node.data.fields : [];
                    const targetField = targetFields.find((f: any) => f.id === edge.targetHandle);
                    
                    if (targetField) {
                        // Find input edges to the IF THEN node
                        const ifThenInputEdges = edges.filter(e => e.target === sourceNode.id);
                        let conditionResult = false;
                        let inputValue: any = null;
                        
                        // Get the input value for condition evaluation
                        ifThenInputEdges.forEach(inputEdge => {
                            const inputSourceNode = nodes.find(n => n.id === inputEdge.source);
                            
                            if (inputSourceNode?.type === 'editableSchema' && isSchemaNodeData(inputSourceNode.data)) {
                                const sourceFields = Array.isArray(inputSourceNode.data?.fields) ? inputSourceNode.data.fields : [];
                                const sourceData = Array.isArray(inputSourceNode.data?.data) ? inputSourceNode.data.data : [];
                                const sourceField = sourceFields.find((f: any) => f.id === inputEdge.sourceHandle);
                                
                                if (sourceField) {
                                    inputValue = sourceData.length > 0 
                                        ? sourceData[0][sourceField.name] 
                                        : sourceField.exampleValue;
                                }
                            }
                        });
                        
                        // Evaluate the condition if we have both input value and operator/compareValue
                        if (inputValue !== null && sourceNode.data.operator && sourceNode.data.compareValue) {
                            conditionResult = evaluateCondition(inputValue, sourceNode.data.operator, sourceNode.data.compareValue);
                        }
                        
                        // Use THEN or ELSE value based on condition result
                        const resultValue = conditionResult ? sourceNode.data.thenValue : sourceNode.data.elseValue;
                        
                        if (resultValue !== undefined && resultValue !== '') {
                            newTargetData[targetField.name] = String(resultValue);
                            console.log(`IF THEN result: ${inputValue} ${sourceNode.data.operator} ${sourceNode.data.compareValue} = ${conditionResult} -> ${resultValue}`);
                        }
                    }
                } else if (sourceNode?.type === 'conversionMapping') {
                    // Mapping through conversion node
                    const conversionIncomingEdges = edges.filter(e => e.target === sourceNode.id && e.targetHandle === 'input');
                    
                    conversionIncomingEdges.forEach(conversionEdge => {
                        const originalSourceNode = nodes.find(n => n.id === conversionEdge.source);
                        
                        if (originalSourceNode?.type === 'editableSchema' && isSchemaNodeData(originalSourceNode.data)) {
                            const sourceFields = Array.isArray(originalSourceNode.data?.fields) ? originalSourceNode.data.fields : [];
                            const targetFields = Array.isArray(node.data?.fields) ? node.data.fields : [];
                            const sourceData = Array.isArray(originalSourceNode.data?.data) ? originalSourceNode.data.data : [];
                            const mappings = sourceNode.data?.mappings;
                            
                            const sourceField = sourceFields.find((f: any) => f.id === conversionEdge.sourceHandle);
                            const targetField = targetFields.find((f: any) => f.id === edge.targetHandle);
                            
                            if (sourceField && targetField) {
                                let sourceValue = sourceData.length > 0 
                                    ? sourceData[0][sourceField.name] 
                                    : sourceField.exampleValue;
                                
                                if (Array.isArray(mappings) && mappings.length > 0) {
                                    const sourceValueStr = String(sourceValue).trim();
                                    
                                    const mappingRule = mappings.find((mapping: any) => {
                                        const fromValueStr = String(mapping.from).trim();
                                        return fromValueStr === sourceValueStr;
                                    });
                                    
                                    if (mappingRule) {
                                        sourceValue = mappingRule.to;
                                        console.log(`Applied conversion rule: ${mappingRule.from} -> ${mappingRule.to}`);
                                    } else {
                                        sourceValue = 'NotMapped';
                                    }
                                } else {
                                    sourceValue = 'NotMapped';
                                }
                                
                                if (sourceValue !== undefined && sourceValue !== '') {
                                    newTargetData[targetField.name] = sourceValue;
                                }
                            }
                        }
                    });
                } else if (sourceNode?.type === 'editableTransform' || sourceNode?.type === 'splitterTransform') {
                    // Process through transform node - Find the original source
                    const findOriginalSource = (transformNodeId: string, visitedNodes: Set<string> = new Set()): { originalNode: Node | undefined, originalField: any, transformedValue: any } => {
                        if (visitedNodes.has(transformNodeId)) {
                            return { originalNode: undefined, originalField: undefined, transformedValue: undefined };
                        }
                        
                        visitedNodes.add(transformNodeId);
                        const transformNode = nodes.find(n => n.id === transformNodeId);
                        const transformIncomingEdges = edges.filter(e => e.target === transformNodeId);
                        
                        for (const transformEdge of transformIncomingEdges) {
                            const sourceNode = nodes.find(n => n.id === transformEdge.source);
                            
                            if (sourceNode?.type === 'editableSchema' && isSchemaNodeData(sourceNode.data)) {
                                // Found the original source schema
                                const sourceFields = Array.isArray(sourceNode.data?.fields) ? sourceNode.data.fields : [];
                                const sourceData = Array.isArray(sourceNode.data?.data) ? sourceNode.data.data : [];
                                const sourceField = sourceFields.find((f: any) => f.id === transformEdge.sourceHandle);
                                
                                if (sourceField) {
                                    let sourceValue = sourceData.length > 0 
                                        ? sourceData[0][sourceField.name] 
                                        : sourceField.exampleValue;
                                    
                                    // Apply transformation
                                    const transformedValue = applyTransformation(sourceValue, transformNode);
                                    
                                    return { 
                                        originalNode: sourceNode, 
                                        originalField: sourceField, 
                                        transformedValue 
                                    };
                                }
                            } else if (sourceNode?.type === 'editableTransform' || sourceNode?.type === 'splitterTransform') {
                                // Chain of transforms - recursively find the original source
                                const result = findOriginalSource(sourceNode.id, visitedNodes);
                                if (result.originalNode && result.originalField) {
                                    // Apply current transformation to the already transformed value
                                    const transformedValue = applyTransformation(result.transformedValue, transformNode);
                                    return {
                                        originalNode: result.originalNode,
                                        originalField: result.originalField,
                                        transformedValue
                                    };
                                }
                            }
                        }
                        
                        return { originalNode: undefined, originalField: undefined, transformedValue: undefined };
                    };
                    
                    const { originalNode, originalField, transformedValue } = findOriginalSource(sourceNode.id);
                    
                    if (originalNode && originalField && transformedValue !== undefined) {
                        const targetFields = Array.isArray(node.data?.fields) ? node.data.fields : [];
                        const targetField = targetFields.find((f: any) => f.id === edge.targetHandle);
                        
                        if (targetField) {
                            newTargetData[targetField.name] = transformedValue;
                            console.log(`Transform result: ${targetField.name} = ${transformedValue}`);
                        }
                    }
                }
            });
            
            console.log('Final target data for node:', node.id, newTargetData);
            
            // Update the node with new data (or empty if no connections)
            const updatedNode = {
                ...node,
                data: {
                    ...node.data,
                    data: [newTargetData]
                }
            };
            return updatedNode;
        }
        return node;
    });
    
    return updatedNodes;
};

// Helper function to evaluate conditions for IF THEN nodes
const evaluateCondition = (inputValue: any, operator: string, compareValue: string): boolean => {
    try {
        console.log(`Evaluating condition: ${inputValue} ${operator} ${compareValue}`);
        
        // Convert values for comparison
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
            default:
                console.log('Unknown operator:', operator);
                return false;
        }
    } catch (error) {
        console.error('Error evaluating condition:', error);
        return false;
    }
};

// Helper function to apply transformations
const applyTransformation = (sourceValue: any, transformNode: Node | undefined): any => {
    if (!transformNode || !hasTransformConfig(transformNode.data)) {
        return sourceValue;
    }
    
    console.log('Applying transformation:', transformNode.data?.transformType, 'to value:', sourceValue);
    
    // Apply transformation based on transform type
    if (transformNode.data?.transformType === 'Date Format') {
        const config = transformNode.data.config;
        const inputFormat = config.parameters?.inputFormat || config.inputFormat || 'YYYY-MM-DD';
        const outputFormat = config.parameters?.outputFormat || config.outputFormat || 'DD/MM/YYYY';
        
        console.log('Date transform config:', { inputFormat, outputFormat });
        
        try {
            // Simple date format conversion for common formats
            if (inputFormat === 'YYYY-MM-DD' && outputFormat === 'DD/MM/YYYY') {
                const dateStr = String(sourceValue);
                const parts = dateStr.split('-');
                if (parts.length === 3 && parts[0].length === 4) {
                    const result = `${parts[2]}/${parts[1]}/${parts[0]}`;
                    console.log(`Date transformed: ${dateStr} -> ${result}`);
                    return result;
                } else {
                    console.log('Invalid date format for transformation:', dateStr);
                    return 'Invalid Date Format';
                }
            } else {
                console.log('Unsupported date format transformation');
                return 'Unsupported Format';
            }
        } catch (error) {
            console.error('Date transformation error:', error);
            return 'Transform Error';
        }
    } else if (transformNode.data?.transformType === 'String Transform') {
        const config = transformNode.data.config;
        const operation = config.parameters?.operation || config.operation || 'uppercase';
        
        console.log('String transform operation:', operation);
        
        try {
            const inputValue = String(sourceValue);
            
            switch (operation) {
                case 'uppercase':
                    return inputValue.toUpperCase();
                case 'lowercase':
                    return inputValue.toLowerCase();
                case 'trim':
                    return inputValue.trim();
                case 'substring':
                    const start = config.parameters?.start || 0;
                    const length = config.parameters?.length || 10;
                    return inputValue.substring(start, start + length);
                case 'replace':
                    const find = config.parameters?.find || '';
                    const replace = config.parameters?.replace || '';
                    return inputValue.replace(new RegExp(find, 'g'), replace);
                case 'concatenate':
                    const suffix = config.parameters?.suffix || '';
                    return inputValue + suffix;
                default:
                    console.log('Unknown string operation:', operation);
                    return sourceValue;
            }
        } catch (error) {
            console.error('String transformation error:', error);
            return 'Transform Error';
        }
    } else if (transformNode.data?.transformType === 'Text Splitter') {
        const config = transformNode.data.config;
        const delimiter = config.parameters?.delimiter || config.delimiter || ',';
        const index = config.parameters?.index || config.index || 0;
        const maxSplit = config.parameters?.maxSplit || config.maxSplit;
        
        console.log('Splitter transform config:', { delimiter, index, maxSplit });
        
        try {
            const inputValue = String(sourceValue);
            const parts = maxSplit ? inputValue.split(delimiter, maxSplit + 1) : inputValue.split(delimiter);
            
            if (index >= 0 && index < parts.length) {
                const result = parts[index];
                console.log(`Text split: "${inputValue}" -> parts[${index}] = "${result}"`);
                return result;
            } else {
                console.log(`Index ${index} out of range for ${parts.length} parts`);
                return 'Index out of range';
            }
        } catch (error) {
            console.error('Splitter transformation error:', error);
            return 'Split Error';
        }
    }
    
    return sourceValue;
};
