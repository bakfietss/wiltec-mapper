// src/Canvas/Canvas.tsx
import { useMemo } from 'react';
import ReactFlow, {
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    addEdge,
    type Connection,
    type Node,
    type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useTheme } from '../Theme/ThemeContext';
import { useFieldStore } from '../store/fieldStore';

import InputNode from '../Layout/Nodes/InputNode';
import OutputNode from '../Layout/Nodes/OutputNode';
import ConversionNode from '../Layout/Nodes/ConversionNode';

const nodeTypes = {
    input: InputNode,
    output: OutputNode,
    conversion: ConversionNode,
};

export default function Canvas() {
    const { theme } = useTheme();
    const {
        sourceFields,
        updateTargetField,
        conversionMode,
        conversionMappings,
        conversionTransforms,
    } = useFieldStore();

    const [nodes, , onNodesChange] = useNodesState<Node[]>([
        { id: '1', type: 'input', position: { x: 100, y: 100 }, data: {} },
        { id: '2', type: 'output', position: { x: 600, y: 100 }, data: {} },
        { id: '3', type: 'conversion', position: { x: 350, y: 250 }, data: {} },
    ]);

    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);

    const onConnect = (connection: Connection) => {
        setEdges((eds) => addEdge(connection, eds));

        const { source, sourceHandle, target, targetHandle } = connection;

        if (!sourceHandle || !targetHandle) {
            console.warn("Missing handle IDs in connection", connection);
            return;
        }

        // Input → Conversion
        if (source === '1' && target === '3') {
            const sourceIndex = parseInt(sourceHandle.split('-')[1], 10);
            const rawValue = sourceFields[sourceIndex]?.value;

            // Store the incoming value in the conversion node's data (optional if needed)
            // You can skip this if you're not using node.data anymore
            return;
        }

        // Conversion → Output
        if (source === '3' && target === '2') {
            const targetIndex = parseInt(targetHandle.split('-')[2], 10);

            let value = ''; // We’ll try to get from previous Input → Conversion edge

            // Find the last edge into the ConversionNode
            const inputEdge = edges.find(
                (e) => e.target === '3' && e.source === '1' && e.sourceHandle
            );

            if (inputEdge) {
                const sourceIndex = parseInt(inputEdge.sourceHandle!.split('-')[1], 10);
                value = sourceFields[sourceIndex]?.value ?? '';
            }

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

            updateTargetField(targetIndex, 'value', value);
            return;
        }

        // Fallback: Input → Output
        if (sourceHandle.startsWith('field-') && targetHandle.startsWith('target-field-')) {
            const sourceIndex = parseInt(sourceHandle.split('-')[1], 10);
            const targetIndex = parseInt(targetHandle.split('-')[2], 10);
            const value = sourceFields[sourceIndex]?.value || '';
            updateTargetField(targetIndex, 'value', value);
        } else {
            console.log("Connection involved non-standard nodes, skipping auto-transfer.");
        }
    };

    const style = useMemo(
        () => ({
            width: '100%',
            height: '100%',
            background: theme.canvas.background,
        }),
        [theme.canvas.background]
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
