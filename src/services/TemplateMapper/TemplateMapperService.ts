
import { supabase } from '@/integrations/supabase/client';
import { convertMappingsToCanvas, type MappingSuggestion } from './AiToCanvas';
import { applyTemplate } from './GenerateCanvas';
import { loadAndFlatten } from './FileProcessor';
import { redactSample } from '@/utils/redact';

const MAX_SAMPLES = 20;

function estimateTokens(source: any[], target: any[]): number {
    const promptSize =
        JSON.stringify(source, null, 2).length +
        JSON.stringify(target, null, 2).length;
    return Math.round(promptSize / 4); // Rough estimate: 1 token ≈ 4 chars
}

function redactAll(data: any[]): any[] {
    return data.map(redactSample);
}

export class TemplateMapperService {
    static async generateMappingFromFiles(
        sourceFile: File,
        targetFile: File
    ): Promise<{ nodes: any[], edges: any[] }> {
        try {
            // Load and process files
            const fullSource = await loadAndFlatten(sourceFile);
            const fullTarget = await loadAndFlatten(targetFile);

            const source = fullSource.slice(0, MAX_SAMPLES);
            const target = fullTarget.slice(0, MAX_SAMPLES);

            const redactedSource = redactAll(source);
            const redactedTarget = redactAll(target);

            console.log("🟡 Sending these samples to AI...");
            console.log("📤 Redacted Source:", redactedSource[0]);
            console.log("📤 Redacted Target:", redactedTarget[0]);

            const estimatedTokens = estimateTokens(redactedSource, redactedTarget);
            console.log(`📊 Estimated tokens: ~${estimatedTokens} (≈ €${(estimatedTokens / 1000 * 0.01).toFixed(3)} EUR)`);

            // Call the edge function
            const { data, error } = await supabase.functions.invoke('generate-ai-mapping', {
                body: {
                    sourceData: redactedSource,
                    targetData: redactedTarget
                }
            });

            if (error) {
                throw new Error(`AI mapping generation failed: ${error.message}`);
            }

            const mappings: MappingSuggestion[] = data.mappings;
            console.log("\n✅ AI Mapping Suggestions:\n", mappings);

            const nodesAndEdges = convertMappingsToCanvas(mappings);
            console.log("\n🎨 Canvas-Ready Nodes and Edges:\n", nodesAndEdges);

            const reactFlowReady = applyTemplate(nodesAndEdges);
            console.log("\n🧪 React Flow–Ready Output:\n", reactFlowReady);

            return reactFlowReady;
        } catch (error) {
            console.error('Error generating template mapping:', error);
            throw error;
        }
    }
}
