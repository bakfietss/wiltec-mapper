
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useTheme } from '../Theme/ThemeContext';
import { useFieldStore } from '../store/fieldStore';

import SourceNode from '../compontents/SourceNode';
import TargetNode from '../compontents/TargetNode';
import ConversionMappingNode from '../compontents/ConversionMappingNode';
import TransformNode from '../compontents/TransformNode';
import EditableSchemaNode from '../compontents/EditableSchemaNode';
import EditableTransformNode from '../compontents/EditableTransformNode';
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
    editableSchema: EditableSchemaNode,
    editableTransform: EditableTransformNode,
    splitterTransform: SplitterTransformNode,
    ifThen: IfThenNode,
    staticValue: StaticValueNode,
};

// Helper function to check if node data has schema properties
const isSchemaNodeData = (data: any): data is { schemaType: 'source' | 'target'; fields: any[]; data: any[] } => {
    return data && typeof data === 'object' && 'schemaType' in data && 'fields' in data;
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
    console.log('Calculating values for target node:', targetNodeId);
    const valueMap: Record<string, any> = {};
    
    // Find incoming edges to this target node
    const incomingEdges = allEdges.filter(edge => edge.target === targetNodeId);
    console.log('Incoming edges:', incomingEdges);
    
    incomingEdges.forEach(edge => {
        const sourceNode = allNodes.find(n => n.id === edge.source);
        const targetField = targetFields.find(f => f.id === edge.targetHandle);
        
        console.log('Processing edge:', { edge, sourceNode: sourceNode?.type, targetField: targetField?.name });
        
        if (sourceNode && targetField) {
            let value: any = undefined;
            
            // Handle different source node types
            if (sourceNode.type === 'staticValue' && sourceNode.data?.value) {
                value = sourceNode.data.value;
                console.log('Static value:', value);
            } else if (sourceNode.type === 'ifThen') {
                // For IF THEN nodes, evaluate the condition
                const { operator, compareValue, thenValue, elseValue } = sourceNode.data || {};
                
                // Find input to the IF THEN node
                const ifThenInputEdges = allEdges.filter(e => e.target === sourceNode.id);
                let inputValue: any = null;
                
                ifThenInputEdges.forEach(inputEdge => {
                    const inputSourceNode = allNodes.find(n => n.id === inputEdge.source);
                    if (inputSourceNode?.type === 'editableSchema' && inputSourceNode.data?.fields && inputSourceNode.data?.data) {
                        const sourceField = inputSourceNode.data.fields.find((f: any) => f.id === inputEdge.sourceHandle);
                        if (sourceField) {
                            inputValue = inputSourceNode.data.data.length > 0 
                                ? inputSourceNode.data.data[0][sourceField.name] 
                                : sourceField.exampleValue;
                        }
                    } else if (inputSourceNode?.type === 'source' && inputSourceNode.data?.fields && inputSourceNode.data?.data) {
                        const sourceField = inputSourceNode.data.fields.find((f: any) => f.id === inputEdge.sourceHandle);
                        if (sourceField) {
                            inputValue = inputSourceNode.data.data.length > 0 
                                ? inputSourceNode.data.data[0][sourceField.name] 
                                : sourceField.exampleValue;
                        }
                    }
                });
                
                // Evaluate condition
                if (inputValue !== null && operator && compareValue) {
                    const conditionResult = evaluateCondition(inputValue, operator, compareValue);
                    value = conditionResult ? thenValue : elseValue;
                }
                console.log('IF THEN value:', value);
            } else if (sourceNode.type === 'editableSchema' && sourceNode.data?.fields && sourceNode.data?.data) {
                // Direct schema connection
                const sourceField = sourceNode.data.fields.find((f: any) => f.id === edge.sourceHandle);
                if (sourceField) {
                    value = sourceNode.data.data.length > 0 
                        ? sourceNode.data.data[0][sourceField.name] 
                        : sourceField.exampleValue;
                }
                console.log('Schema value:', value);
            } else if (sourceNode.type === 'source' && sourceNode.data?.fields && sourceNode.data?.data) {
                // Direct source node connection
                const sourceField = sourceNode.data.fields.find((f: any) => f.id === edge.sourceHandle);
                if (sourceField) {
                    value = sourceNode.data.data.length > 0 
                        ? sourceNode.data.data[0][sourceField.name] 
                        : sourceField.exampleValue;
                }
                console.log('Source node value:', value);
            } else if (sourceNode.type === 'conversionMapping') {
                // Handle conversion mapping nodes
                const conversionIncomingEdges = allEdges.filter(e => e.target === sourceNode.id && e.targetHandle === 'input');
                
                conversionIncomingEdges.forEach(conversionEdge => {
                    const originalSourceNode = allNodes.find(n => n.id === conversionEdge.source);
                    
                    if (originalSourceNode && (originalSourceNode.type === 'editableSchema' || originalSourceNode.type === 'source') && originalSourceNode.data?.fields && originalSourceNode.data?.data) {
                        const sourceField = originalSourceNode.data.fields.find((f: any) => f.id === conversionEdge.sourceHandle);
                        
                        if (sourceField) {
                            let sourceValue = originalSourceNode.data.data.length > 0 
                                ? originalSourceNode.data.data[0][sourceField.name] 
                                : sourceField.exampleValue;
                            
                            const mappings = sourceNode.data?.mappings;
                            if (Array.isArray(mappings) && mappings.length > 0) {
                                const sourceValueStr = String(sourceValue).trim();
                                const mappingRule = mappings.find((mapping: any) => {
                                    const fromValueStr = String(mapping.from).trim();
                                    return fromValueStr === sourceValueStr;
                                });
                                
                                if (mappingRule) {
                                    value = mappingRule.to;
                                    console.log('Applied conversion rule:', mappingRule.from, '->', mappingRule.to);
                                } else {
                                    value = 'NotMapped';
                                }
                            } else {
                                value = 'NotMapped';
                            }
                        }
                    }
                });
            }
            
            if (value !== undefined) {
                valueMap[targetField.id] = value;
                console.log('Set value for field:', targetField.name, '=', value);
            }
        }
    });
    
    console.log('Final value map for target:', valueMap);
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

    // Simple connection handler
    const onConnect = useCallback((connection: Connection) => {
        console.log('Connection made:', connection);
        const newEdge = {
            ...connection,
            type: 'smoothstep',
            animated: true,
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
        console.log('Nodes changed, updating sidebar data');
        
        // Update source data from all source-type nodes (both 'source' and 'editableSchema' with schemaType source)
        const allSourceData = nodes
            .filter(node => {
                if (node.type === 'source' && node.data?.data) {
                    return true;
                }
                if (node.type === 'editableSchema' && isSchemaNodeData(node.data) && node.data.schemaType === 'source') {
                    return true;
                }
                return false;
            })
            .flatMap(node => node.data?.data || []);
        
        // Update target data from all target-type nodes (both 'target' and 'editableSchema' with schemaType target)
        const allTargetData = nodes
            .filter(node => {
                if (node.type === 'target' && node.data?.data) {
                    return true;
                }
                if (node.type === 'editableSchema' && isSchemaNodeData(node.data) && node.data.schemaType === 'target') {
                    return true;
                }
                return false;
            })
            .flatMap(node => node.data?.data || []);
        
        console.log('Updated source data:', allSourceData);
        console.log('Updated target data:', allTargetData);
        
        setSourceData(allSourceData);
        setTargetData(allTargetData);
    }, [nodes]);

    // Enhanced nodes with calculated field values for target nodes
    const enhancedNodes = useMemo(() => {
        console.log('Computing enhanced nodes...');
        return nodes.map(node => {
            if (node.type === 'target' && node.data?.fields) {
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
                                strokeWidth: 1,
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
