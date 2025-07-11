import { XmlJsonConverter } from './XmlJsonConverter';

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  mappingType: 'direct' | 'transform' | 'concat' | 'conditional' | 'static';
  confidence: number;
  transformation?: {
    type: 'split' | 'concat' | 'format' | 'convert' | 'coalesce' | 'ifThen';
    details: any;
  };
  sourceFields?: string[]; // For concat operations
  staticValue?: any; // For static values
  conditions?: Array<{
    condition: string;
    value: any;
  }>;
}

export interface ComparisonResult {
  mappings: FieldMapping[];
  confidence: number;
  transformationsNeeded: number;
  directMappings: number;
  staticValues: number;
  suggestions: string[];
}

export class MappingComparisonService {
  
  static analyzeInputOutput(inputData: string, outputData: string): ComparisonResult {
    try {
      console.log('🔍 Starting mapping comparison analysis...');
      
      // Parse and normalize input data
      const parsedInput = JSON.parse(inputData);
      let inputArray = Array.isArray(parsedInput) ? parsedInput : 
                      parsedInput.rows ? parsedInput.rows : [parsedInput];
      
      console.log('📊 Parsed input structure:', parsedInput);
      console.log('📊 Input array for analysis:', inputArray);
      
      // Detect and normalize output format
      const outputFormat = XmlJsonConverter.detectFormat(outputData);
      let normalizedOutput;
      
      if (outputFormat === 'xml') {
        normalizedOutput = XmlJsonConverter.xmlToJsonEnhanced(outputData);
        console.log('🔧 Raw XML conversion result:', normalizedOutput);
        
        // If the result has a root wrapper, extract the actual data structure
        const rootKeys = Object.keys(normalizedOutput);
        if (rootKeys.length === 1 && typeof normalizedOutput[rootKeys[0]] === 'object') {
          normalizedOutput = normalizedOutput[rootKeys[0]];
          console.log('🎯 Extracted structure from root:', normalizedOutput);
        }
      } else {
        normalizedOutput = JSON.parse(outputData);
      }
      
      console.log('📊 Input sample:', inputArray[0]);
      console.log('🎯 Output structure:', normalizedOutput);
      
      // Extract all possible source fields
      const sourceFields = this.extractAllFields(inputArray[0]);
      console.log('📋 Available source fields:', sourceFields);
      
      // Extract all target fields
      const targetFields = this.extractAllFields(normalizedOutput);
      console.log('🎯 Target fields to map:', targetFields);
      
      // Perform comprehensive mapping analysis
      const mappings = this.findAllMappings(inputArray, normalizedOutput, sourceFields, targetFields);
      
      // Calculate statistics
      const directMappings = mappings.filter(m => m.mappingType === 'direct').length;
      const transformations = mappings.filter(m => m.mappingType !== 'direct' && m.mappingType !== 'static').length;
      const staticValues = mappings.filter(m => m.mappingType === 'static').length;
      const totalConfidence = mappings.reduce((sum, m) => sum + m.confidence, 0) / Math.max(mappings.length, 1);
      
      // Generate suggestions
      const suggestions = this.generateSuggestions(mappings, sourceFields, targetFields);
      
      console.log('✅ Analysis complete:', {
        totalMappings: mappings.length,
        directMappings,
        transformations,
        staticValues,
        confidence: totalConfidence
      });
      
      return {
        mappings,
        confidence: totalConfidence,
        transformationsNeeded: transformations,
        directMappings,
        staticValues,
        suggestions
      };
      
    } catch (error) {
      console.error('❌ Mapping comparison failed:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private static extractAllFields(obj: any, prefix = '', fields: Set<string> = new Set()): string[] {
    if (!obj || typeof obj !== 'object') return Array.from(fields);
    
    if (Array.isArray(obj)) {
      if (obj.length > 0) {
        this.extractAllFields(obj[0], prefix, fields);
      }
    } else {
      Object.keys(obj).forEach(key => {
        const fieldPath = prefix ? `${prefix}.${key}` : key;
        fields.add(fieldPath);
        
        const value = obj[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          this.extractAllFields(value, fieldPath, fields);
        } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          // For arrays, extract fields from the first item
          this.extractAllFields(value[0], fieldPath, fields);
        }
      });
    }
    
    return Array.from(fields);
  }
  
  private static findAllMappings(inputArray: any[], output: any, sourceFields: string[], targetFields: string[]): FieldMapping[] {
    const mappings: FieldMapping[] = [];
    
    console.log('🔍 Finding mappings between fields...');
    
    targetFields.forEach(targetField => {
      const targetValue = this.getNestedValue(output, targetField);
      console.log(`\n🎯 Analyzing target field: ${targetField} = ${JSON.stringify(targetValue)}`);
      
      // Try to find the best mapping for this target field
      const bestMapping = this.findBestMappingForTarget(inputArray, targetField, targetValue, sourceFields);
      
      if (bestMapping) {
        mappings.push(bestMapping);
        console.log(`✅ Found mapping: ${bestMapping.sourceField || bestMapping.sourceFields?.join(' + ')} → ${targetField} (${bestMapping.mappingType}), confidence: ${bestMapping.confidence}`);
      } else {
        // No mapping found - this is a static value
        mappings.push({
          sourceField: '',
          targetField,
          mappingType: 'static',
          confidence: 1.0,
          staticValue: targetValue
        });
        console.log(`📌 Static value: ${targetField} = ${JSON.stringify(targetValue)}`);
      }
    });
    
    return mappings;
  }
  
  private static findBestMappingForTarget(inputArray: any[], targetField: string, targetValue: any, sourceFields: string[]): FieldMapping | null {
    let bestMapping: FieldMapping | null = null;
    let highestConfidence = 0;
    
    // 1. Try direct field name matching
    const directMatch = this.findDirectMatch(inputArray, targetField, targetValue, sourceFields);
    if (directMatch && directMatch.confidence > highestConfidence) {
      bestMapping = directMatch;
      highestConfidence = directMatch.confidence;
    }
    
    // 2. Try value-based matching
    const valueMatch = this.findValueMatch(inputArray, targetField, targetValue, sourceFields);
    if (valueMatch && valueMatch.confidence > highestConfidence) {
      bestMapping = valueMatch;
      highestConfidence = valueMatch.confidence;
    }
    
    // 3. Try transformation matching
    const transformMatch = this.findTransformationMatch(inputArray, targetField, targetValue, sourceFields);
    if (transformMatch && transformMatch.confidence > highestConfidence) {
      bestMapping = transformMatch;
      highestConfidence = transformMatch.confidence;
    }
    
    // 4. Try concatenation matching
    const concatMatch = this.findConcatenationMatch(inputArray, targetField, targetValue, sourceFields);
    if (concatMatch && concatMatch.confidence > highestConfidence) {
      bestMapping = concatMatch;
      highestConfidence = concatMatch.confidence;
    }
    
    return bestMapping;
  }
  
  private static findDirectMatch(inputArray: any[], targetField: string, targetValue: any, sourceFields: string[]): FieldMapping | null {
    // Look for exact field name matches
    const exactNameMatch = sourceFields.find(field => 
      field.toLowerCase() === targetField.toLowerCase() ||
      field.toLowerCase().includes(targetField.toLowerCase()) ||
      targetField.toLowerCase().includes(field.toLowerCase())
    );
    
    if (exactNameMatch) {
      const sourceValue = this.getNestedValue(inputArray[0], exactNameMatch);
      if (sourceValue !== undefined) {
        return {
          sourceField: exactNameMatch,
          targetField,
          mappingType: 'direct',
          confidence: 0.9
        };
      }
    }
    
    return null;
  }
  
  private static findValueMatch(inputArray: any[], targetField: string, targetValue: any, sourceFields: string[]): FieldMapping | null {
    // Look for fields with matching values
    for (const sourceField of sourceFields) {
      const sourceValue = this.getNestedValue(inputArray[0], sourceField);
      
      if (sourceValue === targetValue) {
        return {
          sourceField,
          targetField,
          mappingType: 'direct',
          confidence: 1.0
        };
      }
      
      // Check for partial matches (strings)
      if (typeof sourceValue === 'string' && typeof targetValue === 'string') {
        if (sourceValue.includes(targetValue) || targetValue.includes(sourceValue)) {
          return {
            sourceField,
            targetField,
            mappingType: 'transform',
            confidence: 0.8,
            transformation: {
              type: 'format',
              details: { from: sourceValue, to: targetValue }
            }
          };
        }
      }
    }
    
    return null;
  }
  
  private static findTransformationMatch(inputArray: any[], targetField: string, targetValue: any, sourceFields: string[]): FieldMapping | null {
    for (const sourceField of sourceFields) {
      const sourceValue = this.getNestedValue(inputArray[0], sourceField);
      
      // Date format transformation
      if (this.isDateTransformation(sourceValue, targetValue)) {
        return {
          sourceField,
          targetField,
          mappingType: 'transform',
          confidence: 0.8,
          transformation: {
            type: 'format',
            details: { type: 'date', from: sourceValue, to: targetValue }
          }
        };
      }
      
      // Number format transformation
      if (this.isNumberTransformation(sourceValue, targetValue)) {
        return {
          sourceField,
          targetField,
          mappingType: 'transform',
          confidence: 0.8,
          transformation: {
            type: 'convert',
            details: { type: 'number', from: sourceValue, to: targetValue }
          }
        };
      }
      
      // String split transformation
      if (this.isSplitTransformation(sourceValue, targetValue)) {
        return {
          sourceField,
          targetField,
          mappingType: 'transform',
          confidence: 0.7,
          transformation: {
            type: 'split',
            details: { delimiter: this.detectDelimiter(sourceValue, targetValue) }
          }
        };
      }
    }
    
    return null;
  }
  
  private static findConcatenationMatch(inputArray: any[], targetField: string, targetValue: any, sourceFields: string[]): FieldMapping | null {
    if (typeof targetValue !== 'string') return null;
    
    // Try to find combinations of fields that when concatenated match the target
    for (let i = 0; i < sourceFields.length; i++) {
      for (let j = i + 1; j < sourceFields.length; j++) {
        const field1 = sourceFields[i];
        const field2 = sourceFields[j];
        const value1 = this.getNestedValue(inputArray[0], field1);
        const value2 = this.getNestedValue(inputArray[0], field2);
        
        if (value1 && value2) {
          const concatenated1 = `${value1} ${value2}`;
          const concatenated2 = `${value1}${value2}`;
          const concatenated3 = `${value2} ${value1}`;
          
          if (concatenated1 === targetValue || concatenated2 === targetValue || concatenated3 === targetValue) {
            return {
              sourceField: '',
              sourceFields: [field1, field2],
              targetField,
              mappingType: 'concat',
              confidence: 0.9,
              transformation: {
                type: 'concat',
                details: { 
                  separator: concatenated1 === targetValue ? ' ' : '',
                  order: concatenated3 === targetValue ? 'reverse' : 'normal'
                }
              }
            };
          }
        }
      }
    }
    
    return null;
  }
  
  private static isDateTransformation(source: any, target: any): boolean {
    if (!source || !target) return false;
    
    const sourceDate = new Date(source);
    const targetDate = new Date(target);
    
    return !isNaN(sourceDate.getTime()) && !isNaN(targetDate.getTime()) && 
           sourceDate.getTime() === targetDate.getTime();
  }
  
  private static isNumberTransformation(source: any, target: any): boolean {
    const sourceNum = parseFloat(source);
    const targetNum = parseFloat(target);
    
    return !isNaN(sourceNum) && !isNaN(targetNum) && sourceNum === targetNum;
  }
  
  private static isSplitTransformation(source: any, target: any): boolean {
    if (typeof source !== 'string' || typeof target !== 'string') return false;
    
    const delimiters = [' ', '-', '_', '.', '/', '\\', '|'];
    
    for (const delimiter of delimiters) {
      if (source.includes(delimiter)) {
        const parts = source.split(delimiter);
        if (parts.includes(target)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  private static detectDelimiter(source: string, target: string): string {
    const delimiters = [' ', '-', '_', '.', '/', '\\', '|'];
    
    for (const delimiter of delimiters) {
      if (source.includes(delimiter)) {
        const parts = source.split(delimiter);
        if (parts.includes(target)) {
          return delimiter;
        }
      }
    }
    
    return ' ';
  }
  
  private static getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }
  
  private static generateSuggestions(mappings: FieldMapping[], sourceFields: string[], targetFields: string[]): string[] {
    const suggestions: string[] = [];
    
    const unmappedTargets = targetFields.filter(tf => 
      !mappings.some(m => m.targetField === tf)
    );
    
    const unmappedSources = sourceFields.filter(sf => 
      !mappings.some(m => m.sourceField === sf || m.sourceFields?.includes(sf))
    );
    
    if (unmappedTargets.length > 0) {
      suggestions.push(`${unmappedTargets.length} target fields need manual mapping: ${unmappedTargets.slice(0, 3).join(', ')}${unmappedTargets.length > 3 ? '...' : ''}`);
    }
    
    if (unmappedSources.length > 0) {
      suggestions.push(`${unmappedSources.length} source fields are unused: ${unmappedSources.slice(0, 3).join(', ')}${unmappedSources.length > 3 ? '...' : ''}`);
    }
    
    const lowConfidenceMappings = mappings.filter(m => m.confidence < 0.7);
    if (lowConfidenceMappings.length > 0) {
      suggestions.push(`${lowConfidenceMappings.length} mappings have low confidence and should be reviewed`);
    }
    
    const transformations = mappings.filter(m => m.mappingType === 'transform').length;
    if (transformations > 0) {
      suggestions.push(`${transformations} fields require transformations - consider using transform nodes`);
    }
    
    const concatenations = mappings.filter(m => m.mappingType === 'concat').length;
    if (concatenations > 0) {
      suggestions.push(`${concatenations} fields require concatenation - consider using concat nodes`);
    }
    
    return suggestions;
  }
  
  static generateMappingTemplate(result: ComparisonResult, outputFormat: 'xml' | 'json' = 'json'): string {
    console.log('📝 Generating mapping template...');
    
    let template: any = {};
    
    // Build the template structure based on mappings
    result.mappings.forEach(mapping => {
      if (mapping.mappingType === 'static') {
        this.setNestedValue(template, mapping.targetField, mapping.staticValue);
      } else if (mapping.mappingType === 'direct') {
        this.setNestedValue(template, mapping.targetField, `{{ ${mapping.sourceField} }}`);
      } else if (mapping.mappingType === 'concat') {
        const separator = mapping.transformation?.details?.separator || ' ';
        const fields = mapping.sourceFields || [];
        this.setNestedValue(template, mapping.targetField, 
          `{{ ${fields.join(`${separator ? ` "${separator}" ` : ' '}{{ `)} }}`);
      } else if (mapping.mappingType === 'transform') {
        const transformType = mapping.transformation?.type;
        switch (transformType) {
          case 'split':
            this.setNestedValue(template, mapping.targetField, 
              `{{split ${mapping.sourceField} "${mapping.transformation?.details?.delimiter || ' '}" }}`);
            break;
          case 'format':
            this.setNestedValue(template, mapping.targetField, 
              `{{format ${mapping.sourceField} }}`);
            break;
          default:
            this.setNestedValue(template, mapping.targetField, `{{ ${mapping.sourceField} }}`);
        }
      }
    });
    
    if (outputFormat === 'xml') {
      // Convert to XML template
      const rootKey = Object.keys(template)[0] || 'root';
      return XmlJsonConverter.jsonToXml(template, rootKey);
    }
    
    return JSON.stringify(template, null, 2);
  }
  
  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }
}