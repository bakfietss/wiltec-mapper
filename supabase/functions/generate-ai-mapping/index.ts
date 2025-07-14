import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function convertMappingsToCanvas(mappings: MappingSuggestion[]) {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];
  const addedNodeIds = new Set<string>();

  for (const map of mappings) {
    const targetId = `target_${map.target_field}`;
    if (!addedNodeIds.has(targetId)) {
      nodes.push({ id: targetId, type: "TargetNode", label: map.target_field });
      addedNodeIds.add(targetId);
    }

    let nodeId = "";
    let node: CanvasNode | null = null;

    const addSource = (field: string) => {
      const sourceId = `source_${field}`;
      if (!addedNodeIds.has(sourceId)) {
        nodes.push({ id: sourceId, type: "SourceNode", label: field });
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
        node = { 
          id: nodeId, 
          type: "ConversionMappingNode", 
          source: map.source_field, 
          mappingTable: map.table 
        };
        edges.push({ type: "edge", from, to: nodeId });
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
        edges.push({ type: "edge", from, to: nodeId });
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
          edges.push({ type: "edge", from, to: nodeId });
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
        edges.push({ type: "edge", from, to: nodeId });
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

function applyTemplate(aiCanvasResult: { nodes: any[]; edges: any[] }) {
  const layout = calculateLayout(aiCanvasResult.nodes);
  
  const nodes = aiCanvasResult.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: layout[n.id] || { x: 100, y: 100 },
    data: { ...n }
  }));

  const edges = aiCanvasResult.edges.map((e) => ({
    id: `${e.from}-${e.to}`,
    source: e.from,
    target: e.to
  }));

  return { nodes, edges };
}

function calculateLayout(nodes: any[]): Record<string, { x: number; y: number }> {
  const layout: Record<string, { x: number; y: number }> = {};
  
  // Group nodes by type for better layout
  const targetNodes = nodes.filter(n => n.type === 'TargetNode');
  const sourceNodes = nodes.filter(n => n.type === 'SourceNode');
  const transformNodes = nodes.filter(n => !['TargetNode', 'SourceNode'].includes(n.type));

  // Position targets on the left
  targetNodes.forEach((node, i) => {
    layout[node.id] = { x: 100, y: 100 + (i * 120) };
  });

  // Position sources on the right
  sourceNodes.forEach((node, i) => {
    layout[node.id] = { x: 800, y: 100 + (i * 120) };
  });

  // Position transforms in the middle
  transformNodes.forEach((node, i) => {
    layout[node.id] = { x: 450, y: 100 + (i * 120) };
  });

  return layout;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceData, targetData } = await req.json();

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
${JSON.stringify(sourceData, null, 2)}

Target Sample:
${JSON.stringify(targetData, null, 2)}

Return a JSON array:
[
  {
    "target_field": "...",
    "mapping_type": "...",
    ...
  }
]
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
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

    const aiResult = await response.json();
    const raw = aiResult.choices[0]?.message?.content || "";
    
    const jsonStart = raw.indexOf("[");
    const jsonEnd = raw.lastIndexOf("]") + 1;
    const jsonString = raw.slice(jsonStart, jsonEnd);

    const parsed = JSON.parse(jsonString);
    const canvas = convertMappingsToCanvas(parsed);
    const reactFlowOutput = applyTemplate(canvas);

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