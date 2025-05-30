import { useMemo, useCallback, useState, useEffect } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    addEdge,
    type Connection,
    type Node,
    type Edge,
    Background,
    Controls,
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
import MappingToolbar from '../compontents/MappingToolbar';
import DataSidebar from '../compontents/DataSidebar';

const nodeTypes = {
    source: SourceNode,
    target: TargetNode,
    conversionMapping: ConversionMappingNode,
    transform: TransformNode,
    editableSchema: EditableSchemaNode,
    editableTransform: EditableTransformNode,
};

// Helper function to check if node data has schema properties
const isSchemaNodeData = (data: any): data is { schemaType: 'source' | 'target'; fields: any[]; data: any[] } => {
    return data && typeof data === 'object' && 'schemaType' in data && 'fields' in data;
};

export default function Canvas() {
    const { theme } = useTheme();
    const { updateTargetField, conversionMode, conversionMappings, conversionTransforms } = useFieldStore();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [sourceData, setSourceData] = useState([]);
    const [targetData, setTargetData] = useState([]);

    // Update sidebar data whenever nodes change
    useEffect(() => {
        console.log('Nodes changed, updating sidebar data');
        
        // Update source data from all source nodes
        const allSourceData = nodes
            .filter(node => node.type === 'editableSchema' && isSchemaNodeData(node.data) && node.data.schemaType === 'source')
            .flatMap(node => node.data?.data || []);
        
        // Update target data from all target nodes
        const allTargetData = nodes
            .filter(node => node.type === 'editableSchema' && isSchemaNodeData(node.data) && node.data.schemaType === 'target')
            .flatMap(node => node.data?.data || []);
        
        console.log('Updated source data:', allSourceData);
        console.log('Updated target data:', allTargetData);
        
        setSourceData(allSourceData);
        setTargetData(allTargetData);
    }, [nodes]);

    const processDataMapping = useCallback((edges: Edge[], nodes: Node[]) => {
        console.log('Processing data mapping with edges:', edges.length, 'and nodes:', nodes.length);
        
        // Process each target node
        const updatedNodes = nodes.map(node => {
            if (node.type === 'editableSchema' && isSchemaNodeData(node.data) && node.data.schemaType === 'target') {
                const newTargetData: any = {};
                
                // Find all edges that connect to this target node
                const incomingEdges = edges.filter(edge => edge.target === node.id);
                
                incomingEdges.forEach(edge => {
                    const sourceNode = nodes.find(n => n.id === edge.source);
                    
                    console.log('Processing edge:', edge);
                    console.log('Source node:', sourceNode?.type, sourceNode?.data);
                    console.log('Target node:', node.type, node.data);
                    
                    if (sourceNode?.type === 'editableSchema' && isSchemaNodeData(sourceNode.data)) {
                        // Direct schema-to-schema mapping
                        const sourceFields = Array.isArray(sourceNode.data?.fields) ? sourceNode.data.fields : [];
                        const targetFields = Array.isArray(node.data?.fields) ? node.data.fields : [];
                        const sourceData = Array.isArray(sourceNode.data?.data) ? sourceNode.data.data : [];
                        
                        const sourceField = sourceFields.find((f: any) => f.id === edge.sourceHandle);
                        const targetField = targetFields.find((f: any) => f.id === edge.targetHandle);
                        
                        console.log('Found source field:', sourceField);
                        console.log('Found target field:', targetField);
                        console.log('Source data:', sourceData);
                        
                        if (sourceField && targetField) {
                            // Get value from source data or example value
                            const sourceValue = sourceData.length > 0 
                                ? sourceData[0][sourceField.name] 
                                : sourceField.exampleValue;
                            
                            if (sourceValue !== undefined && sourceValue !== '') {
                                newTargetData[targetField.name] = sourceValue;
                                console.log(`Direct mapping ${sourceField.name}(${sourceValue}) -> ${targetField.name}`);
                            }
                        }
                    } else if (sourceNode?.type === 'conversionMapping') {
                        // Mapping through conversion node - trace back to find the original source
                        const conversionIncomingEdges = edges.filter(e => e.target === sourceNode.id);
                        
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
                                    // Get original value
                                    let sourceValue = sourceData.length > 0 
                                        ? sourceData[0][sourceField.name] 
                                        : sourceField.exampleValue;
                                    
                                    console.log('Original value before conversion:', sourceValue);
                                    console.log('Source field name:', sourceField.name);
                                    console.log('Available mappings:', mappings);
                                    
                                    // Apply conversion mapping - compare field NAME to mapping rule
                                    if (Array.isArray(mappings)) {
                                        const mappingRule = mappings.find((mapping: any) => 
                                            mapping.from === sourceField.name
                                        );
                                        
                                        if (mappingRule) {
                                            sourceValue = mappingRule.to;
                                            console.log(`Applied conversion rule: ${sourceField.name}(${mappingRule.from}) -> ${mappingRule.to}`);
                                        } else {
                                            console.log('No mapping rule found for field:', sourceField.name);
                                        }
                                    }
                                    
                                    if (sourceValue !== undefined && sourceValue !== '') {
                                        newTargetData[targetField.name] = sourceValue;
                                        console.log(`Conversion mapping ${sourceField.name}(${sourceValue}) -> ${targetField.name}`);
                                    }
                                }
                            }
                        });
                    }
                });
                
                console.log('Final target data for node:', node.id, newTargetData);
                
                // Update the node with new data
                if (Object.keys(newTargetData).length > 0) {
                    const updatedNode = {
                        ...node,
                        data: {
                            ...node.data,
                            data: [newTargetData]
                        }
                    };
                    console.log('Updated target node:', updatedNode);
                    return updatedNode;
                }
            }
            return node;
        });
        
        return updatedNodes;
    }, []);

    const onConnect = useCallback((connection: Connection) => {
        console.log('Connection attempt:', connection);
        const newEdges = addEdge(connection, edges);
        setEdges(newEdges);

        const { source, sourceHandle, target, targetHandle } = connection;

        if (!sourceHandle || !targetHandle) {
            console.warn("Missing handle IDs in connection", connection);
            return;
        }

        // Process data mapping immediately after connection
        setTimeout(() => {
            const updatedNodes = processDataMapping(newEdges, nodes);
            const hasChanges = updatedNodes.some((node, index) => node !== nodes[index]);
            if (hasChanges) {
                setNodes(updatedNodes);
            }
        }, 50);
        
    }, [nodes, edges, processDataMapping]);

    // Handle node changes and deletions
    const handleNodesChange = useCallback((changes: any) => {
        console.log('Node changes:', changes);
        
        // Check if any nodes are being removed
        const removedNodes = changes.filter((change: any) => change.type === 'remove');
        if (removedNodes.length > 0) {
            console.log('Nodes being removed:', removedNodes);
            
            // Remove edges connected to deleted nodes
            setEdges((currentEdges) => {
                const removedNodeIds = removedNodes.map((change: any) => change.id);
                return currentEdges.filter(edge => 
                    !removedNodeIds.includes(edge.source) && 
                    !removedNodeIds.includes(edge.target)
                );
            });
        }
        
        onNodesChange(changes);
        
        // Re-process mapping after node changes if it's a data update
        const hasDataChanges = changes.some((change: any) => 
            change.type === 'replace' || 
            (change.type === 'add' && change.item?.data)
        );
        
        if (hasDataChanges) {
            setTimeout(() => {
                setNodes(currentNodes => {
                    const updatedNodes = processDataMapping(edges, currentNodes);
                    const hasChanges = updatedNodes.some((node, index) => node !== currentNodes[index]);
                    return hasChanges ? updatedNodes : currentNodes;
                });
            }, 50);
        }
    }, [onNodesChange, edges, processDataMapping]);

    const addSchemaNode = useCallback((type: 'source' | 'target') => {
        const newNode: Node = {
            id: `${type}-${Date.now()}`,
            type: 'editableSchema',
            position: { x: type === 'source' ? 100 : 800, y: 100 + nodes.length * 50 },
            data: {
                label: type === 'source' ? 'Source Schema' : 'Target Schema',
                schemaType: type,
                fields: [],
                data: [],
            },
        };

        setNodes((nds) => [...nds, newNode]);
    }, [nodes.length]);

    const addTransformNode = useCallback((transformType: string) => {
        const newNode: Node = {
            id: `transform-${Date.now()}`,
            type: 'editableTransform',
            position: { x: 400, y: 100 + nodes.length * 50 },
            data: {
                label: transformType,
                transformType: transformType,
                description: `Apply ${transformType} transformation`,
                config: {},
            },
        };

        setNodes((nds) => [...nds, newNode]);
    }, [nodes.length]);

    const addMappingNode = useCallback(() => {
        const newNode: Node = {
            id: `mapping-${Date.now()}`,
            type: 'conversionMapping',
            position: { x: 400, y: 250 + nodes.length * 50 },
            data: {
                label: 'Field Mapping',
                mappings: [],
                isExpanded: false,
            },
        };

        setNodes((nds) => [...nds, newNode]);
    }, [nodes.length]);

    const style = useMemo(
        () => ({
            width: '100%',
            height: '100%',
            background: theme?.canvas?.background || '#f8f9fa',
        }),
        [theme?.canvas?.background]
    );

    return (
        <div className="w-full h-screen relative">
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
                />
                
                <ReactFlow
                    nodes={nodes}
                    onNodesChange={handleNodesChange}
                    edges={edges}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    fitView
                    style={style}
                    nodeTypes={nodeTypes}
                    deleteKeyCode={['Backspace', 'Delete']}
                >
                    <Background />
                    <Controls />
                </ReactFlow>
            </ReactFlowProvider>
        </div>
    );
}
