
import { Node, Edge } from '@xyflow/react';
import { MappingConfiguration, ExecutionMappingConfig } from '../types/MappingTypes';
import { importSourceNode, importTargetNode, importTransformNode, importMappingNode } from './NodeImporter';
import { importEdge } from './EdgeImporter';
import { convertExecutionConfigToNodes } from './ExecutionConfigConverter';

export const importConfiguration = (config: MappingConfiguration | ExecutionMappingConfig): { nodes: Node[], edges: Edge[] } => {
  console.log('=== IMPORTING CONFIGURATION ===');
  console.log('Config type:', 'nodes' in config ? 'MappingConfiguration' : 'ExecutionMappingConfig');
  
  try {
    if ('nodes' in config) {
      // Handle MappingConfiguration format
      const mappingConfig = config as MappingConfiguration;
      console.log('Importing MappingConfiguration with nodes structure');
      
      const nodes: Node[] = [];
      const edges: Edge[] = [];
      
      // Import nodes with array configurations if available
      const arrayConfigs = ('arrays' in mappingConfig && Array.isArray(mappingConfig.arrays)) ? mappingConfig.arrays : undefined;
      
      // Import source nodes
      mappingConfig.nodes.sources.forEach(sourceConfig => {
        nodes.push(importSourceNode(sourceConfig));
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
      
      // Import connections
      mappingConfig.connections.forEach(connectionConfig => {
        edges.push(importEdge(connectionConfig));
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
