import { Node, Edge } from '@xyflow/react';

export interface DocumentationConfig {
  name: string;
  version: string;
  createdAt: string;
  description?: string;
  sourceSchemas: SourceSchemaDoc[];
  mappingRules: MappingRuleDoc[];
  transformations: TransformationDoc[];
  targetSchemas: TargetSchemaDoc[];
}

interface SourceSchemaDoc {
  nodeName: string;
  fields: SchemaFieldDoc[];
  usedFields: string[];
}

interface TargetSchemaDoc {
  nodeName: string;
  fields: SchemaFieldDoc[];
}

interface SchemaFieldDoc {
  name: string;
  type: string;
  description?: string;
  children?: SchemaFieldDoc[];
}

interface MappingRuleDoc {
  sourceField: string;
  sourceNode: string;
  targetField: string;
  targetNode: string;
  mappingType: 'direct' | 'transformed' | 'static' | 'conditional';
  transformationId?: string;
  sourcePath?: string; // Added source path for better traceability
}

interface TransformationDoc {
  id: string;
  type: string;
  description: string;
  rules?: any;
  configuration?: any;
  inputSources?: string[]; // Added to track input source paths
}

const analyzeMapping = (nodes: Node[], edges: Edge[]): DocumentationConfig => {
  const sourceNodes = nodes.filter(node => node.type === 'source');
  const targetNodes = nodes.filter(node => node.type === 'target');
  const transformNodes = nodes.filter(node => 
    ['transform', 'splitterTransform', 'ifThen', 'staticValue', 'conversionMapping'].includes(node.type || '')
  );

  // Helper function to get source path from a node and handle
  const getSourcePath = (nodeId: string, handleId: string | null): string => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !handleId) return '';
    
    if (node.type === 'source') {
      const nodeData = node.data as any;
      const fields = nodeData?.fields;
      if (Array.isArray(fields)) {
        const field = fields.find((f: any) => f.id === handleId);
        return field?.name || '';
      }
    }
    return '';
  };

  // Get used source fields by analyzing edges
  const getUsedSourceFields = (sourceNodeId: string): string[] => {
    const usedFields: string[] = [];
    edges.forEach(edge => {
      if (edge.source === sourceNodeId && edge.sourceHandle) {
        const sourceNode = nodes.find(n => n.id === sourceNodeId);
        if (sourceNode?.data?.fields && Array.isArray(sourceNode.data.fields)) {
          const field = sourceNode.data.fields.find((f: any) => f.id === edge.sourceHandle);
          if (field?.name && !usedFields.includes(field.name)) {
            usedFields.push(field.name);
          }
        }
      }
    });
    return usedFields;
  };

  // Extract source schemas
  const sourceSchemas: SourceSchemaDoc[] = sourceNodes.map(node => ({
    nodeName: (node.data?.label as string) || 'Unnamed Source',
    fields: Array.isArray(node.data?.fields) ? (node.data.fields as any[]).map((field: any) => ({
      name: field.name || 'Unknown',
      type: field.type || 'string',
      children: field.children || []
    })) : [],
    usedFields: getUsedSourceFields(node.id)
  }));

  // Extract target schemas
  const targetSchemas: TargetSchemaDoc[] = targetNodes.map(node => ({
    nodeName: (node.data?.label as string) || 'Unnamed Target',
    fields: Array.isArray(node.data?.fields) ? (node.data.fields as any[]).map((field: any) => ({
      name: field.name || 'Unknown',
      type: field.type || 'string',
      children: field.children || []
    })) : []
  }));

  // Extract transformations with enhanced source path tracking
  const transformations: TransformationDoc[] = transformNodes.map(node => {
    let description = '';
    let rules: any = {};
    let configuration: any = {};
    let inputSources: string[] = [];

    // Find all input edges to this transform node
    const inputEdges = edges.filter(e => e.target === node.id);
    inputSources = inputEdges.map(edge => getSourcePath(edge.source, edge.sourceHandle)).filter(path => path);

    // Safely access node data properties
    const nodeData = node.data as any;
    const config = nodeData?.config || {};

    switch (node.type) {
      case 'ifThen':
        const inputSource = inputSources.length > 0 ? inputSources[0] : 'Unknown';
        description = `IF-THEN conditional logic on "${inputSource}": IF field ${nodeData?.operator || '='} "${nodeData?.compareValue || ''}" THEN "${nodeData?.thenValue || ''}" ELSE "${nodeData?.elseValue || ''}"`;
        rules = {
          operator: nodeData?.operator,
          compareValue: nodeData?.compareValue,
          thenValue: nodeData?.thenValue,
          elseValue: nodeData?.elseValue,
          sourcePath: inputSource
        };
        break;
      case 'staticValue':
        const values = Array.isArray(nodeData?.values) ? nodeData.values : [];
        description = `Static value assignment with ${values.length} predefined values`;
        configuration = {
          values: values
        };
        break;
      case 'splitterTransform':
        const splitSource = inputSources.length > 0 ? inputSources[0] : 'Unknown';
        description = `Text splitting of "${splitSource}" using delimiter "${nodeData?.delimiter || ','}" at index ${nodeData?.splitIndex || 0}`;
        configuration = {
          delimiter: nodeData?.delimiter,
          splitIndex: nodeData?.splitIndex,
          sourcePath: splitSource
        };
        break;
      case 'conversionMapping':
        const mappings = Array.isArray(nodeData?.mappings) ? nodeData.mappings : [];
        const conversionSource = inputSources.length > 0 ? inputSources[0] : 'Unknown';
        description = `Value conversion mapping on "${conversionSource}" with ${mappings.length} rules`;
        rules = {
          mappings: mappings,
          sourcePath: conversionSource
        };
        break;
      case 'transform':
        if (nodeData?.transformType === 'coalesce') {
          const coalesceRules = Array.isArray(config.rules) ? config.rules : [];
          const coalesceInputs = inputEdges.map((edge, index) => {
            const sourcePath = getSourcePath(edge.source, edge.sourceHandle);
            const rule = coalesceRules.find((r: any) => r.id === edge.targetHandle);
            return {
              priority: rule?.priority || index + 1,
              sourcePath: sourcePath,
              outputValue: rule?.outputValue || ''
            };
          });
          description = `Coalesce transformation with ${coalesceInputs.length} input sources: ${coalesceInputs.map(input => input.sourcePath).join(', ')}`;
          rules = {
            rules: coalesceInputs,
            defaultValue: config.defaultValue || ''
          };
        } else {
          const transformSource = inputSources.length > 0 ? inputSources[0] : 'Unknown';
          description = `${nodeData?.transformType || 'Generic'} transformation on "${transformSource}"`;
          configuration = {
            ...(config && typeof config === 'object' ? config : {}),
            sourcePath: transformSource
          };
        }
        break;
      default:
        description = `${node.type} transformation with inputs: ${inputSources.join(', ')}`;
    }

    return {
      id: node.id,
      type: node.type || 'unknown',
      description,
      rules,
      configuration,
      inputSources
    };
  });

  // Extract mapping rules with enhanced source path tracking
  const mappingRules: MappingRuleDoc[] = [];
  
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode && targetNode) {
      // Get field names
      const getFieldName = (node: Node, handleId: string | null) => {
        if (!handleId) return 'Unknown';
        if (Array.isArray(node.data?.fields)) {
          const field = node.data.fields.find((f: any) => f.id === handleId);
          return field?.name || handleId;
        }
        return handleId;
      };

      const sourceFieldName = getFieldName(sourceNode, edge.sourceHandle);
      const targetFieldName = getFieldName(targetNode, edge.targetHandle);
      const sourcePath = getSourcePath(edge.source, edge.sourceHandle);

      let mappingType: 'direct' | 'transformed' | 'static' | 'conditional' = 'direct';
      let transformationId: string | undefined;

      // Determine mapping type
      if (sourceNode.type === 'source' && targetNode.type === 'target') {
        mappingType = 'direct';
      } else if (['transform', 'splitterTransform', 'ifThen', 'conversionMapping'].includes(sourceNode.type || '')) {
        mappingType = 'transformed';
        transformationId = sourceNode.id;
      } else if (sourceNode.type === 'staticValue') {
        mappingType = 'static';
        transformationId = sourceNode.id;
      }

      // For transform nodes, trace back to original source
      if (targetNode.type !== 'target') {
        // This is a connection to a transform node, trace further
        const finalTargetEdges = edges.filter(e => e.source === targetNode.id);
        finalTargetEdges.forEach(finalEdge => {
          const finalTarget = nodes.find(n => n.id === finalEdge.target);
          if (finalTarget?.type === 'target') {
            const finalTargetFieldName = getFieldName(finalTarget, finalEdge.targetHandle);
            
            mappingRules.push({
              sourceField: sourceFieldName,
              sourceNode: (sourceNode.data?.label as string) || 'Unnamed Source',
              targetField: finalTargetFieldName,
              targetNode: (finalTarget.data?.label as string) || 'Unnamed Target',
              mappingType: targetNode.type === 'staticValue' ? 'static' : 
                          ['ifThen'].includes(targetNode.type || '') ? 'conditional' : 'transformed',
              transformationId: targetNode.id,
              sourcePath: sourcePath
            });
          }
        });
      } else {
        mappingRules.push({
          sourceField: sourceFieldName,
          sourceNode: (sourceNode.data?.label as string) || 'Unnamed Source',
          targetField: targetFieldName,
          targetNode: (targetNode.data?.label as string) || 'Unnamed Target',
          mappingType,
          transformationId,
          sourcePath: sourcePath
        });
      }
    }
  });

  return {
    name: 'Mapping Documentation',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    description: 'Generated mapping documentation with enhanced source path tracking',
    sourceSchemas,
    mappingRules,
    transformations,
    targetSchemas
  };
};

const generateMarkdownDocumentation = (config: DocumentationConfig): string => {
  const lines: string[] = [];
  
  // Header
  lines.push(`# ${config.name}`);
  lines.push('');
  lines.push(`**Version:** ${config.version}`);
  lines.push(`**Generated:** ${new Date(config.createdAt).toLocaleDateString()}`);
  if (config.description) {
    lines.push(`**Description:** ${config.description}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Table of Contents
  lines.push('## Table of Contents');
  lines.push('');
  lines.push('1. [Source Schemas](#source-schemas)');
  lines.push('2. [Target Schemas](#target-schemas)');
  lines.push('3. [Mapping Rules](#mapping-rules)');
  lines.push('4. [Transformations](#transformations)');
  lines.push('');

  // Source Schemas
  lines.push('## Source Schemas');
  lines.push('');
  config.sourceSchemas.forEach(schema => {
    lines.push(`### ${schema.nodeName}`);
    lines.push('');
    lines.push('**Available Fields:**');
    lines.push('');
    lines.push('| Field Name | Type | Used in Mapping |');
    lines.push('|------------|------|----------------|');
    schema.fields.forEach(field => {
      const isUsed = schema.usedFields.includes(field.name);
      lines.push(`| ${field.name} | ${field.type} | ${isUsed ? '✅' : '❌'} |`);
    });
    lines.push('');
  });

  // Target Schemas
  lines.push('## Target Schemas');
  lines.push('');
  config.targetSchemas.forEach(schema => {
    lines.push(`### ${schema.nodeName}`);
    lines.push('');
    lines.push('**Output Fields:**');
    lines.push('');
    lines.push('| Field Name | Type |');
    lines.push('|------------|------|');
    schema.fields.forEach(field => {
      lines.push(`| ${field.name} | ${field.type} |`);
    });
    lines.push('');
  });

  // Mapping Rules with enhanced source path information
  lines.push('## Mapping Rules');
  lines.push('');
  lines.push('| Source | Source Field | Source Path | Target | Target Field | Type | Transformation |');
  lines.push('|--------|--------------|-------------|--------|--------------|------|----------------|');
  config.mappingRules.forEach(rule => {
    const transformationRef = rule.transformationId ? 
      `[${rule.mappingType}](#${rule.transformationId})` : rule.mappingType;
    const sourcePath = rule.sourcePath || 'N/A';
    lines.push(`| ${rule.sourceNode} | ${rule.sourceField} | \`${sourcePath}\` | ${rule.targetNode} | ${rule.targetField} | ${rule.mappingType} | ${transformationRef} |`);
  });
  lines.push('');

  // Transformations with enhanced source information
  if (config.transformations.length > 0) {
    lines.push('## Transformations');
    lines.push('');
    config.transformations.forEach(transform => {
      lines.push(`### ${transform.id}`);
      lines.push('');
      lines.push(`**Type:** ${transform.type}`);
      lines.push(`**Description:** ${transform.description}`);
      if (transform.inputSources && transform.inputSources.length > 0) {
        lines.push(`**Input Sources:** ${transform.inputSources.map(src => `\`${src}\``).join(', ')}`);
      }
      lines.push('');
      
      if (Object.keys(transform.rules || {}).length > 0) {
        lines.push('**Rules:**');
        lines.push('```json');
        lines.push(JSON.stringify(transform.rules, null, 2));
        lines.push('```');
        lines.push('');
      }
      
      if (Object.keys(transform.configuration || {}).length > 0) {
        lines.push('**Configuration:**');
        lines.push('```json');
        lines.push(JSON.stringify(transform.configuration, null, 2));
        lines.push('```');
        lines.push('');
      }
    });
  }

  return lines.join('\n');
};

export const exportMappingDocumentation = (
  nodes: Node[],
  edges: Edge[],
  name: string = 'Mapping Documentation'
): void => {
  // Analyze the mapping
  const config = analyzeMapping(nodes, edges);
  config.name = name;
  
  // Generate markdown
  const markdown = generateMarkdownDocumentation(config);
  
  // Download the file
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_documentation.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  console.log('Enhanced documentation exported with source paths:', config);
};
