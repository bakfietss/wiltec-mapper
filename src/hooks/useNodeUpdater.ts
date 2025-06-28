
import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

export const useNodeUpdater = (nodeId: string) => {
    const { setNodes } = useReactFlow();

    const updateNodeData = useCallback((updates: Record<string, any>) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === nodeId
                    ? {
                        ...node,
                        data: {
                            ...node.data,
                            ...updates,
                        },
                    }
                    : node
            )
        );
    }, [nodeId, setNodes]);

    const updateNodeConfig = useCallback((configUpdates: Record<string, any>) => {
        setNodes((nodes) =>
            nodes.map((node) =>
                node.id === nodeId
                    ? {
                        ...node,
                        data: {
                            ...node.data,
                            config: {
                                ...node.data.config,
                                ...configUpdates,
                            },
                        },
                    }
                    : node
            )
        );
    }, [nodeId, setNodes]);

    return {
        updateNodeData,
        updateNodeConfig
    };
};
