
import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

/**
 * Centralized hook for syncing node internal state with React Flow's node data
 * This ensures immediate updates in the pipeline and proper cleanup on disconnection
 */
export const useNodeDataSync = <T extends Record<string, any>>(
  nodeId: string,
  data: T,
  dependencies: any[] = [],
  onDataChange?: () => void
) => {
  const { setNodes } = useReactFlow();

  useEffect(() => {
    console.log(`SYNC ${nodeId} - Updating with data:`, data);
    setNodes(nodes =>
      nodes.map(node => {
        if (node.id === nodeId) {
          const updatedNode = { ...node, data: { ...node.data, ...data } };
          console.log(`SYNC ${nodeId} - Node updated, new data:`, updatedNode.data);
          return updatedNode;
        }
        return node;
      })
    );
    
    // Notify parent of data change for manual updates
    if (onDataChange) {
      onDataChange();
    }
  }, [nodeId, setNodes, onDataChange, ...dependencies]);
};
