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

    const onConnect = useCallback((connection: Connection) => {
        console.log('Connection attempt:', connection);
        setEdges((eds) => addEdge(connection, eds));

        const { source, sourceHandle, target, targetHandle } = connection;

        if (!sourceHandle || !targetHandle) {
            console.warn("Missing handle IDs in connection", connection);
            return;
        }

        // Handle different connection types based on node types
        const sourceNode = nodes.find(n => n.id === source);
        const targetNode = nodes.find(n => n.id === target);

        console.log('Connection between:', sourceNode?.type, '->', targetNode?.type);
        
    }, [nodes]);

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
                    onNodesChange={onNodesChange}
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
