
import { Node } from '@xyflow/react';
import { MappingConfiguration } from '../types/MappingTypes';

export const importSourceNodes = (sources: MappingConfiguration['nodes']['sources']): Node[] => {
  return sources.map(src => ({
    id: src.id,
    type: 'source',
    position: src.position,
    data: {
      label: src.label,
      fields: src.schema?.fields || [],
      data: src.sampleData || [],
      schemaType: 'source'
    }
  }));
};

export const importTargetNodes = (targets: MappingConfiguration['nodes']['targets']): Node[] => {
  return targets.map(tgt => {
    const nodeData: any = {
      label: tgt.label,
      fields: tgt.schema?.fields || [],
      data: tgt.outputData ?? [],
      schemaType: 'target'
    };
    if ((tgt as any).fieldValues) {
      nodeData.fieldValues = (tgt as any).fieldValues;
    }
    return {
      id: tgt.id,
      type: 'target',
      position: tgt.position,
      data: nodeData
    };
  });
};

export const importMappingNodes = (mappings: MappingConfiguration['nodes']['mappings']): Node[] => {
  return mappings.map(mp => ({
    id: mp.id,
    type: 'conversionMapping',
    position: mp.position,
    data: {
      label: mp.label,
      mappings: mp.mappings,
      isExpanded: false
    }
  }));
};
