
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

export const importSourceNode = (config: SourceNodeConfig, connections?: any[]): Node => {
  const sampleData = config.sampleData || [];
  
  // Create a unified field list by merging schema fields with sample data fields
  const allFieldNames = new Set<string>();
  const finalFields: any[] = [];
  
  // First, add all schema fields and ensure field IDs match names
  config.schema.fields.forEach(field => {
    const normalizedField = {
      ...field,
      id: field.name // Ensure field ID matches name for consistent handle creation
    };
    finalFields.push(normalizedField);
    allFieldNames.add(field.name);
  });
  
  // Then add any missing fields from sample data
  if (sampleData.length > 0) {
    const firstItem = sampleData[0];
    Object.entries(firstItem).forEach(([key, value]) => {
      if (!allFieldNames.has(key)) {
        // Determine field type based on sample value
        const fieldType = Array.isArray(value) ? 'array' : 
                         (value && typeof value === 'object') ? 'object' :
                         typeof value === 'number' ? 'number' : 'string';
        
        finalFields.push({
          id: key, // Use field name as ID for consistency
          name: key,
          type: fieldType,
          exampleValue: Array.isArray(value) ? `[Array with ${value.length} items]` :
                       (value && typeof value === 'object') ? '[Object]' :
                       value?.toString() || ''
        });
        allFieldNames.add(key);
      }
    });
  }
  
  // Calculate initialExpandedFields based on connections
  const calculateInitialExpandedFields = (): Set<string> => {
    const connectedPaths = new Set<string>();
    
    if (connections) {
      connections.forEach(edge => {
        if (edge.sourceNodeId === config.id && edge.sourceHandle) {
          console.log(`Found connected handle for import: ${edge.sourceHandle}`);
          
          // Handle array notation like containers[0].container_number
          let pathToParse = edge.sourceHandle;
          
          // Split by dots, but also handle array notation
          const segments = [];
          let currentSegment = '';
          
          for (let i = 0; i < pathToParse.length; i++) {
            const char = pathToParse[i];
            
            if (char === '.') {
              if (currentSegment) {
                segments.push(currentSegment);
                currentSegment = '';
              }
            } else if (char === '[') {
              // If we hit an array bracket, add the current segment and the array part
              if (currentSegment) {
                segments.push(currentSegment);
              }
              // Find the closing bracket and include the array index
              const closingBracket = pathToParse.indexOf(']', i);
              if (closingBracket !== -1) {
                const arrayPart = pathToParse.substring(i, closingBracket + 1);
                currentSegment = currentSegment + arrayPart;
                i = closingBracket; // Skip to after the closing bracket
              }
            } else {
              currentSegment += char;
            }
          }
          
          // Add the last segment
          if (currentSegment) {
            segments.push(currentSegment);
          }
          
          // Now create all the parent paths for auto-expansion
          for (let i = 1; i <= segments.length; i++) {
            const path = segments.slice(0, i).join('.');
            connectedPaths.add(path);
            console.log(`Auto-expanding path for import: ${path}`);
            
            // Also add just the base path without array notation for expansion
            if (path.includes('[')) {
              const basePath = path.replace(/\[.*?\]/g, '');
              if (basePath && basePath !== path) {
                connectedPaths.add(basePath);
                console.log(`Auto-expanding base path for import: ${basePath}`);
              }
            }
          }
        }
      });
    }
    
    return connectedPaths;
  };
  
  const initialExpandedFields = calculateInitialExpandedFields();
  
  return {
    id: config.id,
    type: 'source',
    position: config.position,
    data: {
      label: config.label,
      fields: finalFields,
      data: sampleData,
      initialExpandedFields
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

  // Handle concat transforms specially
  if (config.transformType === 'concat') {
    const rules = config.nodeData?.rules || 
                 config.config?.parameters?.rules || 
                 config.config?.rules || 
                 [];
    
    const delimiter = config.nodeData?.delimiter || 
                     config.config?.parameters?.delimiter || 
                     config.config?.delimiter || 
                     ',';

    const inputValues = config.nodeData?.inputValues || {};
    
    console.log('Concat import - rules:', rules, 'delimiter:', delimiter, 'inputValues:', inputValues);
    console.log('Config type:', config.type, 'Transform type:', config.transformType);
    
    return {
      id: config.id,
      type: 'concatTransform',
      position: config.position,
      data: {
        label: config.label,
        transformType: 'concat',
        rules: rules,
        delimiter: delimiter,
        outputType: config.nodeData?.outputType || 'value',
        inputValues: inputValues,
        config: {
          rules: rules,
          delimiter: delimiter,
          parameters: {
            rules: rules,
            delimiter: delimiter,
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
