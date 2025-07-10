import { SchemaField } from '../components/nodes/shared/FieldRenderer';
import { XmlJsonConverter } from './XmlJsonConverter';

export interface MappingSuggestion {
    sourceFieldPath: string;
    targetFieldPath: string;
    confidence: number;
    reason: string;
    transformRequired?: string;
}

export interface FieldAnalysis {
    path: string;
    type: string;
    sampleValues: any[];
    isAttribute?: boolean;
    patterns?: string[];
}

export class SmartMappingAnalyzer {
    /**
     * Analyze source data and suggest mappings to target schema
     */
    static analyzeMappingSuggestions(
        sourceData: any[], 
        targetFields: SchemaField[]
    ): MappingSuggestion[] {
        console.log('🧠 Starting smart mapping analysis...');
        console.log('Source data sample:', sourceData.slice(0, 2));
        console.log('Target fields:', targetFields);

        const suggestions: MappingSuggestion[] = [];
        
        // Analyze source data structure
        const sourceAnalysis = this.analyzeSourceStructure(sourceData);
        console.log('📊 Source analysis:', sourceAnalysis);
        
        // Analyze target structure
        const targetAnalysis = this.analyzeTargetStructure(targetFields);
        console.log('🎯 Target analysis:', targetAnalysis);
        
        // Generate mapping suggestions
        for (const targetField of targetAnalysis) {
            const bestMatch = this.findBestSourceMatch(targetField, sourceAnalysis);
            if (bestMatch) {
                suggestions.push(bestMatch);
            }
        }
        
        console.log('💡 Generated suggestions:', suggestions);
        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Analyze the structure of source data
     */
    private static analyzeSourceStructure(sourceData: any[]): FieldAnalysis[] {
        if (!sourceData || sourceData.length === 0) return [];
        
        const analysis: FieldAnalysis[] = [];
        const sampleItem = sourceData[0];
        
        this.extractFieldPaths(sampleItem, '', analysis, sourceData);
        
        return analysis;
    }

    /**
     * Recursively extract field paths and analyze their types
     */
    private static extractFieldPaths(
        obj: any, 
        currentPath: string, 
        analysis: FieldAnalysis[], 
        allData: any[]
    ): void {
        if (!obj || typeof obj !== 'object') return;
        
        for (const [key, value] of Object.entries(obj)) {
            const fieldPath = currentPath ? `${currentPath}.${key}` : key;
            const isAttribute = key.startsWith('@');
            
            // Collect sample values from all data items
            const sampleValues = allData
                .map(item => this.getValueByPath(item, fieldPath))
                .filter(val => val !== undefined && val !== null)
                .slice(0, 10); // Limit sample size
            
            const fieldType = this.inferFieldType(value, sampleValues);
            
            analysis.push({
                path: fieldPath,
                type: fieldType,
                sampleValues,
                isAttribute,
                patterns: this.detectPatterns(sampleValues)
            });
            
            // Recursively analyze nested objects
            if (fieldType === 'object' && value && typeof value === 'object') {
                this.extractFieldPaths(value, fieldPath, analysis, allData);
            } else if (fieldType === 'array' && Array.isArray(value) && value.length > 0) {
                if (typeof value[0] === 'object') {
                    this.extractFieldPaths(value[0], `${fieldPath}[0]`, analysis, allData);
                }
            }
        }
    }

    /**
     * Get value from object by dot notation path
     */
    private static getValueByPath(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => {
            if (current && typeof current === 'object') {
                return current[key];
            }
            return undefined;
        }, obj);
    }

    /**
     * Infer field type from value and samples
     */
    private static inferFieldType(value: any, samples: any[]): string {
        if (Array.isArray(value)) return 'array';
        if (value && typeof value === 'object') return 'object';
        
        // Analyze samples for better type inference
        const types = samples.map(s => typeof s);
        const uniqueTypes = [...new Set(types)];
        
        if (uniqueTypes.length === 1) {
            return uniqueTypes[0];
        }
        
        return typeof value;
    }

    /**
     * Detect patterns in sample values (emails, dates, IDs, etc.)
     */
    private static detectPatterns(samples: any[]): string[] {
        const patterns: string[] = [];
        const stringSamples = samples.filter(s => typeof s === 'string');
        
        if (stringSamples.length === 0) return patterns;
        
        // Email pattern
        if (stringSamples.some(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))) {
            patterns.push('email');
        }
        
        // Date patterns
        if (stringSamples.some(s => /^\d{4}-\d{2}-\d{2}/.test(s))) {
            patterns.push('date');
        }
        
        // ID patterns (numeric or alphanumeric IDs)
        if (stringSamples.some(s => /^[A-Z0-9]+$/i.test(s))) {
            patterns.push('id');
        }
        
        // Phone patterns
        if (stringSamples.some(s => /[\+]?[\d\s\-\(\)]{8,}/.test(s))) {
            patterns.push('phone');
        }
        
        // Currency patterns
        if (stringSamples.some(s => /[\$\€\£]\d+/.test(s))) {
            patterns.push('currency');
        }
        
        return patterns;
    }

    /**
     * Analyze target schema structure
     */
    private static analyzeTargetStructure(fields: SchemaField[]): FieldAnalysis[] {
        const analysis: FieldAnalysis[] = [];
        
        this.extractTargetPaths(fields, '', analysis);
        
        return analysis;
    }

    /**
     * Extract paths from target schema fields
     */
    private static extractTargetPaths(
        fields: SchemaField[], 
        currentPath: string, 
        analysis: FieldAnalysis[]
    ): void {
        for (const field of fields) {
            const fieldPath = currentPath ? `${currentPath}.${field.name}` : field.name;
            
            analysis.push({
                path: fieldPath,
                type: field.type,
                sampleValues: [],
                isAttribute: field.isAttribute
            });
            
            if (field.children && field.children.length > 0) {
                this.extractTargetPaths(field.children, fieldPath, analysis);
            }
        }
    }

    /**
     * Find the best source field match for a target field
     */
    private static findBestSourceMatch(
        targetField: FieldAnalysis, 
        sourceFields: FieldAnalysis[]
    ): MappingSuggestion | null {
        const candidates: Array<{ field: FieldAnalysis; score: number; reason: string }> = [];
        
        for (const sourceField of sourceFields) {
            const score = this.calculateMatchScore(targetField, sourceField);
            if (score > 0.3) { // Minimum confidence threshold
                candidates.push({
                    field: sourceField,
                    score,
                    reason: this.getMatchReason(targetField, sourceField, score)
                });
            }
        }
        
        if (candidates.length === 0) return null;
        
        // Sort by score and return the best match
        candidates.sort((a, b) => b.score - a.score);
        const bestMatch = candidates[0];
        
        return {
            sourceFieldPath: bestMatch.field.path,
            targetFieldPath: targetField.path,
            confidence: bestMatch.score,
            reason: bestMatch.reason,
            transformRequired: this.getRequiredTransform(targetField, bestMatch.field)
        };
    }

    /**
     * Calculate match score between target and source fields
     */
    private static calculateMatchScore(target: FieldAnalysis, source: FieldAnalysis): number {
        let score = 0;
        
        // Name similarity (most important factor)
        const nameSimilarity = this.calculateNameSimilarity(target.path, source.path);
        score += nameSimilarity * 0.5;
        
        // Type compatibility
        const typeCompatibility = this.calculateTypeCompatibility(target.type, source.type);
        score += typeCompatibility * 0.3;
        
        // Pattern matching
        const patternMatch = this.calculatePatternMatch(target, source);
        score += patternMatch * 0.2;
        
        return Math.min(score, 1.0); // Cap at 1.0
    }

    /**
     * Calculate name similarity using various techniques
     */
    private static calculateNameSimilarity(targetName: string, sourceName: string): number {
        const target = targetName.toLowerCase().replace(/[@#]/g, '');
        const source = sourceName.toLowerCase().replace(/[@#]/g, '');
        
        // Exact match
        if (target === source) return 1.0;
        
        // Contains match
        if (target.includes(source) || source.includes(target)) return 0.8;
        
        // Common substrings
        const targetWords = target.split(/[._\-\s]/);
        const sourceWords = source.split(/[._\-\s]/);
        
        const commonWords = targetWords.filter(word => 
            sourceWords.some(sourceWord => 
                word === sourceWord || word.includes(sourceWord) || sourceWord.includes(word)
            )
        );
        
        if (commonWords.length > 0) {
            return 0.6 * (commonWords.length / Math.max(targetWords.length, sourceWords.length));
        }
        
        // Levenshtein distance for similar names
        const distance = this.levenshteinDistance(target, source);
        const maxLength = Math.max(target.length, source.length);
        const similarity = 1 - (distance / maxLength);
        
        return similarity > 0.5 ? similarity * 0.4 : 0;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    private static levenshteinDistance(str1: string, str2: string): number {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Calculate type compatibility between target and source types
     */
    private static calculateTypeCompatibility(targetType: string, sourceType: string): number {
        if (targetType === sourceType) return 1.0;
        
        // Compatible type mappings
        const compatibleTypes: Record<string, string[]> = {
            'string': ['string', 'number', 'boolean'],
            'number': ['number', 'string'],
            'boolean': ['boolean', 'string'],
            'date': ['string', 'date'],
            'object': ['object'],
            'array': ['array']
        };
        
        if (compatibleTypes[targetType]?.includes(sourceType)) {
            return targetType === sourceType ? 1.0 : 0.7;
        }
        
        return 0.2; // Minimal compatibility for any type conversion
    }

    /**
     * Calculate pattern matching score
     */
    private static calculatePatternMatch(target: FieldAnalysis, source: FieldAnalysis): number {
        if (!source.patterns || source.patterns.length === 0) return 0;
        
        const targetName = target.path.toLowerCase();
        let score = 0;
        
        for (const pattern of source.patterns) {
            switch (pattern) {
                case 'email':
                    if (targetName.includes('email') || targetName.includes('mail')) score += 0.8;
                    break;
                case 'date':
                    if (targetName.includes('date') || targetName.includes('time')) score += 0.8;
                    break;
                case 'id':
                    if (targetName.includes('id') || targetName.includes('key')) score += 0.7;
                    break;
                case 'phone':
                    if (targetName.includes('phone') || targetName.includes('tel')) score += 0.8;
                    break;
                case 'currency':
                    if (targetName.includes('price') || targetName.includes('cost') || targetName.includes('amount')) score += 0.7;
                    break;
            }
        }
        
        return Math.min(score, 1.0);
    }

    /**
     * Get human-readable reason for the match
     */
    private static getMatchReason(target: FieldAnalysis, source: FieldAnalysis, score: number): string {
        const reasons: string[] = [];
        
        if (target.path.toLowerCase() === source.path.toLowerCase()) {
            reasons.push('exact name match');
        } else if (target.path.toLowerCase().includes(source.path.toLowerCase()) || 
                   source.path.toLowerCase().includes(target.path.toLowerCase())) {
            reasons.push('name contains match');
        }
        
        if (target.type === source.type) {
            reasons.push('same data type');
        }
        
        if (source.patterns) {
            const relevantPatterns = source.patterns.filter(pattern => {
                const targetName = target.path.toLowerCase();
                return (pattern === 'email' && targetName.includes('email')) ||
                       (pattern === 'date' && targetName.includes('date')) ||
                       (pattern === 'id' && targetName.includes('id'));
            });
            if (relevantPatterns.length > 0) {
                reasons.push(`detected ${relevantPatterns.join(', ')} pattern`);
            }
        }
        
        if (reasons.length === 0) {
            reasons.push('structural similarity');
        }
        
        return reasons.join(', ');
    }

    /**
     * Determine if transformation is required
     */
    private static getRequiredTransform(target: FieldAnalysis, source: FieldAnalysis): string | undefined {
        if (target.type === source.type) return undefined;
        
        if (target.type === 'string' && source.type === 'number') {
            return 'toString';
        }
        
        if (target.type === 'number' && source.type === 'string') {
            return 'parseNumber';
        }
        
        if (target.type === 'date' && source.type === 'string') {
            return 'parseDate';
        }
        
        if (target.type === 'boolean' && source.type === 'string') {
            return 'parseBoolean';
        }
        
        return 'convert';
    }

    /**
     * Parse XML input and analyze its structure for smart mapping
     */
    static analyzeXmlStructure(xmlInput: string): FieldAnalysis[] {
        try {
            const jsonData = XmlJsonConverter.xmlToJsonEnhanced(xmlInput);
            const rootKey = Object.keys(jsonData)[0];
            const rootData = jsonData[rootKey];
            
            // Convert to array for consistent analysis
            const dataArray = Array.isArray(rootData) ? rootData : [rootData];
            
            return this.analyzeSourceStructure(dataArray);
        } catch (error) {
            console.error('❌ XML structure analysis failed:', error);
            return [];
        }
    }
}