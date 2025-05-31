
import { useState, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { TargetNodeData } from '../types/TargetNodeTypes';

export const useTargetNode = (data: TargetNodeData, id?: string) => {
    const { getEdges, getNodes, setNodes } = useReactFlow();
    const edges = getEdges();
    const nodes = getNodes();
    const [expandedStates] = useState(() => new Map<string, boolean>());
    const [, forceUpdate] = useState({});

    const handleExpandChange = () => {
        forceUpdate({});
    };

    // Find current node by ID (passed as prop) or by matching target nodes
    const currentNode = nodes.find(node => {
        if (id) return node.id === id;
        return (node.type === 'target' || (node.type === 'editableSchema' && node.data?.schemaType === 'target')) &&
               node.data?.label === data.label;
    });

    // Build the complete data record from both manual input and connections
    const targetNodeData = data.data?.[0] ?? {};
    const handleValueMap: Record<string, any> = { ...targetNodeData };

    // Check for connected values and merge them
    let hasNewConnectionData = false;
    for (const edge of edges) {
        if (edge.target === currentNode?.id) {
            const targetHandle = edge.targetHandle;
            const sourceHandle = edge.sourceHandle;
            if (targetHandle && sourceHandle) {
                const sourceNode = nodes.find(n => n.id === edge.source);
                if (sourceNode && sourceNode.data?.data?.[0]) {
                    const sourceValue = sourceNode.data.data[0][sourceHandle];
                    if (sourceValue !== undefined) {
                        handleValueMap[targetHandle] = sourceValue;
                        // Check if this is new data that needs to be stored
                        if (targetNodeData[targetHandle] !== sourceValue) {
                            hasNewConnectionData = true;
                        }
                    }
                }
            }
        }
    }

    // Update the node's data if we have new connection data
    useEffect(() => {
        if (hasNewConnectionData && currentNode) {
            const updatedData = { ...handleValueMap };
            console.log('Updating target node data with:', updatedData);
            
            setNodes(nodes => nodes.map(node => {
                if (node.id === currentNode.id) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            data: [updatedData]
                        }
                    };
                }
                return node;
            }));
        }
    }, [hasNewConnectionData, currentNode?.id, JSON.stringify(handleValueMap)]);

    console.log('Target node current data:', targetNodeData);
    console.log('Final handle value map:', handleValueMap);

    // Use the current node's data if available, otherwise use the prop data
    // Ensure we always have an array
    const nodeData = Array.isArray(currentNode?.data?.data) ? currentNode.data.data : 
                     Array.isArray(data.data) ? data.data : [];

    return {
        expandedStates,
        handleExpandChange,
        nodeData
    };
};
