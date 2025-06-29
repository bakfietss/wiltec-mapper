
import { Node, Edge } from '@xyflow/react';

export interface MappingConfiguration {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  nodes: {
    sources: SourceNodeConfig[];
    targets: TargetNodeConfig[];
    transforms: TransformNodeConfig[];
    mappings: MappingNodeConfig[];
  };
  connections: ConnectionConfig[];
  execution: {
    steps: ExecutionStep[];
  };
  metadata?: {
    description?: string;
    tags?: string[];
    author?: string;
  };
}

export interface ExecutionMapping {
  from: string | null;
  to: string;
  type: 'direct' | 'static' | 'ifThen' | 'map' | 'split' | 'transform';
  value?: any;
  if?: {
    operator: string;
    value: string;
  };
  then?: string;
  else?: string;
  map?: Record<string, string>;
  defaultValue?: string; // Add default value for unmapped cases
  split?: {
    delimiter: string;
    index: number;
  };
  transform?: {
    type: string;
    operation?: string;
    parameters?: {
      sources?: string[];
      rules?: Array<{
        id: string;
        priority: number;
        outputValue: string;
        sourceField?: string; // Add source field info to rules
        sourceHandle?: string; // Add source handle info to rules
      }>;
      defaultValue?: string;
    };
    end?: number;
    start?: number;
  };
}

export interface ArrayMappingStructure {
  target: string;
  groupBy?: string; // Make groupBy explicitly optional but supported
  mappings: ExecutionMapping[];
  arrays?: ArrayMappingStructure[];
}

export interface ExecutionMappingConfig {
  name: string;
  version: string;
  mappings: ExecutionMapping[];
  arrays?: ArrayMappingStructure[];
  metadata?: {
    description?: string;
    tags?: string[];
    author?: string;
  };
}

export interface ExecutionStep {
  stepId: string;
  type: 'direct_mapping' | 'transform' | 'conversion_mapping';
  source: {
    nodeId: string;
    fieldId: string;
    fieldName: string;
    value?: any;
  };
  target: {
    nodeId: string;
    fieldId: string;
    fieldName: string;
  };
  transform?: {
    type: string;
    operation?: string;
    parameters?: Record<string, any>;
    expression?: string;
  };
  conversion?: {
    rules: Array<{
      from: string;
      to: string;
      transformation?: string;
    }>;
  };
}

export interface SourceNodeConfig {
  id: string;
  type: 'source';
  label: string;
  position: { x: number; y: number };
  schema: {
    fields: SchemaField[];
  };
  sampleData: any[];
}

export interface TargetNodeConfig {
  id: string;
  type: 'target';
  label: string;
  position: { x: number; y: number };
  schema: {
    fields: SchemaField[];
  };
  outputData?: any[];
}

export interface TransformNodeConfig {
  id: string;
  type: 'transform' | 'splitterTransform' | 'ifThen' | 'staticValue' | 'coalesceTransform' | 'concatTransform';
  label: string;
  position: { x: number; y: number };
  transformType: string;
  config: {
    operation?: string;
    parameters?: Record<string, any>;
    expression?: string;
    // Add delimiter support for concat transforms
    delimiter?: string;
    // Coalesce-specific properties
    rules?: Array<{
      id: string;
      priority: number;
      outputValue: string;
      sourceField?: string;
      sourceHandle?: string;
    }>;
    defaultValue?: string;
  };
  // Add nodeData property to match what the importer expects
  nodeData?: {
    rules?: Array<{
      id: string;
      priority: number;
      outputValue: string;
      sourceField?: string;
      sourceHandle?: string;
    }>;
    defaultValue?: string;
    outputType?: string;
    inputValues?: Record<string, any>;
    operator?: string;
    compareValue?: string;
    thenValue?: string;
    elseValue?: string;
    values?: any[];
    delimiter?: string;
    splitIndex?: number;
    config?: Record<string, any>;
  };
}

export interface MappingNodeConfig {
  id: string;
  type: 'mapping';
  label: string;
  position: { x: number; y: number };
  mappings: Array<{
    from: string;
    to: string;
    transformation?: string;
  }>;
}

export interface ConnectionConfig {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string;
  targetHandle: string;
  type: 'direct' | 'transform' | 'mapping';
}

export interface SchemaField {
  id: string;
  name: string;
  type: string;
  exampleValue?: any;
  children?: SchemaField[];
  // Add groupBy support for array fields
  groupBy?: string;
}
