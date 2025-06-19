import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    Background,
    Controls,
    Connection,
    addEdge,
    Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useTheme } from '../Theme/ThemeContext';
import { useFieldStore } from '../store/fieldStore';

import SourceNode from '../compontents/SourceNode';
import TargetNode from '../compontents/TargetNode';
import ConversionMappingNode from '../compontents/ConversionMappingNode';
import TransformNode from '../compontents/TransformNode';
import SplitterTransformNode from '../compontents/SplitterTransformNode';
import MappingToolbar from '../compontents/MappingToolbar';
import DataSidebar from '../compontents/DataSidebar';
import MappingManager from '../compontents/MappingManager';
import IfThenNode from '../compontents/IfThenNode';
import StaticValueNode from '../compontents/StaticValueNode';
import CoalesceTransformNode from '../compontents/CoalesceTransformNode';

import { useNodeFactories } from './NodeFactories';
import { downloadBothMappingFiles, importMappingConfiguration, MappingConfiguration, exportUIMappingConfiguration } from './MappingExporter';

const nodeTypes = {
    source: SourceNode,
    target: TargetNode,
    conversionMapping: ConversionMappingNode,
    transform: TransformNode,
    splitterTransform: SplitterTransformNode,
    ifThen: IfThenNode,
    staticValue: StaticValueNode,
    coalesceTransform: CoalesceTransformNode,
};

// Helper function to check if a node is a source-type node
const isSourceNode = (node: any): boolean => {
    return node.type === 'source';
};

// Helper function to check if a node is a target-type node
const isTargetNode = (node: any): boolean => {
    return node.type === 'target';
};

// Helper function to evaluate conditions for IF THEN nodes
const evaluateCondition = (inputValue: any, operator: string, compareValue: string): boolean => {
    const leftValue = String(inputValue).trim();
    const rightValue = String(compareValue).trim();
    
    // Handle date operators
    if (operator.startsWith('date_')) {
        const inputDate = parseDate(leftValue);
        if (!inputDate) return false;
        
        switch (operator) {
            case 'date_before_today':
                return inputDate < new Date();
            case 'date_after_today':
                return inputDate > new Date();
            case 'date_before': {
                const compareDate = parseDate(rightValue);
                return compareDate ? inputDate < compareDate : false;
            }
            case 'date_after': {
                const compareDate = parseDate(rightValue);
                return compareDate ? inputDate > compareDate : false;
            }
        }
    }
    
    // Handle regular operators
    switch (operator) {
        case '=': return leftValue === rightValue;
        case '!=': return leftValue !== rightValue;
        case '>': return Number(leftValue) > Number(rightValue);
        case '<': return Number(leftValue) < Number(rightValue);
        case '>=': return Number(leftValue) >= Number(rightValue);
        case '<=': return Number(leftValue) <= Number(rightValue);
        default: return false;
    }
};

// Helper function to parse various date formats
const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    
    // Try parsing as ISO string first
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date;
    }
    
    // Try parsing YYYY-MM-DD format
    const dateParts = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateParts) {
        date = new Date(parseInt(dateParts[1]), parseInt(dateParts[2]) - 1, parseInt(dateParts[3]));
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    
    return null;
};

// Apply string transformations
const applyStringTransform = (inputValue: any, config: any, transformType: string): any => {
    if (transformType === 'String Transform' && config.stringOperation) {
        const stringValue = String(inputValue);
        
        switch (config.stringOperation) {
            case 'uppercase':
                return stringValue.toUpperCase();
            case 'lowercase':
                return stringValue.toLowerCase();
            case 'trim':
                return stringValue.trim();
            case 'prefix':
                return (config.prefix || '') + stringValue;
            case 'suffix':
                return stringValue + (config.suffix || '');
            case 'substring':
                const start = config.substringStart || 0;
                const end = config.substringEnd;
                return end !== undefined ? stringValue.substring(start, end) : stringValue.substring(start);
            case 'replace':
                if (config.regex && config.replacement !== undefined) {
                    try {
                        const regex = new RegExp(config.regex, 'g');
                        return stringValue.replace(regex, config.replacement);
                    } catch (e) {
                        return stringValue.replace(new RegExp(config.regex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), config.replacement);
                    }
                }
                return stringValue;
            default:
                return stringValue;
        }
    }
    
    // Handle legacy transform types
    if (transformType === 'uppercase') {
        return String(inputValue).toUpperCase();
    } else if (transformType === 'lowercase') {
        return String(inputValue).toLowerCase();
    } else if (transformType === 'trim') {
        return String(inputValue).trim();
    } else if (transformType === 'replace' && config.regex && config.replacement !== undefined) {
        try {
            const regex = new RegExp(config.regex, 'g');
            return String(inputValue).replace(regex, config.replacement);
        } catch (e) {
            return String(inputValue).replace(new RegExp(config.regex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), config.replacement);
        }
    }
    
    return inputValue;
};

// Apply coalesce transformation
const applyCoalesceTransform = (inputValue: any, config: any, sourceNode: any): { value: any; label?: string } => {
    const rules = config.rules || [];
    const defaultValue = config.defaultValue || '';
    const outputType = config.outputType || 'value';
    
    // Get the source data object
    const sourceData = typeof inputValue === 'object' ? inputValue : {};
    
    // Try each rule in priority order
    for (const rule of rules.sort((a: any, b: any) => a.priority - b.priority)) {
        if (!rule.fieldPath) continue;
        
        // Get value from the field path
        const getValue = (obj: any, path: string) => {
            try {
                const keys = path.split('.');
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
        
        const fieldValue = getValue(sourceData, rule.fieldPath);
        
        // If this field has a value, use it
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
            if (outputType === 'value') {
                return { value: fieldValue };
            } else if (outputType === 'label') {
                return { value: rule.outputLabel };
            } else { // both
                return { value: fieldValue, label: rule.outputLabel };
            }
        }
    }
    
    // No field had a value, return default
    if (outputType === 'label') {
        return { value: '' };
    }
    return { value: defaultValue };
};

// Get source value from a node - updated to handle new field structure
const getSourceValue = (node: any, handleId: string): any => {
    if (!isSourceNode(node)) return null;
    
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

// Calculate field values for target nodes based on connections
const calculateTargetFieldValues = (targetNodeId: string, targetFields: any[], allNodes: any[], allEdges: any[]) => {
    if (!targetFields || !Array.isArray(targetFields)) {
        return {};
    }
    
    const valueMap: Record<string, any> = {};
    
    // Find incoming edges to this target node
    const incomingEdges = allEdges.filter(edge => edge.target === targetNodeId);
    
    if (incomingEdges.length === 0) {
        return {};
    }
    
    incomingEdges.forEach(edge => {
        const sourceNode = allNodes.find(n => n.id === edge.source);
        const targetField = targetFields.find(f => f.id === edge.targetHandle);
        
        if (!sourceNode || !targetField) return;
        
        let value: any = undefined;
        
        // Handle different source node types
        if (isSourceNode(sourceNode)) {
            value = getSourceValue(sourceNode, edge.sourceHandle);
        } else if (sourceNode.type === 'transform') {
            // Find input to the transform node
            const transformInputEdges = allEdges.filter(e => e.target === sourceNode.id);
            
            let inputValue: any = null;
            
            transformInputEdges.forEach(inputEdge => {
                const inputSourceNode = allNodes.find(n => n.id === inputEdge.source);
                
                if (inputSourceNode && isSourceNode(inputSourceNode)) {
                    inputValue = getSourceValue(inputSourceNode, inputEdge.sourceHandle);
                }
            });
            
            if (inputValue !== null) {
                const config = sourceNode.data?.config || {};
                const transformType = sourceNode.data?.transformType;
                value = applyStringTransform(inputValue, config, transformType);
            }
        } else if (sourceNode.type === 'coalesceTransform') {
            // Handle coalesce transform node
            const transformInputEdges = allEdges.filter(e => e.target === sourceNode.id);
            
            let inputValue: any = null;
            
            transformInputEdges.forEach(inputEdge => {
                const inputSourceNode = allNodes.find(n => n.id === inputEdge.source);
                
                if (inputSourceNode && isSourceNode(inputSourceNode)) {
                    // For coalesce, we need the entire data object, not just a field
                    const sourceData = inputSourceNode.data?.data;
                    if (sourceData && Array.isArray(sourceData) && sourceData.length > 0) {
                        inputValue = sourceData[0];
                    }
                }
            });
            
            if (inputValue !== null) {
                const config = sourceNode.data || {};
                const result = applyCoalesceTransform(inputValue, config, sourceNode);
                
                // Handle different output types based on the target handle
                if (edge.sourceHandle === 'value' || edge.sourceHandle === 'output') {
                    value = result.value;
                } else if (edge.sourceHandle === 'label') {
                    value = result.label;
                }
            }
        } else if (sourceNode.type === 'staticValue') {
            // Handle new multi-value static value nodes
            const staticValues = sourceNode.data?.values;
            if (Array.isArray(staticValues)) {
                const staticValue = staticValues.find((v: any) => v.id === edge.sourceHandle);
                if (staticValue) {
                    value = staticValue.value || '';
                }
            } else {
                // Fallback for old single-value static nodes
                value = sourceNode.data?.value || '';
            }
        } else if (sourceNode.type === 'conversionMapping') {
            // Handle conversion mapping logic...
            const conversionIncomingEdges = allEdges.filter(e => e.target === sourceNode.id);
            
            let sourceValueForMapping: any = null;
            
            conversionIncomingEdges.forEach(conversionEdge => {
                const originalSourceNode = allNodes.find(n => n.id === conversionEdge.source);
                
                if (originalSourceNode && isSourceNode(originalSourceNode)) {
                    // Direct source node connection
                    sourceValueForMapping = getSourceValue(originalSourceNode, conversionEdge.sourceHandle);
                } else if (originalSourceNode && originalSourceNode.type === 'transform') {
                    // Transform node connection - we need to calculate the transform output
                    const transformInputEdges = allEdges.filter(e => e.target === originalSourceNode.id);
                    
                    transformInputEdges.forEach(transformInputEdge => {
                        const transformSourceNode = allNodes.find(n => n.id === transformInputEdge.source);
                        
                        if (transformSourceNode && isSourceNode(transformSourceNode)) {
                            let rawValue = getSourceValue(transformSourceNode, transformInputEdge.sourceHandle);
                            
                            if (rawValue !== null) {
                                const config = originalSourceNode.data?.config || {};
                                const transformType = originalSourceNode.data?.transformType;
                                sourceValueForMapping = applyStringTransform(rawValue, config, transformType);
                            }
                        }
                    });
                }
            });
            
            // Now apply the conversion mapping
            if (sourceValueForMapping !== null) {
                const mappings = sourceNode.data?.mappings;
                if (Array.isArray(mappings) && mappings.length > 0) {
                    const sourceValueStr = String(sourceValueForMapping).trim();
                    const mappingRule = mappings.find((mapping: any) => 
                        String(mapping.from).trim() === sourceValueStr
                    );
                    
                    value = mappingRule ? mappingRule.to : 'NotMapped';
                } else {
                    value = 'NoMappings';
                }
            } else {
                value = 'NoInput';
            }
        } else if (sourceNode.type === 'ifThen') {
            const { operator, compareValue, thenValue, elseValue } = sourceNode.data || {};
            
            // Find input to the IF THEN node
            const ifThenInputEdges = allEdges.filter(e => e.target === sourceNode.id);
            
            let inputValue: any = null;
            
            ifThenInputEdges.forEach(inputEdge => {
                const inputSourceNode = allNodes.find(n => n.id === inputEdge.source);
                
                if (inputSourceNode && isSourceNode(inputSourceNode)) {
                    inputValue = getSourceValue(inputSourceNode, inputEdge.sourceHandle);
                }
            });
            
            if (inputValue !== null && operator) {
                const conditionResult = evaluateCondition(inputValue, operator, compareValue || '');
                value = conditionResult ? thenValue : elseValue;
            }
        }
        
        if (value !== undefined) {
            valueMap[targetField.id] = value;
        }
    });
    
    return valueMap;
};

export default function Pipeline() {
    const { theme } = useTheme();
    const { updateTargetField, conversionMode, conversionMappings, conversionTransforms } = useFieldStore();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [sourceData, setSourceData] = useState([]);
    const [targetData, setTargetData] = useState([]);
    const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
    const [currentMappingName, setCurrentMappingName] = useState('Untitled Mapping');
    const canvasRef = useRef(null);

    // Use node factories
    const { addSchemaNode, addTransformNode, addMappingNode } = useNodeFactories(nodes, setNodes);

    // Simple connection handler with proper style inheritance
    const onConnect = useCallback((connection: Connection) => {
        const newEdge = {
            ...connection,
            type: 'smoothstep',
            animated: true,
            style: { 
                strokeWidth: 2.0,
                stroke: '#3b82f6'
            }
        };
        setEdges(edges => addEdge(newEdge, edges));
    }, [setEdges]);

    // Simple edge change handler
    const handleEdgesChange = useCallback((changes: any) => {
        onEdgesChange(changes);
    }, [onEdgesChange]);

    // Simple node change handler
    const handleNodesChange = useCallback((changes: any) => {
        // Check if any nodes are being removed and clean up their edges
        const removedNodes = changes.filter((change: any) => change.type === 'remove');
        if (removedNodes.length > 0) {
            const removedNodeIds = removedNodes.map((change: any) => change.id);
            setEdges(currentEdges => 
                currentEdges.filter(edge => 
                    !removedNodeIds.includes(edge.source) && 
                    !removedNodeIds.includes(edge.target)
                )
            );
        }
        
        onNodesChange(changes);
    }, [onNodesChange, setEdges]);

    // Update sidebar data whenever nodes change
    useEffect(() => {
        // Update source data from all source-type nodes
        const sourceNodes = nodes.filter(isSourceNode);
        const allSourceData = sourceNodes.flatMap(node => node.data?.data || []);
        
        // Update target data from all target-type nodes
        const targetNodes = nodes.filter(isTargetNode);
        const allTargetData = targetNodes.flatMap(node => node.data?.data || []);
        
        setSourceData(allSourceData);
        setTargetData(allTargetData);
    }, [nodes]);

    // Enhanced nodes with calculated field values for target nodes
    const enhancedNodes = useMemo(() => {
        return nodes.map(node => {
            if (isTargetNode(node) && node.data?.fields) {
                const fieldValues = calculateTargetFieldValues(node.id, node.data.fields, nodes, edges);
                
                return {
                    ...node,
                    data: {
                        ...node.data,
                        fieldValues,
                    }
                };
            }
            return node;
        });
    }, [nodes, edges]);

    // Handle canvas clicks to close toolbars
    const handleCanvasClick = useCallback((event: React.MouseEvent) => {
        const target = event.target as HTMLElement;
        
        // Check if click is on any toolbar or its children
        const toolbar = document.querySelector('[data-toolbar="mapping-toolbar"]');
        const manager = document.querySelector('[data-toolbar="mapping-manager"]');
        if ((toolbar && toolbar.contains(target)) || (manager && manager.contains(target))) {
            return; // Don't close if clicking on toolbars
        }
        
        // Close toolbar if it's expanded and click is outside toolbars
        if (isToolbarExpanded) {
            setIsToolbarExpanded(false);
        }
    }, [isToolbarExpanded]);

    // Add new mapping functionality
    const handleNewMapping = useCallback((name: string) => {
        // Clear all nodes and edges
        setNodes([]);
        setEdges([]);
        setCurrentMappingName(name);
    }, [setNodes, setEdges]);

    // Add save mapping functionality
    const handleSaveMapping = useCallback((name: string) => {
        setCurrentMappingName(name);
        // Here you could also save to a database or local storage
        
        // Optionally export the file with the new name
        const config = exportUIMappingConfiguration(nodes, edges, name);
        const dataStr = JSON.stringify(config, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${name.replace(/\s+/g, '_').toLowerCase()}-mapping.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [nodes, edges]);

    // Add export functionality
    const exportCurrentMapping = useCallback(() => {
        downloadBothMappingFiles(nodes, edges, currentMappingName);
    }, [nodes, edges, currentMappingName]);

    // Add import functionality
    const importMapping = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config: MappingConfiguration = JSON.parse(e.target?.result as string);
                const { nodes: importedNodes, edges: importedEdges } = importMappingConfiguration(config);
                
                setNodes(importedNodes);
                setEdges(importedEdges);
                setCurrentMappingName(config.name || 'Imported Mapping');
            } catch (error) {
                console.error('Failed to import mapping configuration:', error);
                alert('Invalid mapping configuration file');
            }
        };
        reader.readAsText(file);
    }, [setNodes, setEdges]);

    const style = useMemo(
        () => ({
            width: '100%',
            height: '100%',
            background: theme?.canvas?.background || '#f8f9fa',
        }),
        [theme?.canvas?.background]
    );

    return (
        <div className="w-full h-screen relative" onClick={handleCanvasClick} ref={canvasRef}>
            <DataSidebar
                side="left"
                title="Source Data"
                data={sourceData}
                onDataChange={setSourceData}
            />
            
            <DataSidebar
                side="right"
                title="Target Data"
                data={targetData}
                onDataChange={setTargetData}
            />

            <ReactFlowProvider>
                <MappingToolbar
                    onAddTransform={addTransformNode}
                    onAddMappingNode={addMappingNode}
                    onAddSchemaNode={addSchemaNode}
                    isExpanded={isToolbarExpanded}
                    onToggleExpanded={setIsToolbarExpanded}
                />

                <MappingManager
                    onExportMapping={exportCurrentMapping}
                    onImportMapping={importMapping}
                    onNewMapping={handleNewMapping}
                    onSaveMapping={handleSaveMapping}
                    currentMappingName={currentMappingName}
                />
                
                <div className="relative w-full h-full overflow-hidden">
                    <ReactFlow
                        nodes={enhancedNodes}
                        onNodesChange={handleNodesChange}
                        edges={edges}
                        onEdgesChange={handleEdgesChange}
                        onConnect={onConnect}
                        fitView
                        style={style}
                        nodeTypes={nodeTypes}
                        deleteKeyCode={['Backspace', 'Delete']}
                        defaultEdgeOptions={{
                            type: 'smoothstep',
                            animated: true,
                            style: { 
                                strokeWidth: 0.75,
                                stroke: '#3b82f6'
                            }
                        }}
                    >
                        <Background />
                        <Controls />
                    </ReactFlow>
                </div>
            </ReactFlowProvider>
        </div>
    );
}
