
import { Node, Edge } from '@xyflow/react';
import { MappingConfiguration, ExecutionMappingConfig } from '../types/MappingTypes';
import { importSourceNode, importTargetNode, importTransformNode, importMappingNode } from './NodeImporter';
import { importEdge } from './EdgeImporter';
import { convertExecutionConfigToNodes } from './ExecutionConfigConverter';

export const importConfiguration = (config: MappingConfiguration | ExecutionMappingConfig | any): { nodes: Node[], edges: Edge[] } => {
  console.log('=== IMPORTING CONFIGURATION ===');
  console.log('Config input:', config);
  console.log('Config keys:', Object.keys(config || {}));
  
  try {
    // Handle direct ReactFlow format (from database ui_config)
    if (Array.isArray(config?.nodes) && Array.isArray(config?.edges)) {
      console.log('Importing direct ReactFlow format from database');
      
      const nodes = config.nodes;
      const edges = config.edges;
      
      // Auto-expansion logic for source nodes based on their connections
      const sourceFieldsToExpand = new Map<string, Set<string>>();
      
      // Analyze edges to determine which source fields need expansion
      edges.forEach((edge: any) => {
        if (edge.sourceHandle) {
          const sourceNodeId = edge.source;
          if (!sourceFieldsToExpand.has(sourceNodeId)) {
            sourceFieldsToExpand.set(sourceNodeId, new Set());
          }
          
          const fieldPath = edge.sourceHandle;
          const pathParts = fieldPath.split('.');
          
          // Build parent paths for expansion
          for (let i = 0; i < pathParts.length - 1; i++) {
            const parentPath = pathParts.slice(0, i + 1).join('.');
            // Remove array indices to get clean field names
            const cleanPath = parentPath.replace(/\[.*?\]/g, '');
            if (cleanPath) {
              sourceFieldsToExpand.get(sourceNodeId)!.add(cleanPath);
            }
          }
        }
      });
      
      // Apply auto-expansion to source nodes
      const enhancedNodes = nodes.map((node: any) => {
        if (node.type === 'source' && sourceFieldsToExpand.has(node.id)) {
          const fieldsToExpand = sourceFieldsToExpand.get(node.id)!;
          return {
            ...node,
            data: {
              ...node.data,
              initialExpandedFields: fieldsToExpand
            }
          };
        }
        return node;
      });
      
      console.log(`Imported ${enhancedNodes.length} nodes and ${edges.length} edges from ReactFlow format`);
      return { nodes: enhancedNodes, edges };
    }
    
    // Handle MappingConfiguration format (from files)
    else if (config?.nodes && typeof config.nodes === 'object' && !Array.isArray(config.nodes)) {
      // Handle MappingConfiguration format
      const mappingConfig = config as MappingConfiguration;
      console.log('Importing MappingConfiguration with nodes structure');
      
      const nodes: Node[] = [];
      const edges: Edge[] = [];
      
      // Import nodes with array configurations if available
      const arrayConfigs = ('arrays' in mappingConfig && Array.isArray(mappingConfig.arrays)) ? mappingConfig.arrays : undefined;
      
      // Import source nodes with connections for auto-expansion
      mappingConfig.nodes.sources.forEach(sourceConfig => {
        nodes.push(importSourceNode(sourceConfig, mappingConfig.connections));
      });
      
      // Import target nodes with groupBy information
      mappingConfig.nodes.targets.forEach(targetConfig => {
        nodes.push(importTargetNode(targetConfig, arrayConfigs));
      });
      
      // Import transform nodes
      mappingConfig.nodes.transforms.forEach(transformConfig => {
        nodes.push(importTransformNode(transformConfig));
      });
      
      // Import mapping nodes
      mappingConfig.nodes.mappings.forEach(mappingConfig => {
        nodes.push(importMappingNode(mappingConfig));
      });
      
      // Import connections with source node context for handle mapping
      mappingConfig.connections.forEach(connectionConfig => {
        edges.push(importEdge(connectionConfig, mappingConfig.nodes.sources));
      });
      
      console.log(`Imported ${nodes.length} nodes and ${edges.length} edges from MappingConfiguration`);
      return { nodes, edges };
      
    } else {
      // Handle ExecutionMappingConfig format  
      const executionConfig = config as ExecutionMappingConfig;
      console.log('Converting ExecutionMappingConfig to visual format');
      
      // This is a simplified conversion - you might want to enhance this
      // to better reconstruct the visual representation from execution config
      return convertExecutionConfigToNodes(executionConfig);
    }
    
  } catch (error) {
    console.error('Error importing configuration:', error);
    throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
