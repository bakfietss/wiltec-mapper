
import { generateMappings } from '@/templatemapper/services/AIConnectionGenerator';

import type { MappingSuggestion, OpenAIResponse } from '@/templatemapper/services/AIConnectionGenerator';

// Re-export the interfaces
export type { MappingSuggestion, OpenAIResponse };

// Define the FieldMatch interface needed by SmartConnectionDialog
export interface FieldMatch {
  fieldId: string;
  fieldName: string;
  confidence: number;
  reasoning?: string;
}

// Rename the class to reflect its broader purpose
export class AIMappingService {
  // Method used by SmartConnectionDialog
  suggestConnection(sourceField: string, targetSchema: any[]): {
    bestMatch?: FieldMatch;
    alternatives: FieldMatch[];
    question?: string;
  } {
    // Simple implementation that extracts field IDs from the target schema
    // and calculates a basic confidence score based on string similarity
    const matches: FieldMatch[] = targetSchema
      .map(field => {
        const fieldId = field.id || field.name || '';
        const fieldName = field.name || field.id || '';
        
        // Calculate simple string similarity
        const sourceLower = sourceField.toLowerCase();
        const targetLower = fieldName.toLowerCase();
        
        let confidence = 0;
        
        // Exact match
        if (sourceLower === targetLower) {
          confidence = 100;
        } 
        // Contains the full name
        else if (sourceLower.includes(targetLower) || targetLower.includes(sourceLower)) {
          confidence = 80;
        }
        // Partial match
        else {
          // Count matching words
          const sourceWords = sourceLower.split(/[^a-z0-9]+/);
          const targetWords = targetLower.split(/[^a-z0-9]+/);
          
          const matchingWords = sourceWords.filter(word => 
            targetWords.some(targetWord => targetWord.includes(word) || word.includes(targetWord))
          );
          
          confidence = Math.round((matchingWords.length / Math.max(sourceWords.length, targetWords.length)) * 70);
        }
        
        return {
          fieldId,
          fieldName,
          confidence,
          reasoning: `Field name similarity: ${confidence}%`
        };
      })
      .filter(match => match.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence);
    
    return {
      bestMatch: matches.length > 0 ? matches[0] : undefined,
      alternatives: matches.slice(1, 5), // Return up to 4 alternatives
      question: matches.length === 0 ? 
        `I couldn't find a good match for "${sourceField}". Please select the appropriate target field manually.` : 
        undefined
    };
  }
  
  // Add any other methods that might be needed by components using this service
  async generateMappings(sourceData: any[], targetData: any[], redactionConfig: any): Promise<OpenAIResponse> {
    return generateMappings(sourceData, targetData, redactionConfig);
  }
}