
import { useState, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { TargetNodeData } from '../types/TargetNodeTypes';

export const useTargetNode = (data: TargetNodeData, id?: string) => {
    const { getEdges, getNodes, setNodes } = useReactFlow();
    const [expandedStates] = useState(() => new Map<string, boolean>());
    const [, forceUpdate] = useState({});

    const handleExpandChange = () => {
        forceUpdate({});
    };

    // Get current node more reliably
    const nodes = getNodes();
    const edges = getEdges();
    
    const currentNode = nodes.find(node => {
        if (id) return node.id === id;
        return (node.type === 'target' || (node.type === 'editableSchema' && node.data?.schemaType === 'target')) &&
               node.data?.label === data.label;
    });

    console.log('Current target node:', currentNode?.id, 'Label:', data.label);

    // Process connections and update target data
    useEffect(() => {
        if (!currentNode) return;

        const targetNodeData = currentNode.data?.data?.[0] ?? {};
        const handleValueMap: Record<string, any> = { ...targetNodeData };
        let hasNewConnectionData = false;
        
        // Process all edges connecting to this target node
        const connectedEdges = edges.filter(edge => edge.target === currentNode.id);
        console.log('Connected edges to target node:', currentNode.id, connectedEdges.length);

        for (const edge of connectedEdges) {
            const targetHandle = edge.targetHandle;
            const sourceHandle = edge.sourceHandle;
            
            console.log('Processing edge:', edge.id, 'Target handle:', targetHandle, 'Source handle:', sourceHandle);
            
            if (targetHandle && sourceHandle) {
                const sourceNode = nodes.find(n => n.id === edge.source);
                console.log('Source node found:', sourceNode?.id, 'Type:', sourceNode?.type);
                
                if (sourceNode && sourceNode.data?.data?.[0]) {
                    console.log('Source node data:', sourceNode.data.data[0]);
                    console.log('Looking for source handle:', sourceHandle);
                    
                    const sourceValue = sourceNode.data.data[0][sourceHandle];
                    if (sourceValue !== undefined) {
                        console.log('Found source value:', sourceValue, 'for handle:', sourceHandle, 'mapping to target handle:', targetHandle);
                        handleValueMap[targetHandle] = sourceValue;
                        if (targetNodeData[targetHandle] !== sourceValue) {
                            hasNewConnectionData = true;
                        }
                    } else {
                        console.log('No source value found for handle:', sourceHandle, 'in data:', sourceNode.data.data[0]);
                    }
                } else {
                    console.log('Source node has no data or invalid structure');
                }
            } else {
                console.log('Missing handle IDs - Target handle:', targetHandle, 'Source handle:', sourceHandle);
            }
        }

        if (hasNewConnectionData) {
            console.log('Updating target node data with:', handleValueMap);
            
            setNodes(nodes => nodes.map(node => {
                if (node.id === currentNode.id) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            data: [handleValueMap]
                        }
                    };
                }
                return node;
            }));
        }
    }, [edges, nodes, currentNode?.id, setNodes]);

    const nodeData = Array.isArray(currentNode?.data?.data) ? currentNode.data.data : 
                     Array.isArray(data.data) ? data.data : [];

    return {
        expandedStates,
        handleExpandChange,
        nodeData
    };
};
