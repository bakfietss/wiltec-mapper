
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

    console.log('Current target node:', currentNode?.id, 'Available nodes:', nodes.map(n => ({ id: n.id, type: n.type })));

    const targetNodeData = data.data?.[0] ?? {};
    const handleValueMap: Record<string, any> = { ...targetNodeData };

    let hasNewConnectionData = false;
    
    // Process all edges connecting to this target node
    const connectedEdges = edges.filter(edge => edge.target === currentNode?.id);
    console.log('Connected edges to target:', connectedEdges);

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
    }, [hasNewConnectionData, currentNode?.id, JSON.stringify(handleValueMap), setNodes]);

    const nodeData = Array.isArray(currentNode?.data?.data) ? currentNode.data.data : 
                     Array.isArray(data.data) ? data.data : [];

    return {
        expandedStates,
        handleExpandChange,
        nodeData
    };
};
