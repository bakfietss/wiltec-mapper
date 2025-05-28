
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

export default function Canvas() {
    const { theme } = useTheme();
    const { updateTargetField, conversionMode, conversionMappings, conversionTransforms } = useFieldStore();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [sourceData, setSourceData] = useState([]);
    const [targetData, setTargetData] = useState([]);

    const processDataMapping = useCallback((edges: Edge[], nodes: Node[]) => {
        const newTargetData: any = {};
        
        edges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            
            if (sourceNode?.type === 'editableSchema' && targetNode?.type === 'editableSchema') {
                const sourceField = sourceNode.data.fields?.find((f: any) => f.id === edge.sourceHandle);
                const targetField = targetNode.data.fields?.find((f: any) => f.id === edge.targetHandle);
                
                if (sourceField && targetField && sourceNode.data.data?.[0]) {
                    const sourceValue = sourceNode.data.data[0][sourceField.name] || sourceField.exampleValue;
                    newTargetData[targetField.name] = sourceValue;
                    console.log(`Mapping ${sourceField.name}(${sourceValue}) -> ${targetField.name}`);
                }
            }
        });
        
        // Update target nodes with mapped data
        setNodes(currentNodes => 
            currentNodes.map(node => {
                if (node.type === 'editableSchema' && node.data.schemaType === 'target') {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            data: Object.keys(newTargetData).length > 0 ? [newTargetData] : []
                        }
                    };
                }
                return node;
            })
        );
        
        setTargetData(Object.keys(newTargetData).length > 0 ? [newTargetData] : []);
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

        // Process data mapping after connection
        setTimeout(() => {
            processDataMapping(newEdges, nodes);
        }, 100);
        
    }, [nodes, edges, processDataMapping]);

    // Re-process data mapping when nodes change
    const handleNodesChange = useCallback((changes: any) => {
        onNodesChange(changes);
        setTimeout(() => {
            processDataMapping(edges, nodes);
        }, 100);
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
