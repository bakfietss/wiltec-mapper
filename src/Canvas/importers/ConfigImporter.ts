
import { Node, Edge } from '@xyflow/react';
import { MappingConfiguration } from '../types/MappingTypes';
import { importSourceNodes, importTargetNodes, importMappingNodes } from './NodeImporter';
import { importTransformNodes } from './TransformImporter';
import { importEdges } from './EdgeImporter';

export const importMappingConfiguration = (
  config: MappingConfiguration
): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  
  // Import all node types
  nodes.push(...importSourceNodes(config.nodes.sources));
  nodes.push(...importTargetNodes(config.nodes.targets));
  nodes.push(...importTransformNodes(config.nodes.transforms));
  nodes.push(...importMappingNodes(config.nodes.mappings));
  
  // Import edges
  const edges = importEdges(config.connections);

  console.log('Import completed:', { 
    nodesCount: nodes.length, 
    edgesCount: edges.length,
    sourceNodes: nodes.filter(n => n.type === 'source').map(n => ({ 
      id: n.id, 
      fields: (n.data?.fields && Array.isArray(n.data.fields)) ? n.data.fields.length : 0,
      sampleData: (n.data?.data && Array.isArray(n.data.data)) ? n.data.data.length : 0
    }))
  });

  return { nodes, edges };
};
