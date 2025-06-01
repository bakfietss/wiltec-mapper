
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

    const currentNode = nodes.find(node => {
        if (id) return node.id === id;
        return (node.type === 'target' || (node.type === 'editableSchema' && node.data?.schemaType === 'target')) &&
               node.data?.label === data.label;
    });

    const targetNodeData = data.data?.[0] ?? {};
    const handleValueMap: Record<string, any> = { ...targetNodeData };

    let hasNewConnectionData = false;
    for (const edge of edges) {
        if (edge.target === currentNode?.id) {
            const targetHandle = edge.targetHandle;
            const sourceHandle = edge.sourceHandle;
            if (targetHandle && sourceHandle) {
                const sourceNode = nodes.find(n => n.id === edge.source);
                if (sourceNode && sourceNode.data?.data?.[0]) {
                    console.log('Source node data:', sourceNode.data.data[0]);
                    console.log('Looking for source handle:', sourceHandle);
                    
                    const sourceValue = sourceNode.data.data[0][sourceHandle];
                    if (sourceValue !== undefined) {
                        console.log('Found source value:', sourceValue, 'for handle:', sourceHandle);
                        handleValueMap[targetHandle] = sourceValue;
                        if (targetNodeData[targetHandle] !== sourceValue) {
                            hasNewConnectionData = true;
                        }
                    } else {
                        console.log('No source value found for handle:', sourceHandle, 'in data:', sourceNode.data.data[0]);
                    }
                }
            }
        }
    }

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

    const nodeData = Array.isArray(currentNode?.data?.data) ? currentNode.data.data : 
                     Array.isArray(data.data) ? data.data : [];

    return {
        expandedStates,
        handleExpandChange,
        nodeData
    };
};
