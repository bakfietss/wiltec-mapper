
import { useCallback } from 'react';
import { Connection, addEdge, Edge } from '@xyflow/react';
import { processDataMapping } from './DataMappingProcessor';

export const useEdgeHandlers = (
    edges: Edge[],
    setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void,
    setNodes: (nodes: any) => void
) => {
    const onConnect = useCallback((connection: Connection) => {
        console.log('Connection attempt:', connection);
        
        // Create edge with smoothstep type and animation
        const newEdge = {
            ...connection,
            type: 'smoothstep',
            animated: true,
            style: { 
                strokeWidth: 2,
                stroke: '#3b82f6'
            }
        };
        
        const newEdges = addEdge(newEdge, edges);
        setEdges(newEdges);

        const { source, sourceHandle, target, targetHandle } = connection;

        if (!sourceHandle || !targetHandle) {
            console.warn("Missing handle IDs in connection", connection);
            return;
        }

        // Use setTimeout to ensure edges state is updated before processing
        setTimeout(() => {
            console.log('Processing data mapping after edge update');
            setNodes((currentNodes: any) => {
                const updatedNodes = processDataMapping(newEdges, currentNodes);
                const hasChanges = updatedNodes.some((node: any, index: number) => node !== currentNodes[index]);
                if (hasChanges) {
                    console.log('Updating nodes after connection');
                    return updatedNodes;
                }
                return currentNodes;
            });
        }, 10);
        
    }, [edges, setEdges, setNodes]);

    const handleEdgesChange = useCallback((changes: any) => {
        console.log('Edge changes:', changes);
        
        // onEdgesChange is handled by the parent component
        
        // Check if any edges are being removed
        const removedEdges = changes.filter((change: any) => change.type === 'remove');
        if (removedEdges.length > 0) {
            console.log('Edges being removed:', removedEdges);
            
            // Re-process mapping after edge removal
            setTimeout(() => {
                setNodes((currentNodes: any) => {
                    const currentEdges = edges.filter(edge => 
                        !removedEdges.some((removed: any) => removed.id === edge.id)
                    );
                    const updatedNodes = processDataMapping(currentEdges, currentNodes);
                    const hasChanges = updatedNodes.some((node: any, index: number) => node !== currentNodes[index]);
                    return hasChanges ? updatedNodes : currentNodes;
                });
            }, 50);
        }
    }, [edges, setNodes]);

    return {
        onConnect,
        handleEdgesChange
    };
};
