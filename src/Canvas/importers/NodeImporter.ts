
import { Node } from '@xyflow/react';
import { TargetNodeConfig, SourceNodeConfig, TransformNodeConfig, MappingNodeConfig, SchemaField } from '../types/MappingTypes';

// Helper function to reconstruct schema fields with groupBy information
const reconstructSchemaFields = (fields: SchemaField[], arrayConfigs?: any[]): SchemaField[] => {
  return fields.map(field => {
    const reconstructedField = { ...field };
    
    // If this is an array field, try to find its groupBy configuration
    if (field.type === 'array' && arrayConfigs) {
      const arrayConfig = arrayConfigs.find(config => config.target === field.name);
      if (arrayConfig) {
        reconstructedField.groupBy = arrayConfig.groupBy || undefined;
      }
    }
    
    // Recursively process children
    if (field.children && Array.isArray(field.children)) {
      reconstructedField.children = reconstructSchemaFields(field.children, arrayConfigs);
    }
    
    return reconstructedField;
  });
};

export const importTargetNode = (config: TargetNodeConfig, arrayConfigs?: any[]): Node => {
  // Reconstruct fields with groupBy information from array configurations
  const fieldsWithGroupBy = reconstructSchemaFields(config.schema.fields, arrayConfigs);
  
  return {
    id: config.id,
    type: 'target',
    position: config.position,
    data: {
      label: config.label,
      fields: fieldsWithGroupBy,
      data: config.outputData || [],
      fieldValues: {} // This will be populated by the centralized system
    }
  };
};

export const importSourceNode = (config: SourceNodeConfig): Node => {
  // Extract all unique field names from sample data to create complete schema
  const sampleData = config.sampleData || [];
  const allFieldNames = new Set<string>();
  
  // Add schema fields
  config.schema.fields.forEach(field => allFieldNames.add(field.name));
  
  // Add fields from sample data
  sampleData.forEach(item => {
    Object.keys(item).forEach(key => allFieldNames.add(key));
  });
  
  // Create complete field list with proper types and IDs
  const completeFields = Array.from(allFieldNames).map(fieldName => {
    // First check if field exists in schema
    const existingField = config.schema.fields.find(f => f.name === fieldName);
    if (existingField) {
      return existingField;
    }
    
    // Otherwise create a new field based on sample data
    const sampleValue = sampleData.find(item => item[fieldName] !== undefined)?.[fieldName];
    const fieldType = typeof sampleValue === 'number' ? 'number' : 'string';
    
    return {
      id: `field-${Date.now()}-${fieldName}`,
      name: fieldName,
      type: fieldType,
      exampleValue: sampleValue?.toString() || ''
    };
  });
  
  return {
    id: config.id,
    type: 'source',
    position: config.position,
    data: {
      label: config.label,
      fields: completeFields,
      data: sampleData
    }
  };
};

export const importTransformNode = (config: TransformNodeConfig): Node => {
  console.log('Importing transform node in NodeImporter:', config.id, config.transformType);
  
  // Handle coalesce transforms specially
  if (config.transformType === 'coalesce') {
    const rules = config.nodeData?.rules || 
                 config.config?.parameters?.rules || 
                 config.config?.rules || 
                 [];
    
    const defaultValue = config.nodeData?.defaultValue || 
                        config.config?.parameters?.defaultValue || 
                        config.config?.defaultValue || 
                        '';

    const inputValues = config.nodeData?.inputValues || {};
    
    console.log('Coalesce import - rules:', rules, 'defaultValue:', defaultValue, 'inputValues:', inputValues);
    
    return {
      id: config.id,
      type: 'transform',
      position: config.position,
      data: {
        label: config.label,
        transformType: 'coalesce',
        rules: rules,
        defaultValue: defaultValue,
        outputType: config.nodeData?.outputType || 'value',
        inputValues: inputValues,
        config: {
          rules: rules,
          defaultValue: defaultValue,
          parameters: {
            rules: rules,
            defaultValue: defaultValue,
            outputType: config.nodeData?.outputType || 'value'
          }
        }
      }
    };
  }

  // Handle other transform node types
  const nodeData = {
    label: config.label,
    transformType: config.transformType,
    config: config.config,
    // Copy nodeData if it exists (for backward compatibility)
    ...config.nodeData
  };

  return {
    id: config.id,
    type: config.type,
    position: config.position,
    data: nodeData
  };
};

export const importMappingNode = (config: MappingNodeConfig): Node => {
  return {
    id: config.id,
    type: 'conversionMapping',
    position: config.position,
    data: {
      label: config.label,
      mappings: config.mappings,
      isExpanded: false
    }
  };
};
