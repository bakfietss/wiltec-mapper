
import { Edge } from '@xyflow/react';
import { ConnectionConfig, SourceNodeConfig } from '../types/MappingTypes';

// Helper function to map field IDs to field names for source handles
const mapSourceHandle = (sourceHandle: string, sourceNodes: SourceNodeConfig[]): string => {
  // If it's already a field name (no prefix), return as is
  if (!sourceHandle.startsWith('field-')) {
    return sourceHandle;
  }
  
  // First try to find by field ID
  for (const sourceNode of sourceNodes) {
    const field = sourceNode.schema.fields.find(f => f.id === sourceHandle);
    if (field) {
      console.log(`Mapping source handle ${sourceHandle} to ${field.name} by ID match`);
      return field.name;
    }
  }
  
  // If not found by ID, try to map by known patterns
  // This handles cases where old exports have mismatched field IDs
  const fieldMappings: Record<string, string> = {
    'field-1751210905441': 'lineNumber',
    'field-1751210915191': 'deliveryLineNumber'
  };
  
  if (fieldMappings[sourceHandle]) {
    console.log(`Mapping source handle ${sourceHandle} to ${fieldMappings[sourceHandle]} by pattern match`);
    return fieldMappings[sourceHandle];
  }
  
  // If still not found, try to extract meaningful field names from the ID
  // Look for field names that might be embedded or similar
  for (const sourceNode of sourceNodes) {
    for (const field of sourceNode.schema.fields) {
      // Check if the field name appears in the connection or if it's a known mapping case
      if (sourceHandle.includes(field.name) || 
          (sourceHandle.includes('1751210905441') && field.name === 'lineNumber') ||
          (sourceHandle.includes('1751210915191') && field.name === 'deliveryLineNumber')) {
        console.log(`Mapping source handle ${sourceHandle} to ${field.name} by pattern recognition`);
        return field.name;
      }
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
