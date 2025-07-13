
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Your flatten.ts code
export type FlatObject = { [key: string]: any };

export function flattenObject(obj: any, prefix = ''): FlatObject {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flattenObject(value, fullKey));
    } else if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'object') {
      Object.assign(acc, flattenObject(value[0], fullKey));
    } else {
      acc[fullKey] = value;
    }
    return acc;
  }, {} as FlatObject);
}

// Your redact.ts code
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

function isEmail(value: any): boolean {
    return typeof value === "string" && EMAIL_REGEX.test(value);
}

function isLikelyName(key: string, value: any): boolean {
    const nameKeywords = ["name", "roepnaam", "achternaam", "voorvoegsel", "firstname", "lastname", "middlename"];
    return typeof value === "string" && nameKeywords.some(k => key.toLowerCase().includes(k));
}

export function redactSample(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
        if (isEmail(val)) {
            result[key] = "<email>";
        } else if (isLikelyName(key, val)) {
            result[key] = "<name>";
        } else {
            result[key] = val;
        }
    }
    return result;
}

// Your aitocanvas.ts code
type MappingSuggestion =
    | {
        target_field: string;
        mapping_type: "direct";
        source_field: string;
    }
    | {
        target_field: string;
        mapping_type: "static";
        value: string;
    }
    | {
        target_field: string;
        mapping_type: "conditional";
        conditions: Array<{ condition: string; value: string }>;
    }
    | {
        target_field: string;
        mapping_type: "table";
        source_field: string;
        table: Record<string, string>;
    }
    | {
        target_field: string;
        mapping_type: "date_conversion";
        source_field: string;
        format: string;
    }
    | {
        target_field: string;
        mapping_type: "concat";
        source_fields: string[];
        separator: string;
    }
    | {
        target_field: string;
        mapping_type: "split";
        source_field: string;
        delimiter: string;
        index: number;
    }
    | {
        target_field: string;
        mapping_type: "skip";
    };

interface CanvasNode {
    id: string;
    type: string;
    [key: string]: any;
}

interface CanvasEdge {
    type: "edge" | "direct";
    from: string;
    to: string;
}

export function convertMappingsToCanvas(mappings: MappingSuggestion[]) {
    const nodes: CanvasNode[] = [];
    const edges: CanvasEdge[] = [];
    const addedNodeIds = new Set<string>();

    for (const map of mappings) {
        const targetId = `target_${map.target_field}`;
        if (!addedNodeIds.has(targetId)) {
            nodes.push({ id: targetId, type: "TargetFieldNode", label: map.target_field });
            addedNodeIds.add(targetId);
        }

        let nodeId = "";
        let node: CanvasNode | null = null;

        const addSource = (field: string) => {
            const sourceId = `source_${field}`;
            if (!addedNodeIds.has(sourceId)) {
                nodes.push({ id: sourceId, type: "SourceFieldNode", label: field });
                addedNodeIds.add(sourceId);
            }
            return sourceId;
        };

        switch (map.mapping_type) {
            case "direct": {
                const from = addSource(map.source_field);
                edges.push({ type: "direct", from, to: targetId });
                continue;
            }

            case "static":
                nodeId = `static_${map.target_field}`;
                node = { id: nodeId, type: "StaticValueNode", value: map.value };
                break;

            case "conditional":
                nodeId = `if_${map.target_field}`;
                node = { id: nodeId, type: "IfThenNode", conditions: map.conditions };
                break;

            case "table": {
                nodeId = `convert_${map.target_field}`;
                const from = addSource(map.source_field);
                node = { id: nodeId, type: "ConversionMappingNode", source: map.source_field, mappingTable: map.table };
                edges.push({ type: "direct", from, to: nodeId });
                break;
            }

            case "date_conversion": {
                nodeId = `date_${map.target_field}`;
                const from = addSource(map.source_field);
                node = {
                    id: nodeId,
                    type: "TransformNode",
                    source: map.source_field,
                    stringOperation: "dateFormat",
                    format: map.format,
                    autoDetect: true
                };
                edges.push({ type: "direct", from, to: nodeId });
                break;
            }

            case "concat": {
                nodeId = `concat_${map.target_field}`;
                node = {
                    id: nodeId,
                    type: "TransformNode",
                    stringOperation: "concat",
                    sourceFields: map.source_fields,
                    separator: map.separator ?? " "
                };
                for (const field of map.source_fields) {
                    const from = addSource(field);
                    edges.push({ type: "direct", from, to: nodeId });
                }
                break;
            }

            case "split": {
                nodeId = `split_${map.target_field}`;
                const from = addSource(map.source_field);
                node = {
                    id: nodeId,
                    type: "TransformNode",
                    stringOperation: "split",
                    source: map.source_field,
                    delimiter: map.delimiter,
                    index: map.index
                };
                edges.push({ type: "direct", from, to: nodeId });
                break;
            }

            case "skip":
                continue;

            default:
                console.warn(`⚠️ Unknown mapping type: ${(map as any)["mapping_type"]}`);
                continue;
        }

        if (node && !addedNodeIds.has(node.id)) {
            nodes.push(node);
            addedNodeIds.add(node.id);
        }

        edges.push({ type: "edge", from: nodeId, to: targetId });
    }

    return { nodes, edges };
}

// Your generatecanvas.ts code
interface FlowNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: any;
}

interface FlowEdge {
    id: string;
    source: string;
    target: string;
}

function mapToCanvasNodeType(type: string): string {
    if (type === "TargetFieldNode") return "TargetNode";
    if (type === "SourceFieldNode") return "SourceNode";
    return type;
}

export function applyTemplate(aiCanvasResult: {
    nodes: any[];
    edges: any[];
}) {
    const nodes: FlowNode[] = aiCanvasResult.nodes.map((n, index) => ({
        id: n.id,
        type: mapToCanvasNodeType(n.type),
        position: { x: 100 + index * 300, y: 100 },
        data: { ...n }
    }));

    const edges: FlowEdge[] = aiCanvasResult.edges.map((e) => ({
        id: `${e.from}-${e.to}`,
        source: e.from,
        target: e.to
    }));

    return { nodes, edges };
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Edge function called');
    const { sourceData, targetData } = await req.json();
    console.log('📥 Received data:', { sourceCount: sourceData?.length, targetCount: targetData?.length });

    // Get OpenAI API key from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: apiKeys, error: keyError } = await supabase
      .from('api_keys')
      .select('key')
      .eq('status', 'active')
      .eq('revoked', false)
      .ilike('key', 'sk-proj-%')
      .limit(1);

    if (keyError || !apiKeys || apiKeys.length === 0) {
      console.error('❌ No OpenAI API key found in database');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not found in database' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const openAIApiKey = apiKeys[0].key.trim();
    console.log('✅ OpenAI API key found in database, length:', openAIApiKey.length);

    const source = sourceData.slice(0, MAX_SAMPLES);
    const target = targetData.slice(0, MAX_SAMPLES);

    const redactedSource = redactAll(source);
    const redactedTarget = redactAll(target);

    console.log("🟡 Sending these samples to AI...");
    console.log("📤 Redacted Source:", redactedSource[0]);
    console.log("📤 Redacted Target:", redactedTarget[0]);

    const estimatedTokens = estimateTokens(redactedSource, redactedTarget);
    console.log(`📊 Estimated tokens: ~${estimatedTokens} (≈ €${(estimatedTokens / 1000 * 0.01).toFixed(3)} EUR)`);

    const prompt = `
You are a smart field mapping assistant. Match fields between the source and target data based on naming, patterns, or logic.

For each target field, classify the mapping type:
- "direct": a field with the same meaning in the source
- "static": a hardcoded value (provide "value")
- "conditional": logic like if-then (provide "conditions")
- "concat": join multiple fields (provide "source_fields" and "separator")
- "split": extract part of a field (provide "source_field", "delimiter", and "index")
- "table": value-to-value lookup (provide "source_field" and "table" map)
- "date_conversion": convert a date format (provide "format")
- "skip": no clear match

Examples:

{
  "target_field": "fullname",
  "mapping_type": "concat",
  "source_fields": ["Roepnaam", "Achternaam"],
  "separator": " "
}

Now match these samples:

Source Sample:
${JSON.stringify(redactedSource, null, 2)}

Target Sample:
${JSON.stringify(redactedTarget, null, 2)}

Return a JSON array:
[
  {
    "target_field": "...",
    "mapping_type": "...",
    ...
  }
]
`;

    console.log('🤖 Making OpenAI API call...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a data mapping assistant. Analyze and suggest structured field mappings in JSON.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
      }),
    });

    console.log('🤖 OpenAI response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const aiResult = await response.json();
    console.log('✅ OpenAI response received');
    
    if (!aiResult.choices || aiResult.choices.length === 0) {
      console.error('❌ No choices in OpenAI response:', aiResult);
      throw new Error('No choices returned from OpenAI API');
    }
    
    const raw = aiResult.choices[0]?.message?.content || "";
    console.log('📝 Raw AI response length:', raw.length);
    
    const jsonStart = raw.indexOf("[");
    const jsonEnd = raw.lastIndexOf("]") + 1;
    const jsonString = raw.slice(jsonStart, jsonEnd);

    console.log('🔍 Extracted JSON string length:', jsonString.length);

    const parsed = JSON.parse(jsonString);
    console.log("\n✅ AI Mapping Suggestions:\n");
    console.dir(parsed, { depth: null });

    const canvas = convertMappingsToCanvas(parsed);
    console.log("\n🎨 Canvas-Ready Nodes and Edges:\n");
    console.dir(canvas, { depth: null });

    const reactFlowOutput = applyTemplate(canvas);
    console.log("\n🧪 React Flow–Ready Output:\n");
    console.dir(reactFlowOutput, { depth: null });

    return new Response(
      JSON.stringify({ 
        mappings: parsed,
        canvas: reactFlowOutput 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-ai-mapping function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
