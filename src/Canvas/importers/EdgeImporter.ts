
import { Edge } from '@xyflow/react';
import { ConnectionConfig, SourceNodeConfig } from '../types/MappingTypes';

// Helper function to map field IDs to field names for source handles
const mapSourceHandle = (sourceHandle: string, sourceNodes: SourceNodeConfig[]): string => {
  // If it's already a field name (no prefix), return as is
  if (!sourceHandle.startsWith('field-')) {
    return sourceHandle;
  }
  
  // Find the source node and look up the field name by ID
  for (const sourceNode of sourceNodes) {
    const field = sourceNode.schema.fields.find(f => f.id === sourceHandle);
    if (field) {
      console.log(`Mapping source handle ${sourceHandle} to ${field.name}`);
      return field.name;
    }
  }
  
  // If not found, return the original handle
  console.warn(`Could not map source handle: ${sourceHandle}`);
  return sourceHandle;
};

export const importEdge = (connectionConfig: ConnectionConfig, sourceNodes: SourceNodeConfig[] = []): Edge => {
  // Map the source handle if it's from a source node
  const mappedSourceHandle = connectionConfig.sourceHandle ? 
    mapSourceHandle(connectionConfig.sourceHandle, sourceNodes) : 
    undefined;
  
  console.log(`Importing edge: ${connectionConfig.sourceHandle} -> ${mappedSourceHandle}`);
  
  return {
    id: connectionConfig.id,
    source: connectionConfig.sourceNodeId,
    target: connectionConfig.targetNodeId,
    sourceHandle: mappedSourceHandle,
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

export const importEdges = (connections: ConnectionConfig[], sourceNodes: SourceNodeConfig[] = []): Edge[] => {
  return connections.map(conn => importEdge(conn, sourceNodes));
};
