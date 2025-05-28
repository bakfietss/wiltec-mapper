import { useMemo, useCallback, useState } from 'react';
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
                                console.log(`Mapping ${sourceField.name}(${sourceValue}) -> ${targetField.name}`);
                            }
                        }
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
        
        // Update nodes if there were changes
        const hasChanges = updatedNodes.some((node, index) => {
            const originalNode = nodes[index];
            return node !== originalNode && 
                   node.type === 'editableSchema' && 
                   isSchemaNodeData(node.data) && 
                   node.data.schemaType === 'target';
        });
        
        if (hasChanges) {
            setNodes(updatedNodes);
            
            // Update target data for sidebar
            const allTargetData = updatedNodes
                .filter(node => node.type === 'editableSchema' && isSchemaNodeData(node.data) && node.data.schemaType === 'target')
                .flatMap(node => node.data?.data || []);
            
            setTargetData(allTargetData);
        }
    }, [setNodes]);

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
            processDataMapping(newEdges, nodes);
        }, 50);
        
    }, [nodes, edges, processDataMapping]);

    // Re-process data mapping when nodes change (including when data is updated)
    const handleNodesChange = useCallback((changes: any) => {
        onNodesChange(changes);
        
        // Re-process mapping after node changes if it's a data update
        const hasDataChanges = changes.some((change: any) => 
            change.type === 'replace' || 
            (change.type === 'add' && change.item?.data)
        );
        
        if (hasDataChanges) {
            setTimeout(() => {
                processDataMapping(edges, nodes);
            }, 50);
        }
    }, [onNodesChange, edges, nodes, processDataMapping]);

    const addSchemaNode = useCallback((type: 'source' | 'target') => {
        const newNode: Node = {
            id: `${type}-${Date.now()}`,
            type: 'editableSchema',
            position: { x: type === 'source' ? 100 : 800, y: 100 + nodes.length * 50 },
            data: {
                label: type === 'source' ? 'Source Schema' : 'Target Schema',
                schemaType: type,
                fields: [],
                data: type === 'source' ? sourceData : targetData,
            },
        };

        setNodes((nds) => [...nds, newNode]);
    }, [nodes.length, sourceData, targetData]);

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
                >
                    <Background />
                    <Controls />
                </ReactFlow>
            </ReactFlowProvider>
        </div>
    );
}
