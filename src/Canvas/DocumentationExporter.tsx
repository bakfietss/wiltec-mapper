
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
}

interface TransformationDoc {
  id: string;
  type: string;
  description: string;
  rules?: any;
  configuration?: any;
}

const analyzeMapping = (nodes: Node[], edges: Edge[]): DocumentationConfig => {
  const sourceNodes = nodes.filter(node => node.type === 'source');
  const targetNodes = nodes.filter(node => node.type === 'target');
  const transformNodes = nodes.filter(node => 
    ['transform', 'splitterTransform', 'ifThen', 'staticValue', 'conversionMapping'].includes(node.type || '')
  );

  // Get used source fields by analyzing edges
  const getUsedSourceFields = (sourceNodeId: string): string[] => {
    const usedFields: string[] = [];
    edges.forEach(edge => {
      if (edge.source === sourceNodeId && edge.sourceHandle) {
        const sourceNode = nodes.find(n => n.id === sourceNodeId);
        if (sourceNode?.data?.fields) {
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
    nodeName: node.data?.label || 'Unnamed Source',
    fields: (node.data?.fields || []).map((field: any) => ({
      name: field.name,
      type: field.type,
      children: field.children || []
    })),
    usedFields: getUsedSourceFields(node.id)
  }));

  // Extract target schemas
  const targetSchemas: TargetSchemaDoc[] = targetNodes.map(node => ({
    nodeName: node.data?.label || 'Unnamed Target',
    fields: (node.data?.fields || []).map((field: any) => ({
      name: field.name,
      type: field.type,
      children: field.children || []
    }))
  }));

  // Extract transformations
  const transformations: TransformationDoc[] = transformNodes.map(node => {
    let description = '';
    let rules: any = {};
    let configuration: any = {};

    switch (node.type) {
      case 'ifThen':
        description = `IF-THEN conditional logic: IF field ${node.data?.operator || '='} "${node.data?.compareValue || ''}" THEN "${node.data?.thenValue || ''}" ELSE "${node.data?.elseValue || ''}"`;
        rules = {
          operator: node.data?.operator,
          compareValue: node.data?.compareValue,
          thenValue: node.data?.thenValue,
          elseValue: node.data?.elseValue
        };
        break;
      case 'staticValue':
        description = `Static value assignment with ${(node.data?.values || []).length} predefined values`;
        configuration = {
          values: node.data?.values || []
        };
        break;
      case 'splitterTransform':
        description = `Text splitting using delimiter "${node.data?.delimiter || ','}" at index ${node.data?.splitIndex || 0}`;
        configuration = {
          delimiter: node.data?.delimiter,
          splitIndex: node.data?.splitIndex
        };
        break;
      case 'conversionMapping':
        description = `Value conversion mapping with ${(node.data?.mappings || []).length} rules`;
        rules = {
          mappings: node.data?.mappings || []
        };
        break;
      case 'transform':
        description = `Generic transformation: ${node.data?.transformType || 'Unknown'}`;
        configuration = node.data?.config || {};
        break;
      default:
        description = `${node.type} transformation`;
    }

    return {
      id: node.id,
      type: node.type || 'unknown',
      description,
      rules,
      configuration
    };
  });

  // Extract mapping rules
  const mappingRules: MappingRuleDoc[] = [];
  
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode && targetNode) {
      // Get field names
      const getFieldName = (node: Node, handleId: string | null) => {
        if (!handleId) return 'Unknown';
        const field = node.data?.fields?.find((f: any) => f.id === handleId);
        return field?.name || handleId;
      };

      const sourceFieldName = getFieldName(sourceNode, edge.sourceHandle);
      const targetFieldName = getFieldName(targetNode, edge.targetHandle);

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
              sourceNode: sourceNode.data?.label || 'Unnamed Source',
              targetField: finalTargetFieldName,
              targetNode: finalTarget.data?.label || 'Unnamed Target',
              mappingType: targetNode.type === 'staticValue' ? 'static' : 
                          ['ifThen'].includes(targetNode.type || '') ? 'conditional' : 'transformed',
              transformationId: targetNode.id
            });
          }
        });
      } else {
        mappingRules.push({
          sourceField: sourceFieldName,
          sourceNode: sourceNode.data?.label || 'Unnamed Source',
          targetField: targetFieldName,
          targetNode: targetNode.data?.label || 'Unnamed Target',
          mappingType,
          transformationId
        });
      }
    }
  });

  return {
    name: 'Mapping Documentation',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    description: 'Generated mapping documentation',
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

  // Mapping Rules
  lines.push('## Mapping Rules');
  lines.push('');
  lines.push('| Source | Source Field | Target | Target Field | Type | Transformation |');
  lines.push('|--------|--------------|--------|--------------|------|----------------|');
  config.mappingRules.forEach(rule => {
    const transformationRef = rule.transformationId ? 
      `[${rule.mappingType}](#${rule.transformationId})` : rule.mappingType;
    lines.push(`| ${rule.sourceNode} | ${rule.sourceField} | ${rule.targetNode} | ${rule.targetField} | ${rule.mappingType} | ${transformationRef} |`);
  });
  lines.push('');

  // Transformations
  if (config.transformations.length > 0) {
    lines.push('## Transformations');
    lines.push('');
    config.transformations.forEach(transform => {
      lines.push(`### ${transform.id}`);
      lines.push('');
      lines.push(`**Type:** ${transform.type}`);
      lines.push(`**Description:** ${transform.description}`);
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
  
  console.log('Documentation exported:', config);
};
