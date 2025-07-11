import { Node, Edge } from '@xyflow/react';
import { ComparisonResult, FieldMapping } from './MappingComparisonService';
import { SchemaField } from '../components/nodes/shared/FieldRenderer';

export interface ConversionData {
  sourceData: any[];
  outputTemplate: string;
  mappings: FieldMapping[];
  outputFormat: 'xml' | 'json';
}

export class VisualMappingConverter {
  static convertAnalysisToNodes(conversionData: ConversionData): { nodes: Node[], edges: Edge[] } {
    const { sourceData, mappings, outputFormat } = conversionData;
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    console.log('🔄 Converting analysis to visual mapping...');
    console.log('📊 Conversion data:', conversionData);
    
    // 1. Create source node
    const sourceFields = this.extractFieldsFromData(sourceData[0]);
    const sourceNode: Node = {
      id: 'source-1',
      type: 'source',
      position: { x: 100, y: 100 },
      data: {
        label: 'Source Data',
        fields: sourceFields,
        data: sourceData,
        fieldValues: {}
      }
    };
    nodes.push(sourceNode);
    
    // 2. Create target node
    const targetFields = this.createTargetFieldsFromMappings(mappings);
    const targetNodeType = outputFormat === 'xml' ? 'xmlTarget' : 'target';
    const targetNode: Node = {
      id: 'target-1',
      type: targetNodeType,
      position: { x: 800, y: 100 },
      data: {
        label: 'Target Schema',
        fields: targetFields,
        data: [],
        fieldValues: {},
        outputFormat: outputFormat
      }
    };
    nodes.push(targetNode);
    
    // 3. Create transform nodes and edges based on mappings
    let transformNodeCounter = 1;
    let yOffset = 300;
    
    mappings.forEach((mapping, index) => {
      console.log(`🔧 Processing mapping ${index + 1}:`, mapping);
      
      if (mapping.mappingType === 'direct') {
        // Direct mapping - create edge directly
        const sourceFieldId = this.findFieldIdByPath(sourceFields, mapping.sourceField);
        const targetFieldId = this.findFieldIdByPath(targetFields, mapping.targetField);
        
        console.log(`🔗 Direct mapping: ${mapping.sourceField} → ${mapping.targetField}`);
        console.log(`📍 Source field ID: ${sourceFieldId}, Target field ID: ${targetFieldId}`);
        
        if (sourceFieldId && targetFieldId) {
          edges.push({
            id: `edge-direct-${index}`,
            source: 'source-1',
            target: 'target-1',
            sourceHandle: sourceFieldId,
            targetHandle: targetFieldId,
            type: 'default'
          });
        } else {
          console.warn(`⚠️ Could not find field IDs for direct mapping: ${mapping.sourceField} → ${mapping.targetField}`);
        }
      } else if (mapping.mappingType === 'concat' && mapping.sourceFields) {
        // Concatenation - create concat transform node
        const concatNode: Node = {
          id: `concat-${transformNodeCounter}`,
          type: 'transform',
          position: { x: 450, y: yOffset },
          data: {
            label: 'Concat Transform',
            transformType: 'Concat',
            fields: [
              {
                id: `concat-input-${transformNodeCounter}`,
                name: 'input1',
                type: 'string'
              },
              {
                id: `concat-input2-${transformNodeCounter}`,
                name: 'input2', 
                type: 'string'
              },
              {
                id: `concat-output-${transformNodeCounter}`,
                name: 'output',
                type: 'string'
              }
            ]
          }
        };
        nodes.push(concatNode);
        
        // Create edges from source fields to concat node
        mapping.sourceFields.forEach((sourceField, fieldIndex) => {
          const sourceFieldId = this.findFieldIdByPath(sourceFields, sourceField);
          if (sourceFieldId) {
            edges.push({
              id: `edge-concat-input-${transformNodeCounter}-${fieldIndex}`,
              source: 'source-1',
              target: `concat-${transformNodeCounter}`,
              sourceHandle: sourceFieldId,
              targetHandle: fieldIndex === 0 ? `concat-input-${transformNodeCounter}` : `concat-input2-${transformNodeCounter}`,
              type: 'default'
            });
          }
        });
        
        // Create edge from concat node to target
        const targetFieldId = this.findFieldIdByPath(targetFields, mapping.targetField);
        if (targetFieldId) {
          edges.push({
            id: `edge-concat-output-${transformNodeCounter}`,
            source: `concat-${transformNodeCounter}`,
            target: 'target-1',
            sourceHandle: `concat-output-${transformNodeCounter}`,
            targetHandle: targetFieldId,
            type: 'default'
          });
        }
        
        transformNodeCounter++;
        yOffset += 150;
      } else if (mapping.mappingType === 'transform') {
        // Transform node
        const transformType = this.getTransformType(mapping);
        const transformNode: Node = {
          id: `transform-${transformNodeCounter}`,
          type: 'transform',
          position: { x: 450, y: yOffset },
          data: {
            label: `${transformType} Transform`,
            transformType: transformType,
            fields: [
              {
                id: `transform-input-${transformNodeCounter}`,
                name: 'input',
                type: 'string'
              },
              {
                id: `transform-output-${transformNodeCounter}`,
                name: 'output',
                type: 'string'
              }
            ]
          }
        };
        nodes.push(transformNode);
        
        // Create edges
        const sourceFieldId = this.findFieldIdByPath(sourceFields, mapping.sourceField);
        const targetFieldId = this.findFieldIdByPath(targetFields, mapping.targetField);
        
        if (sourceFieldId) {
          edges.push({
            id: `edge-transform-input-${transformNodeCounter}`,
            source: 'source-1',
            target: `transform-${transformNodeCounter}`,
            sourceHandle: sourceFieldId,
            targetHandle: `transform-input-${transformNodeCounter}`,
            type: 'default'
          });
        }
        
        if (targetFieldId) {
          edges.push({
            id: `edge-transform-output-${transformNodeCounter}`,
            source: `transform-${transformNodeCounter}`,
            target: 'target-1',
            sourceHandle: `transform-output-${transformNodeCounter}`,
            targetHandle: targetFieldId,
            type: 'default'
          });
        }
        
        transformNodeCounter++;
        yOffset += 150;
      } else if (mapping.mappingType === 'static') {
        // Static value node
        const staticNode: Node = {
          id: `static-${transformNodeCounter}`,
          type: 'transform',
          position: { x: 450, y: yOffset },
          data: {
            label: 'Static Value',
            transformType: 'Static Value',
            staticValue: mapping.staticValue,
            fields: [
              {
                id: `static-output-${transformNodeCounter}`,
                name: 'output',
                type: 'string'
              }
            ]
          }
        };
        nodes.push(staticNode);
        
        // Create edge to target
        const targetFieldId = this.findFieldIdByPath(targetFields, mapping.targetField);
        if (targetFieldId) {
          edges.push({
            id: `edge-static-output-${transformNodeCounter}`,
            source: `static-${transformNodeCounter}`,
            target: 'target-1',
            sourceHandle: `static-output-${transformNodeCounter}`,
            targetHandle: targetFieldId,
            type: 'default'
          });
        }
        
        transformNodeCounter++;
        yOffset += 100;
      }
    });
    
    console.log('✅ Generated nodes:', nodes.length);
    console.log('✅ Generated edges:', edges.length);
    
    return { nodes, edges };
  }
  
  private static extractFieldsFromData(sampleData: any, prefix = ''): SchemaField[] {
    if (!sampleData || typeof sampleData !== 'object') return [];
    
    const fields: SchemaField[] = [];
    
    Object.keys(sampleData).forEach((key, index) => {
      const value = sampleData[key];
      const fieldId = `field-${Date.now()}-${prefix}-${index}`;
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      
      if (Array.isArray(value)) {
        fields.push({
          id: fieldId,
          name: key,
          type: 'array',
          children: value.length > 0 && typeof value[0] === 'object' 
            ? this.extractFieldsFromData(value[0], fieldId)
            : []
        });
      } else if (value && typeof value === 'object') {
        fields.push({
          id: fieldId,
          name: key,
          type: 'object',
          children: this.extractFieldsFromData(value, fieldId)
        });
      } else {
        fields.push({
          id: fieldId,
          name: key,
          type: typeof value === 'number' ? 'number' : 
                typeof value === 'boolean' ? 'boolean' : 'string'
        });
      }
    });
    
    return fields;
  }
  
  private static createTargetFieldsFromMappings(mappings: FieldMapping[]): SchemaField[] {
    console.log('🎯 Creating target fields from mappings:', mappings);
    const fieldMap = new Map<string, SchemaField>();
    
    mappings.forEach((mapping, index) => {
      const fieldPath = mapping.targetField;
      const parts = fieldPath.split('.');
      console.log(`📋 Processing target field: ${fieldPath}, parts:`, parts);
      
      // Create nested structure
      let currentPath = '';
      parts.forEach((part, partIndex) => {
        const isAttribute = part.startsWith('@');
        const cleanPart = part.replace('@', '');
        currentPath = currentPath ? `${currentPath}.${part}` : part;
        
        if (!fieldMap.has(currentPath)) {
          const fieldId = `target-field-${Date.now()}-${index}-${partIndex}`;
          console.log(`🆔 Creating field: ${currentPath} with ID: ${fieldId}`);
          
          fieldMap.set(currentPath, {
            id: fieldId,
            name: cleanPart,
            type: partIndex === parts.length - 1 ? 'string' : 'object',
            isAttribute: isAttribute,
            children: []
          });
        }
      });
    });
    
    // Build hierarchy
    const rootFields: SchemaField[] = [];
    const allFields = Array.from(fieldMap.values());
    console.log('🗂️ All created fields:', allFields);
    
    // Group fields by their hierarchy
    const rootFieldNames = new Set<string>();
    mappings.forEach(mapping => {
      const parts = mapping.targetField.split('.');
      if (parts.length > 0) {
        rootFieldNames.add(parts[0]);
      }
    });
    
    console.log('🌳 Root field names:', Array.from(rootFieldNames));
    
    // Build the hierarchy properly
    rootFieldNames.forEach(rootName => {
      const rootField = allFields.find(f => {
        const matchingMapping = mappings.find(m => m.targetField.startsWith(rootName));
        return matchingMapping && matchingMapping.targetField.split('.')[0] === rootName;
      });
      
      if (rootField) {
        // Find all children for this root
        const children = allFields.filter(f => {
          const matchingMapping = mappings.find(m => m.targetField.includes(f.name));
          if (!matchingMapping) return false;
          const parts = matchingMapping.targetField.split('.');
          return parts.length > 1 && parts[0] === rootName && parts[parts.length - 1].replace('@', '') === f.name;
        });
        
        rootField.children = children;
        rootFields.push(rootField);
        console.log(`🌿 Root field ${rootName} with ${children.length} children:`, children);
      }
    });
    
    console.log('🎯 Final target fields structure:', rootFields);
    return rootFields.length > 0 ? rootFields : allFields;
  }
  
  private static findFieldIdByPath(fields: SchemaField[], path: string): string | null {
    const pathParts = path.split('.');
    
    const findInFields = (fieldsArray: SchemaField[], remainingPath: string[]): string | null => {
      if (remainingPath.length === 0) return null;
      
      const currentPart = remainingPath[0].replace('@', '');
      const field = fieldsArray.find(f => f.name === currentPart);
      
      if (!field) return null;
      
      if (remainingPath.length === 1) {
        return field.id;
      }
      
      if (field.children) {
        return findInFields(field.children, remainingPath.slice(1));
      }
      
      return null;
    };
    
    return findInFields(fields, pathParts);
  }
  
  private static getTransformType(mapping: FieldMapping): string {
    if (mapping.transformation) {
      switch (mapping.transformation.type) {
        case 'split': return 'Text Splitter';
        case 'format': return 'Format';
        case 'convert': return 'Convert';
        default: return 'Transform';
      }
    }
    return 'Transform';
  }
}