
import { useMemo } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    addEdge,
    type Connection,
    type Node,
    type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useTheme } from '../Theme/ThemeContext';
import { useFieldStore } from '../store/fieldStore';

import SourceNode from '../compontents/SourceNode';
import TargetNode from '../compontents/TargetNode';
import ConversionMappingNode from '../compontents/ConversionMappingNode';
import TransformNode from '../compontents/TransformNode';

const nodeTypes = {
    source: SourceNode,
    target: TargetNode,
    conversionMapping: ConversionMappingNode,
    transform: TransformNode,
};

// Sample schema data for testing
const sampleSourceFields = [
    { id: 'name', name: 'name', type: 'string' as const },
    { id: 'email', name: 'email', type: 'string' as const },
    { id: 'age', name: 'age', type: 'number' as const },
    { id: 'isActive', name: 'isActive', type: 'boolean' as const },
];

const sampleTargetFields = [
    { id: 'fullName', name: 'fullName', type: 'string' as const },
    { id: 'emailAddress', name: 'emailAddress', type: 'string' as const },
    { id: 'userAge', name: 'userAge', type: 'number' as const },
    { id: 'status', name: 'status', type: 'string' as const },
];

// Sample data for testing
const sampleData = [
    { name: 'John Doe', email: 'john@example.com', age: 30, isActive: true },
    { name: 'Jane Smith', email: 'jane@example.com', age: 25, isActive: false },
];

export default function Canvas() {
    const { theme } = useTheme();
    const { updateTargetField, conversionMode, conversionMappings, conversionTransforms } = useFieldStore();

    const [nodes, , onNodesChange] = useNodesState([
        {
            id: 'source-1',
            type: 'source',
            position: { x: 100, y: 100 },
            data: {
                label: 'Source Data',
                fields: sampleSourceFields,
                data: sampleData,
            },
        },
        {
            id: 'target-1',
            type: 'target',
            position: { x: 800, y: 100 },
            data: {
                label: 'Target Schema',
                fields: sampleTargetFields,
                data: [],
            },
        },
        {
            id: 'conversion-1',
            type: 'conversionMapping',
            position: { x: 400, y: 250 },
            data: {
                label: 'Field Mapping',
                mappings: [],
                isExpanded: false,
            },
        },
    ]);

    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const onConnect = (connection: Connection) => {
        console.log('Connection attempt:', connection);
        setEdges((eds) => addEdge(connection, eds));

        const { source, sourceHandle, target, targetHandle } = connection;

        if (!sourceHandle || !targetHandle) {
            console.warn("Missing handle IDs in connection", connection);
            return;
        }

        // Direct Source → Target mapping
        if (source === 'source-1' && target === 'target-1') {
            console.log('Direct source to target mapping:', { sourceHandle, targetHandle });
            
            // Get the source data
            const sourceData = sampleData[0] || {}; // Using first record for testing
            const sourceValue = sourceData[sourceHandle] || '';
            
            console.log('Mapping value:', sourceValue, 'from', sourceHandle, 'to', targetHandle);
            
            // Update the target field in the store
            const targetIndex = sampleTargetFields.findIndex(field => field.id === targetHandle);
            if (targetIndex >= 0) {
                updateTargetField(targetIndex, 'value', String(sourceValue));
            }
            
            return;
        }

        // Source → Conversion → Target flow
        if (source === 'source-1' && target === 'conversion-1') {
            console.log('Source to conversion mapping');
            return;
        }

        if (source === 'conversion-1' && target === 'target-1') {
            console.log('Conversion to target mapping');
            
            // Find the input edge to get the source value
            const inputEdge = edges.find(
                (e) => e.target === 'conversion-1' && e.source === 'source-1'
            );

            let value = '';
            if (inputEdge && inputEdge.sourceHandle) {
                const sourceData = sampleData[0] || {};
                value = String(sourceData[inputEdge.sourceHandle] || '');
            }

            // Apply conversion logic
            if (conversionMode === 'mapping') {
                const match = conversionMappings.find((row) => row.from === value);
                if (match?.to) value = match.to;
            }

            if (conversionMode === 'transform') {
                for (const tf of conversionTransforms) {
                    switch (tf) {
                        case 'trim':
                            value = value.trim();
                            break;
                        case 'uppercase':
                            value = value.toUpperCase();
                            break;
                        case 'lowercase':
                            value = value.toLowerCase();
                            break;
                        case 'capitalize':
                            value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                            break;
                        case 'removeSpaces':
                            value = value.replace(/\s+/g, '');
                            break;
                        default:
                            break;
                    }
                }
            }

            // Update target field
            if (targetHandle) {
                const targetIndex = sampleTargetFields.findIndex(field => field.id === targetHandle);
                if (targetIndex >= 0) {
                    updateTargetField(targetIndex, 'value', value);
                }
            }
            
            return;
        }

        console.log("Unhandled connection type:", { source, target });
    };

    const style = useMemo(
        () => ({
            width: '100%',
            height: '100%',
            background: theme?.canvas?.background || '#f8f9fa',
        }),
        [theme?.canvas?.background]
    );

    return (
        <ReactFlowProvider>
            <ReactFlow
                nodes={nodes}
                onNodesChange={onNodesChange}
                edges={edges}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                style={style}
                nodeTypes={nodeTypes}
            />
        </ReactFlowProvider>
    );
}
