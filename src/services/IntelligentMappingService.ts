export interface MappingRule {
  sourceField: string;
  targetField: string;
  mappingType: 'direct' | 'conditional' | 'transform' | 'static' | 'calculated';
  confidence: number;
  transformation?: {
    type: 'date_format' | 'gender_mapping' | 'case_transform' | 'substring' | 'concat';
    config?: any;
  };
  conditions?: {
    sourceValue: any;
    targetValue: any;
  }[];
  examples?: {
    sourceValue: any;
    targetValue: any;
  }[];
}

export interface AnalysisResult {
  mappingRules: MappingRule[];
  staticValues: { [key: string]: any };
  templateAttributes: { [key: string]: any };
  confidence: number;
  coverage: number;
}

export class IntelligentMappingService {
  /**
   * Analyze multiple examples to find intelligent mapping patterns
   */
  static analyzeMultipleExamples(
    sourceExamples: any[],
    targetExamples: any[]
  ): AnalysisResult {
    if (sourceExamples.length !== targetExamples.length) {
      throw new Error('Source and target examples must have the same length');
    }

    const mappingRules: MappingRule[] = [];
    const staticValues: { [key: string]: any } = {};
    const templateAttributes: { [key: string]: any } = {};
    
    // Extract all possible target fields from examples
    const allTargetFields = this.extractAllFields(targetExamples);
    
    // Analyze each target field
    for (const targetField of allTargetFields) {
      const rule = this.analyzeFieldMapping(sourceExamples, targetExamples, targetField);
      if (rule) {
        if (rule.mappingType === 'static') {
          staticValues[targetField] = rule.examples?.[0]?.targetValue;
        } else {
          mappingRules.push(rule);
        }
      }
    }

    // Analyze template-level attributes (like root element attributes)
    this.analyzeTemplateAttributes(targetExamples, templateAttributes);

    const coverage = this.calculateCoverage(mappingRules, staticValues, allTargetFields);
    const confidence = this.calculateOverallConfidence(mappingRules);

    return {
      mappingRules,
      staticValues,
      templateAttributes,
      confidence,
      coverage
    };
  }

  /**
   * Analyze mapping for a specific target field
   */
  private static analyzeFieldMapping(
    sourceExamples: any[],
    targetExamples: any[],
    targetField: string
  ): MappingRule | null {
    const examples = sourceExamples.map((source, index) => ({
      source,
      target: this.getNestedValue(targetExamples[index], targetField),
    })).filter(ex => ex.target !== undefined);

    if (examples.length === 0) return null;

    // Check for static values
    const uniqueTargetValues = [...new Set(examples.map(ex => ex.target))];
    if (uniqueTargetValues.length === 1) {
      return {
        sourceField: '[static]',
        targetField,
        mappingType: 'static',
        confidence: 1.0,
        examples: [{ sourceValue: '[static]', targetValue: uniqueTargetValues[0] }]
      };
    }

    // Try direct field mapping
    const directMapping = this.findDirectMapping(examples, targetField);
    if (directMapping) return directMapping;

    // Try conditional mapping
    const conditionalMapping = this.findConditionalMapping(examples, targetField);
    if (conditionalMapping) return conditionalMapping;

    // Try transformation mapping
    const transformMapping = this.findTransformationMapping(examples, targetField);
    if (transformMapping) return transformMapping;

    return null;
  }

  /**
   * Find direct field-to-field mapping
   */
  private static findDirectMapping(examples: any[], targetField: string): MappingRule | null {
    const sourceFields = this.extractAllFields(examples.map(ex => ex.source));
    
    for (const sourceField of sourceFields) {
      let matches = 0;
      const fieldExamples: { sourceValue: any; targetValue: any }[] = [];
      
      for (const example of examples) {
        const sourceValue = this.getNestedValue(example.source, sourceField);
        if (sourceValue !== undefined && sourceValue === example.target) {
          matches++;
          fieldExamples.push({ sourceValue, targetValue: example.target });
        }
      }
      
      const confidence = matches / examples.length;
      if (confidence >= 0.8) { // 80% match threshold
        return {
          sourceField,
          targetField,
          mappingType: 'direct',
          confidence,
          examples: fieldExamples
        };
      }
    }
    
    return null;
  }

  /**
   * Find conditional mapping (like gender: Man -> M, Vrouw -> V)
   */
  private static findConditionalMapping(examples: any[], targetField: string): MappingRule | null {
    const sourceFields = this.extractAllFields(examples.map(ex => ex.source));
    
    for (const sourceField of sourceFields) {
      const conditionMap = new Map<any, any>();
      let totalMatches = 0;
      
      for (const example of examples) {
        const sourceValue = this.getNestedValue(example.source, sourceField);
        if (sourceValue !== undefined) {
          if (!conditionMap.has(sourceValue)) {
            conditionMap.set(sourceValue, example.target);
            totalMatches++;
          } else if (conditionMap.get(sourceValue) === example.target) {
            totalMatches++;
          }
        }
      }
      
      const confidence = totalMatches / examples.length;
      if (confidence >= 0.8 && conditionMap.size > 1) {
        const conditions = Array.from(conditionMap.entries()).map(([sourceValue, targetValue]) => ({
          sourceValue,
          targetValue
        }));
        
        return {
          sourceField,
          targetField,
          mappingType: 'conditional',
          confidence,
          conditions,
          examples: examples.map(ex => ({
            sourceValue: this.getNestedValue(ex.source, sourceField),
            targetValue: ex.target
          })).filter(ex => ex.sourceValue !== undefined)
        };
      }
    }
    
    return null;
  }

  /**
   * Find transformation mapping (like date format changes)
   */
  private static findTransformationMapping(examples: any[], targetField: string): MappingRule | null {
    const sourceFields = this.extractAllFields(examples.map(ex => ex.source));
    
    for (const sourceField of sourceFields) {
      // Check for date transformation
      const dateTransform = this.checkDateTransformation(examples, sourceField, targetField);
      if (dateTransform) return dateTransform;
      
      // Check for other transformations...
    }
    
    return null;
  }

  /**
   * Check for date format transformations
   */
  private static checkDateTransformation(examples: any[], sourceField: string, targetField: string): MappingRule | null {
    let matches = 0;
    const transformExamples: { sourceValue: any; targetValue: any }[] = [];
    
    for (const example of examples) {
      const sourceValue = this.getNestedValue(example.source, sourceField);
      const targetValue = example.target;
      
      if (sourceValue && targetValue) {
        // Check if source looks like ISO date and target looks like date
        if (this.isIsoDate(sourceValue) && this.isDate(targetValue)) {
          const transformedDate = this.formatDate(sourceValue, 'YYYY-MM-DD');
          if (transformedDate === targetValue) {
            matches++;
            transformExamples.push({ sourceValue, targetValue });
          }
        }
      }
    }
    
    const confidence = matches / examples.length;
    if (confidence >= 0.8) {
      return {
        sourceField,
        targetField,
        mappingType: 'transform',
        confidence,
        transformation: {
          type: 'date_format',
          config: { from: 'ISO', to: 'YYYY-MM-DD' }
        },
        examples: transformExamples
      };
    }
    
    return null;
  }

  /**
   * Extract all possible field paths from objects
   */
  private static extractAllFields(objects: any[], prefix: string = ''): string[] {
    const fields = new Set<string>();
    
    for (const obj of objects) {
      if (!obj || typeof obj !== 'object') continue;
      
      if (Array.isArray(obj)) {
        // For arrays, analyze first few items
        for (let i = 0; i < Math.min(3, obj.length); i++) {
          const subFields = this.extractAllFields([obj[i]], `${prefix}[${i}].`);
          subFields.forEach(field => fields.add(field));
        }
      } else {
        for (const [key, value] of Object.entries(obj)) {
          const fieldPath = prefix + key;
          fields.add(fieldPath);
          
          if (value && typeof value === 'object') {
            const subFields = this.extractAllFields([value], `${fieldPath}.`);
            subFields.forEach(field => fields.add(field));
          }
        }
      }
    }
    
    return Array.from(fields);
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      
      // Handle array access [0], [1], etc.
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayKey, index] = arrayMatch;
        current = current[arrayKey];
        if (Array.isArray(current)) {
          current = current[parseInt(index, 10)];
        } else {
          return undefined;
        }
      } else {
        current = current[part];
      }
    }
    
    return current;
  }

  /**
   * Analyze template-level attributes
   */
  private static analyzeTemplateAttributes(targetExamples: any[], templateAttributes: { [key: string]: any }): void {
    // Look for consistent root-level attributes across all examples
    for (const example of targetExamples) {
      if (example && typeof example === 'object' && example['@attributes']) {
        for (const [key, value] of Object.entries(example['@attributes'])) {
          if (!templateAttributes[key]) {
            templateAttributes[key] = value;
          } else if (templateAttributes[key] !== value) {
            // If values differ, it might be a dynamic field
            templateAttributes[key] = `{{ ${key} }}`;
          }
        }
      }
    }
  }

  /**
   * Calculate coverage percentage
   */
  private static calculateCoverage(mappingRules: MappingRule[], staticValues: { [key: string]: any }, allFields: string[]): number {
    const coveredFields = mappingRules.length + Object.keys(staticValues).length;
    return coveredFields / allFields.length;
  }

  /**
   * Calculate overall confidence
   */
  private static calculateOverallConfidence(mappingRules: MappingRule[]): number {
    if (mappingRules.length === 0) return 0;
    const avgConfidence = mappingRules.reduce((sum, rule) => sum + rule.confidence, 0) / mappingRules.length;
    return avgConfidence;
  }

  /**
   * Helper methods
   */
  private static isIsoDate(value: string): boolean {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
  }

  private static isDate(value: string): boolean {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private static formatDate(isoDate: string, format: string): string {
    const date = new Date(isoDate);
    if (format === 'YYYY-MM-DD') {
      return date.toISOString().split('T')[0];
    }
    return isoDate;
  }
}