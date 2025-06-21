
import { Node, Edge } from '@xyflow/react';
import { MappingConfiguration } from '../types/MappingTypes';

export const importMappingConfiguration = (
  config: MappingConfiguration
): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  console.log('Starting import with config:', config);

  // 1. Sources
  config.nodes.sources.forEach(src => {
    nodes.push({
      id: src.id,
      type: 'source',
      position: src.position,
      data: {
        label: src.label,
        fields: src.schema.fields,
        data: src.sampleData,
        schemaType: 'source'
      }
    });
  });

  // 2. Targets
  config.nodes.targets.forEach(tgt => {
    const nodeData: any = {
      label: tgt.label,
      fields: tgt.schema.fields,
      data: tgt.outputData ?? [],
      schemaType: 'target'
    };
    if ((tgt as any).fieldValues) {
      nodeData.fieldValues = (tgt as any).fieldValues;
    }
    nodes.push({
      id: tgt.id,
      type: 'target',
      position: tgt.position,
      data: nodeData
    });
  });

  // 3. Transforms
  config.nodes.transforms.forEach(tx => {
    if (tx.transformType === 'coalesce') {
      // Extract rules and defaultValue from config
      const rules = tx.config?.rules || [];
      const defaultValue = tx.config?.defaultValue || '';

      console.log('Importing coalesce node - extracted rules:', rules);
      console.log('Importing coalesce node - extracted defaultValue:', defaultValue);

      nodes.push({
        id: tx.id,
        type: 'transform',
        position: tx.position,
        data: {
          label: tx.label,
          transformType: 'coalesce',
          rules,
          defaultValue,
          inputValues: {}
        }
      });

    } else if (tx.transformType === 'ifThen' || tx.transformType === 'IF THEN') {
      const params = (tx.config?.parameters as any) ?? {};
      const nodeData = {
        label: tx.label,
        operator: params.operator ?? '=',
        compareValue: params.compareValue ?? '',
        thenValue: params.thenValue ?? '',
        elseValue: params.elseValue ?? ''
      };
      nodes.push({
        id: tx.id,
        type: 'ifThen',
        position: tx.position,
        data: nodeData
      });

    } else if (tx.transformType === 'staticValue' || tx.transformType === 'Static Value') {
      const params = (tx.config?.parameters as any) ?? {};
      const nodeData: any = {
        label: tx.label,
        values: params.values ?? []
      };
      nodes.push({
        id: tx.id,
        type: 'staticValue',
        position: tx.position,
        data: nodeData
      });

    } else if (tx.transformType === 'splitterTransform' || tx.transformType === 'Text Splitter') {
      const params = (tx.config?.parameters as any) ?? {};
      const nodeData: any = {
        label: tx.label,
        delimiter: params.delimiter ?? ',',
        splitIndex: params.splitIndex ?? 0,
        config: tx.config
      };
      nodes.push({
        id: tx.id,
        type: 'splitterTransform',
        position: tx.position,
        data: nodeData
      });

    } else {
      nodes.push({
        id: tx.id,
        type: 'transform',
        position: tx.position,
        data: {
          label: tx.label,
          transformType: tx.transformType,
          config: tx.config
        }
      });
    }
  });

  // 4. Conversion Mappings
  config.nodes.mappings.forEach(mp => {
    nodes.push({
      id: mp.id,
      type: 'conversionMapping',
      position: mp.position,
      data: {
        label: mp.label,
        mappings: mp.mappings,
        isExpanded: false
      }
    });
  });

  // 5. Connections
  config.connections.forEach(conn => {
    const src = nodes.find(n => n.id === conn.sourceNodeId);
    const tgt = nodes.find(n => n.id === conn.targetNodeId);
    
    console.log('Importing connection:', conn.id, 'from', conn.sourceNodeId, 'to', conn.targetNodeId);
    
    if (src && tgt) {
      edges.push({
        id: conn.id,
        source: conn.sourceNodeId,
        target: conn.targetNodeId,
        sourceHandle: conn.sourceHandle || undefined,
        targetHandle: conn.targetHandle || undefined,
        type: 'smoothstep',
        animated: true,
        style: { strokeWidth: 2, stroke: '#3b82f6' }
      });
      
      console.log('Added edge:', conn.id);
    } else {
      console.warn('Skipping edge - source or target node not found:', conn);
    }
  });

  console.log(`Import complete: ${nodes.length} nodes, ${edges.length} edges`);
  return { nodes, edges };
};
