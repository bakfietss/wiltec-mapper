
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

import { useNodeFactories } from './NodeFactories';
import { exportMappingConfiguration, importMappingConfiguration, MappingConfiguration } from './MappingExporter';

const nodeTypes = {
    source: SourceNode,
    target: TargetNode,
    conversionMapping: ConversionMappingNode,
    transform: TransformNode,
    splitterTransform: SplitterTransformNode,
    ifThen: IfThenNode,
    staticValue: StaticValueNode,
};

// Helper function to check if a node is a source-type node
const isSourceNode = (node: any): boolean => {
    console.log('Checking if source node:', node.id, node.type);
    return node.type === 'source';
};

// Helper function to check if a node is a target-type node
const isTargetNode = (node: any): boolean => {
    console.log('Checking if target node:', node.id, node.type);
    return node.type === 'target';
};

// Helper function to evaluate conditions for IF THEN nodes
const evaluateCondition = (inputValue: any, operator: string, compareValue: string): boolean => {
    const leftValue = String(inputValue).trim();
    const rightValue = String(compareValue).trim();
    
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

// Calculate field values for target nodes based on connections
const calculateTargetFieldValues = (targetNodeId: string, targetFields: any[], allNodes: any[], allEdges: any[]) => {
    console.log('=== CALCULATING VALUES FOR TARGET ===');
    console.log('Target node ID:', targetNodeId);
    console.log('Target fields:', targetFields?.map(f => ({ id: f.id, name: f.name })));
    console.log('All nodes:', allNodes.map(n => ({ 
        id: n.id, 
        type: n.type, 
        schemaType: n.data?.schemaType,
        hasFields: !!n.data?.fields,
        hasData: !!n.data?.data,
        dataLength: n.data?.data?.length || 0
    })));
    console.log('All edges:', allEdges.map(e => ({ 
        id: e.id, 
        source: e.source, 
        target: e.target, 
        sourceHandle: e.sourceHandle, 
        targetHandle: e.targetHandle 
    })));
    
    if (!targetFields || !Array.isArray(targetFields)) {
        console.log('No target fields provided');
        return {};
    }
    
    const valueMap: Record<string, any> = {};
    
    // Find incoming edges to this target node
    const incomingEdges = allEdges.filter(edge => edge.target === targetNodeId);
    console.log('Incoming edges to target:', incomingEdges);
    
    if (incomingEdges.length === 0) {
        console.log('No incoming edges found for target node');
        return {};
    }
    
    incomingEdges.forEach(edge => {
        console.log('Processing edge:', { 
            id: edge.id, 
            source: edge.source, 
            sourceHandle: edge.sourceHandle, 
            targetHandle: edge.targetHandle 
        });
        
        const sourceNode = allNodes.find(n => n.id === edge.source);
        const targetField = targetFields.find(f => f.id === edge.targetHandle);
        
        console.log('Source node found:', sourceNode ? {
            id: sourceNode.id,
            type: sourceNode.type,
            schemaType: sourceNode.data?.schemaType,
            hasFields: !!sourceNode.data?.fields,
            hasData: !!sourceNode.data?.data
        } : 'NOT FOUND');
        console.log('Target field found:', targetField ? { id: targetField.id, name: targetField.name } : 'NOT FOUND');
        
        if (!sourceNode || !targetField) {
            console.log('Missing source node or target field, skipping edge');
            return;
        }
        
        let value: any = undefined;
        
        // Handle different source node types
        if (isSourceNode(sourceNode)) {
            console.log('Processing SOURCE-TYPE node');
            const sourceFields = sourceNode.data?.fields;
            const sourceData = sourceNode.data?.data;
            
            console.log('Source fields:', sourceFields?.map(f => ({ id: f.id, name: f.name })));
            console.log('Source data:', sourceData);
            
            if (sourceFields && Array.isArray(sourceFields)) {
                const sourceField = sourceFields.find((f: any) => f.id === edge.sourceHandle);
                console.log('Source field matched:', sourceField ? { id: sourceField.id, name: sourceField.name } : 'NOT FOUND');
                
                if (sourceField) {
                    if (sourceData && Array.isArray(sourceData) && sourceData.length > 0) {
                        value = sourceData[0][sourceField.name];
                        console.log('Got value from source data:', value);
                    } else {
                        value = sourceField.exampleValue || 'No data';
                        console.log('Using example value:', value);
                    }
                }
            }
        } else if (sourceNode.type === 'staticValue') {
            // Handle new multi-value static value nodes
            const staticValues = sourceNode.data?.values;
            if (Array.isArray(staticValues)) {
                const staticValue = staticValues.find((v: any) => v.id === edge.sourceHandle);
                if (staticValue) {
                    value = staticValue.value || '';
                    console.log('Static value from multi-value node:', value);
                }
            } else {
                // Fallback for old single-value static nodes
                value = sourceNode.data?.value || '';
                console.log('Static value (legacy):', value);
            }
        } else if (sourceNode.type === 'conversionMapping') {
            console.log('Processing CONVERSION MAPPING node');
            // Handle conversion mapping logic...
            const conversionIncomingEdges = allEdges.filter(e => e.target === sourceNode.id);
            console.log('Conversion incoming edges:', conversionIncomingEdges);
            
            conversionIncomingEdges.forEach(conversionEdge => {
                const originalSourceNode = allNodes.find(n => n.id === conversionEdge.source);
                if (originalSourceNode && isSourceNode(originalSourceNode)) {
                    const sourceField = originalSourceNode.data?.fields?.find((f: any) => f.id === conversionEdge.sourceHandle);
                    
                    if (sourceField) {
                        let sourceValue = originalSourceNode.data?.data?.length > 0 
                            ? originalSourceNode.data.data[0][sourceField.name] 
                            : sourceField.exampleValue;
                        
                        const mappings = sourceNode.data?.mappings;
                        if (Array.isArray(mappings) && mappings.length > 0) {
                            const sourceValueStr = String(sourceValue).trim();
                            const mappingRule = mappings.find((mapping: any) => 
                                String(mapping.from).trim() === sourceValueStr
                            );
                            
                            value = mappingRule ? mappingRule.to : 'NotMapped';
                            console.log('Conversion result:', sourceValueStr, '->', value);
                        }
                    }
                }
            });
        } else if (sourceNode.type === 'ifThen') {
            console.log('Processing IF THEN node');
            const { operator, compareValue, thenValue, elseValue } = sourceNode.data || {};
            
            // Find input to the IF THEN node
            const ifThenInputEdges = allEdges.filter(e => e.target === sourceNode.id);
            let inputValue: any = null;
            
            ifThenInputEdges.forEach(inputEdge => {
                const inputSourceNode = allNodes.find(n => n.id === inputEdge.source);
                if (inputSourceNode && isSourceNode(inputSourceNode)) {
                    const sourceField = inputSourceNode.data?.fields?.find((f: any) => f.id === inputEdge.sourceHandle);
                    if (sourceField) {
                        inputValue = inputSourceNode.data?.data?.length > 0 
                            ? inputSourceNode.data.data[0][sourceField.name] 
                            : sourceField.exampleValue;
                    }
                }
            });
            
            if (inputValue !== null && operator && compareValue) {
                const conditionResult = evaluateCondition(inputValue, operator, compareValue);
                value = conditionResult ? thenValue : elseValue;
                console.log('IF THEN result:', conditionResult, '->', value);
            }
        }
        
        if (value !== undefined) {
            valueMap[targetField.id] = value;
            console.log('SET VALUE:', targetField.name, '=', value);
        } else {
            console.log('NO VALUE SET for field:', targetField.name);
        }
    });
    
    console.log('=== FINAL VALUE MAP ===');
    console.log(valueMap);
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
        console.log('Connection made:', connection);
        const newEdge = {
            ...connection,
            type: 'smoothstep',
            animated: true,
            style: { 
                strokeWidth: 0.75,
                stroke: '#3b82f6'
            }
        };
        setEdges(edges => addEdge(newEdge, edges));
    }, [setEdges]);

    // Simple edge change handler
    const handleEdgesChange = useCallback((changes: any) => {
        console.log('Edge changes:', changes);
        onEdgesChange(changes);
    }, [onEdgesChange]);

    // Simple node change handler
    const handleNodesChange = useCallback((changes: any) => {
        console.log('Node changes:', changes);
        
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
        console.log('=== UPDATING SIDEBAR DATA ===');
        console.log('Total nodes:', nodes.length);
        
        // Update source data from all source-type nodes
        const sourceNodes = nodes.filter(isSourceNode);
        console.log('Source nodes found:', sourceNodes.map(n => ({ id: n.id, type: n.type, schemaType: n.data?.schemaType })));
        
        const allSourceData = sourceNodes.flatMap(node => {
            const data = node.data?.data || [];
            console.log(`Source node ${node.id} data:`, data);
            return data;
        });
        
        // Update target data from all target-type nodes
        const targetNodes = nodes.filter(isTargetNode);
        console.log('Target nodes found:', targetNodes.map(n => ({ id: n.id, type: n.type, schemaType: n.data?.schemaType })));
        
        const allTargetData = targetNodes.flatMap(node => {
            const data = node.data?.data || [];
            console.log(`Target node ${node.id} data:`, data);
            return data;
        });
        
        console.log('Final source data for sidebar:', allSourceData);
        console.log('Final target data for sidebar:', allTargetData);
        
        setSourceData(allSourceData);
        setTargetData(allTargetData);
    }, [nodes]);

    // Enhanced nodes with calculated field values for target nodes
    const enhancedNodes = useMemo(() => {
        console.log('=== COMPUTING ENHANCED NODES ===');
        console.log('Total nodes to enhance:', nodes.length);
        console.log('Total edges:', edges.length);
        
        return nodes.map(node => {
            if (isTargetNode(node) && node.data?.fields) {
                console.log(`Enhancing target node: ${node.id}`);
                const fieldValues = calculateTargetFieldValues(node.id, node.data.fields, nodes, edges);
                console.log(`Target node ${node.id} enhanced with values:`, fieldValues);
                
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
        console.log('Created new mapping:', name);
    }, [setNodes, setEdges]);

    // Add save mapping functionality
    const handleSaveMapping = useCallback((name: string) => {
        setCurrentMappingName(name);
        // Here you could also save to a database or local storage
        console.log('Saved mapping as:', name);
        
        // Optionally export the file with the new name
        const config = exportMappingConfiguration(nodes, edges, name);
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
        const config = exportMappingConfiguration(nodes, edges, currentMappingName);
        
        // Create download link
        const dataStr = JSON.stringify(config, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentMappingName.replace(/\s+/g, '_').toLowerCase()}-mapping.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('Exported mapping configuration:', config);
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
                
                console.log('Imported mapping configuration:', config);
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
