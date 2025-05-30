
import { Edge, Node } from '@xyflow/react';

// Helper function to check if node data has schema properties
const isSchemaNodeData = (data: any): data is { schemaType: 'source' | 'target'; fields: any[]; data: any[] } => {
    return data && typeof data === 'object' && 'schemaType' in data && 'fields' in data;
};

// Helper function to check if data has transform config
const hasTransformConfig = (data: any): data is { config: Record<string, any> } => {
    return data && typeof data === 'object' && 'config' in data && data.config && typeof data.config === 'object';
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
                    // Process through transform node (date format, string transform, text splitter, etc.)
                    const transformIncomingEdges = edges.filter(e => e.target === sourceNode.id);
                    
                    transformIncomingEdges.forEach(transformEdge => {
                        const originalSourceNode = nodes.find(n => n.id === transformEdge.source);
                        
                        if (originalSourceNode?.type === 'editableSchema' && isSchemaNodeData(originalSourceNode.data)) {
                            const sourceFields = Array.isArray(originalSourceNode.data?.fields) ? originalSourceNode.data.fields : [];
                            const targetFields = Array.isArray(node.data?.fields) ? node.data.fields : [];
                            const sourceData = Array.isArray(originalSourceNode.data?.data) ? originalSourceNode.data.data : [];
                            
                            const sourceField = sourceFields.find((f: any) => f.id === transformEdge.sourceHandle);
                            const targetField = targetFields.find((f: any) => f.id === edge.targetHandle);
                            
                            if (sourceField && targetField) {
                                let sourceValue = sourceData.length > 0 
                                    ? sourceData[0][sourceField.name] 
                                    : sourceField.exampleValue;
                                
                                console.log('Transform node data:', sourceNode.data);
                                console.log('Source value before transform:', sourceValue);
                                
                                // Apply transformation based on transform type
                                if (sourceNode.data?.transformType === 'Date Format' && hasTransformConfig(sourceNode.data)) {
                                    const config = sourceNode.data.config;
                                    const inputFormat = config.parameters?.inputFormat || config.inputFormat || 'YYYY-MM-DD';
                                    const outputFormat = config.parameters?.outputFormat || config.outputFormat || 'DD/MM/YYYY';
                                    
                                    console.log('Date transform config:', { inputFormat, outputFormat });
                                    
                                    try {
                                        // Simple date format conversion for common formats
                                        if (inputFormat === 'YYYY-MM-DD' && outputFormat === 'DD/MM/YYYY') {
                                            const dateStr = String(sourceValue);
                                            const parts = dateStr.split('-');
                                            if (parts.length === 3 && parts[0].length === 4) {
                                                sourceValue = `${parts[2]}/${parts[1]}/${parts[0]}`;
                                                console.log(`Date transformed: ${dateStr} -> ${sourceValue}`);
                                            } else {
                                                console.log('Invalid date format for transformation:', dateStr);
                                                sourceValue = 'Invalid Date Format';
                                            }
                                        } else {
                                            console.log('Unsupported date format transformation');
                                            sourceValue = 'Unsupported Format';
                                        }
                                    } catch (error) {
                                        console.error('Date transformation error:', error);
                                        sourceValue = 'Transform Error';
                                    }
                                } else if (sourceNode.data?.transformType === 'String Transform' && hasTransformConfig(sourceNode.data)) {
                                    const config = sourceNode.data.config;
                                    const operation = config.parameters?.operation || config.operation || 'uppercase';
                                    
                                    console.log('String transform operation:', operation);
                                    
                                    try {
                                        const inputValue = String(sourceValue);
                                        
                                        switch (operation) {
                                            case 'uppercase':
                                                sourceValue = inputValue.toUpperCase();
                                                break;
                                            case 'lowercase':
                                                sourceValue = inputValue.toLowerCase();
                                                break;
                                            case 'trim':
                                                sourceValue = inputValue.trim();
                                                break;
                                            case 'substring':
                                                const start = config.parameters?.start || 0;
                                                const length = config.parameters?.length || 10;
                                                sourceValue = inputValue.substring(start, start + length);
                                                break;
                                            case 'replace':
                                                const find = config.parameters?.find || '';
                                                const replace = config.parameters?.replace || '';
                                                sourceValue = inputValue.replace(new RegExp(find, 'g'), replace);
                                                break;
                                            case 'concatenate':
                                                const suffix = config.parameters?.suffix || '';
                                                sourceValue = inputValue + suffix;
                                                break;
                                            default:
                                                console.log('Unknown string operation:', operation);
                                        }
                                        
                                        console.log(`String transformed: ${inputValue} -> ${sourceValue} (${operation})`);
                                    } catch (error) {
                                        console.error('String transformation error:', error);
                                        sourceValue = 'Transform Error';
                                    }
                                } else if (sourceNode.data?.transformType === 'Text Splitter' && hasTransformConfig(sourceNode.data)) {
                                    const config = sourceNode.data.config;
                                    const delimiter = config.parameters?.delimiter || config.delimiter || ',';
                                    const index = config.parameters?.index || config.index || 0;
                                    const maxSplit = config.parameters?.maxSplit || config.maxSplit;
                                    
                                    console.log('Splitter transform config:', { delimiter, index, maxSplit });
                                    
                                    try {
                                        const inputValue = String(sourceValue);
                                        const parts = maxSplit ? inputValue.split(delimiter, maxSplit + 1) : inputValue.split(delimiter);
                                        
                                        if (index >= 0 && index < parts.length) {
                                            sourceValue = parts[index];
                                            console.log(`Text split: "${inputValue}" -> parts[${index}] = "${sourceValue}"`);
                                        } else {
                                            sourceValue = 'Index out of range';
                                            console.log(`Index ${index} out of range for ${parts.length} parts`);
                                        }
                                    } catch (error) {
                                        console.error('Splitter transformation error:', error);
                                        sourceValue = 'Split Error';
                                    }
                                }
                                
                                if (sourceValue !== undefined && sourceValue !== '') {
                                    newTargetData[targetField.name] = sourceValue;
                                    console.log(`Transform result: ${targetField.name} = ${sourceValue}`);
                                }
                            }
                        }
                    });
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
