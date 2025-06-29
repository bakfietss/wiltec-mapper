
import { Node, Edge } from '@xyflow/react';
import { ExecutionMappingConfig } from '../types/MappingTypes';

export const convertExecutionConfigToNodes = (executionConfig: ExecutionMappingConfig): { nodes: Node[], edges: Edge[] } => {
  console.log('Converting ExecutionMappingConfig to visual format');
  
  // This is a simplified conversion - creates basic nodes from execution config
  const nodes: Node[] = [
    {
      id: 'execution-source',
      type: 'source',
      position: { x: 100, y: 100 },
      data: {
        label: 'Execution Source',
        fields: [],
        data: []
      }
    },
    {
      id: 'execution-target',
      type: 'target',
      position: { x: 400, y: 100 },
      data: {
        label: 'Execution Target',
        fields: [],
        data: [],
        fieldValues: {}
      }
    }
  ];

  const edges: Edge[] = [];

  return { nodes, edges };
};
