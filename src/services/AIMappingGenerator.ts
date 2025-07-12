import { supabase } from '@/integrations/supabase/client';

export interface AIMappingResult {
  mappings: any[];
  canvas: {
    nodes: any[];
    edges: any[];
  };
}

export class AIMappingGenerator {
  static async generateMapping(
    sourceData: any[], 
    targetData: any[]
  ): Promise<AIMappingResult> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-ai-mapping', {
        body: {
          sourceData: sourceData.slice(0, 5), // Limit samples for cost control
          targetData: targetData.slice(0, 5)
        }
      });

      if (error) {
        throw new Error(`AI mapping generation failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error generating AI mapping:', error);
      throw error;
    }
  }

  static async generateMappingFromFiles(
    sourceFile: File,
    targetFile: File
  ): Promise<AIMappingResult> {
    try {
      // Parse files to extract data
      const sourceData = await this.parseFile(sourceFile);
      const targetData = await this.parseFile(targetFile);

      return this.generateMapping(sourceData, targetData);
    } catch (error) {
      console.error('Error processing files for AI mapping:', error);
      throw error;
    }
  }

  private static async parseFile(file: File): Promise<any[]> {
    const text = await file.text();
    
    if (file.name.endsWith('.json')) {
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [data];
    }
    
    if (file.name.endsWith('.xml')) {
      // Basic XML parsing - you might want to use a proper XML parser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      
      // Extract data from XML - this is a simplified approach
      const items = Array.from(xmlDoc.getElementsByTagName('*'))
        .filter(el => el.children.length === 0 && el.textContent?.trim())
        .reduce((acc, el) => {
          const tagName = el.tagName;
          const value = el.textContent?.trim();
          if (tagName && value) {
            acc[tagName] = value;
          }
          return acc;
        }, {} as Record<string, string>);
      
      return [items];
    }

    throw new Error(`Unsupported file type: ${file.name}`);
  }
}