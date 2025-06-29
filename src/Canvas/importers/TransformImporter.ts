
import { Node } from '@xyflow/react';
import { MappingConfiguration } from '../types/MappingTypes';

export const importTransformNodes = (transforms: MappingConfiguration['nodes']['transforms']): Node[] => {
  return transforms.map(transform => {
    console.log('Importing transform node:', transform.id, 'type:', transform.type);
    
    const baseNode = {
      id: transform.id,
      type: transform.type,
      position: transform.position,
      data: {
        label: transform.label,
        transformType: transform.transformType
      }
    };

    // Handle different transform types
    if (transform.type === 'ifThen') {
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          operator: transform.nodeData?.operator || '=',
          compareValue: transform.nodeData?.compareValue || '',
          thenValue: transform.nodeData?.thenValue || '',
          elseValue: transform.nodeData?.elseValue || ''
        }
      };
    } else if (transform.type === 'staticValue') {
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          values: transform.nodeData?.values || []
        }
      };
    } else if (transform.type === 'splitterTransform') {
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          delimiter: transform.nodeData?.delimiter || ',',
          splitIndex: transform.nodeData?.splitIndex || 0,
          config: transform.nodeData?.config || {}
        }
      };
    } else if (transform.type === 'concatTransform' || transform.transformType === 'concat') {
      console.log('Importing concat transform:', transform.id);
      console.log('Transform nodeData:', transform.nodeData);
      console.log('Transform config:', transform.config);
      
      // Extract rules and delimiter from multiple possible locations
      const rules = transform.nodeData?.rules || 
                   transform.config?.parameters?.rules || 
                   transform.config?.rules || 
                   [];
      
      const delimiter = transform.nodeData?.delimiter || 
                       transform.config?.parameters?.delimiter || 
                       (transform.config as any)?.delimiter || 
                       ',';

      // Also extract input values if they exist
      const inputValues = transform.nodeData?.inputValues || {};
      
      console.log('Extracted rules:', rules);
      console.log('Extracted delimiter:', delimiter);
      console.log('Extracted inputValues:', inputValues);
      
      return {
        ...baseNode,
        type: 'concatTransform', // Ensure we use the correct type for concat
        data: {
          ...baseNode.data,
          transformType: 'concat',
          rules: rules,
          delimiter: delimiter,
          outputType: transform.nodeData?.outputType || 'value',
          inputValues: inputValues,
          config: {
            rules: rules,
            delimiter: delimiter,
            parameters: {
              rules: rules,
              delimiter: delimiter,
              outputType: transform.nodeData?.outputType || 'value'
            },
            ...transform.config
          }
        }
      };
    } else if (transform.type === 'coalesceTransform' || transform.transformType === 'coalesce') {
      console.log('Importing coalesce transform:', transform.id);
      console.log('Transform nodeData:', transform.nodeData);
      console.log('Transform config:', transform.config);
      
      // Extract rules from multiple possible locations with proper precedence
      const rules = transform.nodeData?.rules || 
                   transform.config?.parameters?.rules || 
                   transform.config?.rules || 
                   [];
      
      const defaultValue = transform.nodeData?.defaultValue || 
                          transform.config?.parameters?.defaultValue || 
                          transform.config?.defaultValue || 
                          '';

      // Also extract input values if they exist
      const inputValues = transform.nodeData?.inputValues || {};
      
      console.log('Extracted rules:', rules);
      console.log('Extracted defaultValue:', defaultValue);
      console.log('Extracted inputValues:', inputValues);
      
      return {
        ...baseNode,
        type: 'transform', // Ensure we use the correct type for coalesce
        data: {
          ...baseNode.data,
          transformType: 'coalesce',
          rules: rules,
          defaultValue: defaultValue,
          outputType: transform.nodeData?.outputType || 'value',
          inputValues: inputValues,
          config: {
            rules: rules,
            defaultValue: defaultValue,
            parameters: {
              rules: rules,
              defaultValue: defaultValue,
              outputType: transform.nodeData?.outputType || 'value'
            },
            ...transform.config
          }
        }
      };
    } else {
      // Handle generic transform nodes
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          config: transform.config || {},
          ...(transform.nodeData || {})
        }
      };
    }
  });
};
