
import { Edge } from '@xyflow/react';
import { MappingConfiguration } from '../types/MappingTypes';

export const importEdges = (connections: MappingConfiguration['connections']): Edge[] => {
  return connections.map(conn => ({
    id: conn.id,
    source: conn.sourceNodeId,
    target: conn.targetNodeId,
    sourceHandle: conn.sourceHandle || undefined,
    targetHandle: conn.targetHandle || undefined,
    type: 'smoothstep',
    animated: true,
    style: { 
      strokeWidth: 2, 
      stroke: '#3b82f6',
      strokeDasharray: '5,5'
    }
  }));
};
