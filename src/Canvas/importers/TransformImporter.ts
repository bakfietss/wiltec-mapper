
import { Node } from '@xyflow/react';
import { TransformNodeConfig } from '../types/MappingTypes';

export const importTransformNodes = (transforms: TransformNodeConfig[]): Node[] => {
  return transforms.map(tx => {
    console.log('Processing transform:', tx.id, 'transformType:', tx.transformType);
    
    if (tx.transformType === 'coalesce') {
      console.log('FOUND COALESCE TRANSFORM:', tx.id);
      
      let rules: any[] = [];
      
      if ((tx as any).nodeData && typeof (tx as any).nodeData === 'object') {
        const nodeData = (tx as any).nodeData;
        if (Array.isArray(nodeData.rules)) {
          rules = nodeData.rules;
        }
      }
      
      if (rules.length === 0 && tx.config && typeof tx.config === 'object') {
        const configObj = tx.config as any;
        if (configObj.parameters && typeof configObj.parameters === 'object') {
          if (Array.isArray(configObj.parameters.rules)) {
            rules = configObj.parameters.rules;
          }
        }
      }
      
      console.log('Extracted rules for coalesce:', rules);
      
      return {
        id: tx.id,
        type: 'transform',
        position: tx.position,
        data: {
          label: tx.label,
          transformType: 'coalesce',
          config: {
            rules: rules,
            defaultValue: ''
          }
        }
      };
    } else if (tx.transformType === 'ifThen' || tx.transformType === 'IF THEN') {
      const rawConfig = (tx.config ?? {}) as any;
      const params = (rawConfig.parameters && typeof rawConfig.parameters === 'object')
        ? rawConfig.parameters
        : rawConfig;
      
      return {
        id: tx.id,
        type: 'ifThen',
        position: tx.position,
        data: {
          label: tx.label,
          operator: params.operator ?? '=',
          compareValue: params.compareValue ?? '',
          thenValue: params.thenValue ?? '',
          elseValue: params.elseValue ?? ''
        }
      };
    } else if (tx.transformType === 'staticValue' || tx.transformType === 'Static Value') {
      const rawConfig = (tx.config ?? {}) as any;
      const params = (rawConfig.parameters && typeof rawConfig.parameters === 'object')
        ? rawConfig.parameters
        : rawConfig;
      
      return {
        id: tx.id,
        type: 'staticValue',
        position: tx.position,
        data: {
          label: tx.label,
          values: params.values ?? []
        }
      };
    } else if (tx.transformType === 'splitterTransform' || tx.transformType === 'Text Splitter') {
      const rawConfig = (tx.config ?? {}) as any;
      const params = (rawConfig.parameters && typeof rawConfig.parameters === 'object')
        ? rawConfig.parameters
        : rawConfig;
      
      return {
        id: tx.id,
        type: 'splitterTransform',
        position: tx.position,
        data: {
          label: tx.label,
          delimiter: params.delimiter ?? ',',
          splitIndex: params.splitIndex ?? 0,
          config: tx.config
        }
      };
    } else {
      return {
        id: tx.id,
        type: 'transform',
        position: tx.position,
        data: {
          label: tx.label,
          transformType: tx.transformType,
          config: tx.config
        }
      };
    }
  });
};
