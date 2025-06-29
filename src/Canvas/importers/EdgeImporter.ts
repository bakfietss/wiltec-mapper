
import { Edge } from '@xyflow/react';
import { ConnectionConfig } from '../types/MappingTypes';

export const importEdge = (connectionConfig: ConnectionConfig): Edge => {
  return {
    id: connectionConfig.id,
    source: connectionConfig.sourceNodeId,
    target: connectionConfig.targetNodeId,
    sourceHandle: connectionConfig.sourceHandle || undefined,
    targetHandle: connectionConfig.targetHandle || undefined,
    type: 'smoothstep',
    animated: true,
    style: { 
      strokeWidth: 2, 
      stroke: '#3b82f6',
      strokeDasharray: '5,5'
    }
  };
};

export const importEdges = (connections: ConnectionConfig[]): Edge[] => {
  return connections.map(conn => importEdge(conn));
};
