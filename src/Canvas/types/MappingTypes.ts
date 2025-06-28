

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
    parameters?: Record<string, any>;
    end?: number;
    start?: number;
  };
  sourcePath?: string; // Added source path for better traceability
}

export interface ExecutionMappingConfig {
  name: string;
  version: string;
  mappings: ExecutionMapping[];
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
    sourcePath?: string; // Added source path for traceability
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
  type: 'transform' | 'splitterTransform' | 'ifThen' | 'staticValue' | 'coalesceTransform';
  label: string;
  position: { x: number; y: number };
  transformType: string;
  config: {
    operation?: string;
    parameters?: Record<string, any>;
    expression?: string;
    // Coalesce-specific properties
    rules?: Array<{
      id: string;
      priority: number;
      outputValue: string;
      sourcePath?: string; // Added source path for rules
    }>;
    defaultValue?: string;
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
    sourcePath?: string; // Added source path for mappings
  }>;
}

export interface ConnectionConfig {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string;
  targetHandle: string;
  type: 'direct' | 'transform' | 'mapping';
  sourcePath?: string; // Added source path for connections
}

export interface SchemaField {
  id: string;
  name: string;
  type: string;
  exampleValue?: any;
  children?: SchemaField[];
}

