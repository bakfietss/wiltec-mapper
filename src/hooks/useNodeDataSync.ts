
import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

/**
 * Centralized hook for syncing node internal state with React Flow's node data
 * This ensures immediate updates in the pipeline and proper cleanup on disconnection
 */
export const useNodeDataSync = <T extends Record<string, any>>(
  nodeId: string,
  data: T,
  dependencies: any[] = []
) => {
  const { setNodes } = useReactFlow();

  useEffect(() => {
    setNodes(nodes =>
      nodes.map(node =>
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    );
  }, [nodeId, setNodes, ...dependencies]);
};
