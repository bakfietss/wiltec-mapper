import { RedactionConfig, redactArray } from '../input-processor/redact';
import { supabase } from '@/integrations/supabase/client';
import { ApiKeyService } from '@/services/ApiKeyService';

// Constants
const MAX_SAMPLES = 20;

// Define interfaces for mapping suggestions
export interface MappingSuggestion {
  source_field?: string;
  source_fields?: string[];
  target_field: string;
  mapping_type: 'direct' | 'static' | 'conditional' | 'concat' | 'split' | 'table' | 'date_conversion' | 'skip';
  separator?: string;
  format?: string;
  value?: string;
  conditions?: string;
  delimiter?: string;
  index?: number;
  table?: Record<string, string>;
  reasoning?: string;
}

// Define interfaces for canvas nodes and edges
export interface CanvasNode {
  id: string;
  type: string;
  [key: string]: any;
}

export interface CanvasEdge {
  type: "edge" | "direct";
  from: string;
  to: string;
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

// Define interface for OpenAI response
export interface OpenAIResponse {
  mappings: MappingSuggestion[];
  rawResponse: string;
  sentSourceData?: any[];
  sentTargetData?: any[];
  canvasNodes?: CanvasNode[];
  canvasEdges?: CanvasEdge[];
  flowNodes?: FlowNode[];
  flowEdges?: FlowEdge[];
  prompt?: string;
}

// Helper function to estimate tokens in a string
function estimateTokens(sourceData: any[], targetData: any[]): number {
  const promptSize = 
    JSON.stringify(sourceData, null, 2).length + 
    JSON.stringify(targetData, null, 2).length;
  return Math.round(promptSize / 4); // Approx. 1 token ≈ 4 characters
}

// Helper function to simplify complex data structures for API requests
function simplifyDataForAPI(data: any[]): any[] {
  // If we have more than 5 fields in each object, keep only the first 10 fields
  return data.map(item => {
    if (typeof item !== 'object' || item === null) return item;
    
    const keys = Object.keys(item);
    if (keys.length <= 5) return item; // Simple enough, keep as is
    
    // For complex objects, keep only the first 10 fields
    const simplified: Record<string, any> = {};
    keys.slice(0, 10).forEach(key => {
      simplified[key] = item[key];
    });
    
    return simplified;
  });
}

// Main function to generate mappings using OpenAI
export async function generateMappings(
  sourceData: any[],
  targetData: any[],
  redactionConfig: RedactionConfig
): Promise<OpenAIResponse> {
  // Limit to MAX_SAMPLES samples for both source and target data
  const limitedSourceData = sourceData.slice(0, MAX_SAMPLES);
  const limitedTargetData = targetData.slice(0, MAX_SAMPLES);
  
  // Redact sensitive data
  const redactedSourceData = redactArray(limitedSourceData, redactionConfig);
  const redactedTargetData = redactArray(limitedTargetData, redactionConfig);
  
  // Further simplify complex data structures to reduce token count
  const simplifiedSourceData = simplifyDataForAPI(redactedSourceData);
  const simplifiedTargetData = simplifyDataForAPI(redactedTargetData);
  
  // Get OpenAI API key from the database
  // First check if we have any OpenAI API keys in the database
  const { data: apiKeys, error } = await supabase
    .from('api_keys')
    .select('*')
    .like('description', 'OpenAI API Key%')
    .eq('status', 'active')
    .eq('revoked', false)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Failed to fetch OpenAI API key:', error);
    throw new Error('Failed to fetch OpenAI API key. Please check your database connection.');
  }
  
  // Filter out expired keys
  const validKeys = apiKeys?.filter(key => !ApiKeyService.isExpired(key.expires_at)) || [];
  
  let apiKey;
  
  if (validKeys.length === 0) {
    // Fallback to localStorage if no valid keys in database
    apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please add it in API Key Manager.');
    }
  } else {
    // Use the most recently created valid key
    apiKey = validKeys[0].key;
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please add it in API Key Manager.');
    }
  }

  // Construct the prompt
  const prompt = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a data mapping assistant. Analyze and suggest structured field mappings in JSON."
      },
      {
        role: "user",
        content: `
You are a smart field mapping assistant. Match fields between the source and target data based on naming, patterns, or logic. Analyze the data carefully to identify patterns and relationships.

For each target field, classify the mapping type:
- "direct": a field with the same meaning in the source
- "static": a hardcoded value (provide "value")
- "conditional": logic based on field values (provide "conditions" as an array of {condition, value} objects)
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
${JSON.stringify(simplifiedSourceData, null, 2)}

Target Sample:
${JSON.stringify(simplifiedTargetData, null, 2)}

## Identifying Conditional Mappings
When analyzing the data, look for patterns that suggest conditional logic:
- Fields that appear to have different values based on conditions in other fields
- Target fields that don't directly match source fields but follow logical patterns
- Values that change based on thresholds, categories, or other criteria

For example, if you notice that a target field seems to have values like "FT" or "PT" that correlate with percentage values in the source data, consider creating a conditional mapping with appropriate conditions.

## Output Format
Provide your results as a JSON array with the following structure:
[
  {
    "target_field": "...",
    "mapping_type": "...",
    // Additional fields based on mapping_type
  }
]

For conditional mappings, be sure to include the full conditions array with condition expressions and values. Each condition should clearly specify when a particular value should be used.`
      }
    ],
    temperature: 0.2,
    max_tokens: 4000
  };

  // Estimate tokens based on the source and target data
  const estimatedTokens = estimateTokens(simplifiedSourceData, simplifiedTargetData);
  
  // Log token estimation but don't enforce a hard limit
  console.log(`📊 Estimated tokens: ~${estimatedTokens} (≈ €${(estimatedTokens * 0.00001).toFixed(3)} EUR)`);
  
  // Prepare the prompt content
  const promptContent = `
You are a smart field mapping assistant. Match fields between the source and target data based on naming, patterns, or logic. Analyze the data carefully to identify patterns and relationships.

For each target field, classify the mapping type:
- "direct": a field with the same meaning in the source
- "static": a hardcoded value (provide "value")
- "conditional": logic based on field values (provide "conditions" as an array of {condition, value} objects)
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
${JSON.stringify(simplifiedSourceData, null, 2)}

Target Sample:
${JSON.stringify(simplifiedTargetData, null, 2)}

## Identifying Conditional Mappings
When analyzing the data, look for patterns that suggest conditional logic:
- Fields that appear to have different values based on conditions in other fields
- Target fields that don't directly match source fields but follow logical patterns
- Values that change based on thresholds, categories, or other criteria

For example, if you notice that a target field seems to have values like "FT" or "PT" that correlate with percentage values in the source data, consider creating a conditional mapping with appropriate conditions.

## Output Format
Provide your results as a JSON array with the following structure:
[
  {
    "target_field": "...",
    "mapping_type": "...",
    // Additional fields based on mapping_type
  }
]

For conditional mappings, be sure to include the full conditions array with condition expressions and values. Each condition should clearly specify when a particular value should be used.
`;
  
  // Update the prompt messages
  prompt.messages[1].content = promptContent;

  // Log the request details in a user-friendly format
  console.log('🟡 Sending these samples to AI...');
  console.log('📤 Redacted Source:', simplifiedSourceData[0]);
  console.log('📤 Redacted Target:', simplifiedTargetData[0]);
  console.log('📊 Estimated tokens: ~' + estimatedTokens + ' (≈ €' + (estimatedTokens * 0.00001).toFixed(3) + ' EUR)');
  
  console.log('📝 Messages sent to OpenAI:');
  console.log(' ', JSON.stringify(prompt.messages, null, 2));
  
  // Also log detailed debugging information
  console.group('Detailed OpenAI Request Information (Expand to view)');
  console.log('API Key (first 4 chars):', apiKey.substring(0, 4) + '...');
  console.log('Model:', prompt.model);
  console.log('Temperature:', prompt.temperature);
  console.log('Max Tokens:', prompt.max_tokens);
  console.log('System Message Length:', prompt.messages[0].content.length);
  console.log('User Message Length:', prompt.messages[1].content.length);
  console.log('Source Data Sample Count:', limitedSourceData.length);
  console.log('Target Data Sample Count:', limitedTargetData.length);
  console.log('Source Data Size (bytes) - After Redaction:', JSON.stringify(redactedSourceData).length);
  console.log('Target Data Size (bytes) - After Redaction:', JSON.stringify(redactedTargetData).length);
  console.log('Source Data Size (bytes) - After Simplification:', JSON.stringify(simplifiedSourceData).length);
  console.log('Target Data Size (bytes) - After Simplification:', JSON.stringify(simplifiedTargetData).length);
  console.log('Total Request Size (bytes):', JSON.stringify(prompt).length);
  console.log('Request URL:', 'https://api.openai.com/v1/chat/completions');
  console.log('Request Headers:', {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey.substring(0, 4)}...`
  });
  console.groupEnd();

  // Prepare the OpenAI client
  const openai = {
    async createChatCompletion(options: any) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(options)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }
      
      return await response.json();
    }
  };
  
  // Function to convert mappings to canvas nodes and edges
function convertMappingsToCanvas(mappings: MappingSuggestion[]): { nodes: CanvasNode[], edges: CanvasEdge[] } {
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
        if (map.source_field) {
          const from = addSource(map.source_field);
          edges.push({ type: "direct", from, to: targetId });
        }
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
        if (map.source_field) {
          nodeId = `convert_${map.target_field}`;
          const from = addSource(map.source_field);
          node = { id: nodeId, type: "ConversionMappingNode", source: map.source_field, mappingTable: map.table };
          edges.push({ type: "direct", from, to: nodeId });
        }
        break;
      }

      case "date_conversion": {
        if (map.source_field) {
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
        }
        break;
      }

      case "concat": {
        if (map.source_fields) {
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
        }
        break;
      }

      case "split": {
        if (map.source_field) {
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
        }
        break;
      }

      case "skip":
        continue;

      default:
        console.warn(`⚠️ Unknown mapping type: ${map.mapping_type}`);
        continue;
    }

    if (node) {
      if (!addedNodeIds.has(nodeId)) {
        nodes.push(node);
        addedNodeIds.add(nodeId);
      }
      edges.push({ type: "direct", from: nodeId, to: targetId });
    }
  }

  return { nodes, edges };
}

// Function to convert canvas nodes and edges to React Flow format
function applyTemplate(aiCanvasResult: { nodes: CanvasNode[]; edges: CanvasEdge[] }): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const mapToCanvasNodeType = (type: string): string => {
    if (type === "TargetFieldNode") return "TargetNode";
    if (type === "SourceFieldNode") return "SourceNode";
    return type;
  };

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

// Call OpenAI API
  try {
    // Log response status
    console.log('Calling OpenAI API...');
    
    const response = await openai.createChatCompletion({
      model: prompt.model,
      messages: prompt.messages,
      temperature: prompt.temperature,
      max_tokens: prompt.max_tokens
    });
    
    const rawResponse = response.choices[0].message.content;
    
    // Extract JSON from the response
    const jsonStart = rawResponse.indexOf('[');
    const jsonEnd = rawResponse.lastIndexOf(']') + 1;
    const jsonString = rawResponse.slice(jsonStart, jsonEnd);
    
    // Parse the JSON response
    try {
      const mappings = JSON.parse(jsonString);
      const mappingsArray = Array.isArray(mappings) ? mappings : [];
      
      // Convert mappings to canvas format
      const { nodes: canvasNodes, edges: canvasEdges } = convertMappingsToCanvas(mappingsArray);
      
      // Convert canvas format to React Flow format
      const { nodes: flowNodes, edges: flowEdges } = applyTemplate({ nodes: canvasNodes, edges: canvasEdges });
      
      return {
        mappings: mappingsArray,
        rawResponse,
        sentSourceData: simplifiedSourceData,
        sentTargetData: simplifiedTargetData,
        canvasNodes,
        canvasEdges,
        flowNodes,
        flowEdges,
        prompt: promptContent
      };
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      // Try parsing the entire response as a fallback
      try {
        const mappings = JSON.parse(rawResponse);
        const mappingsArray = Array.isArray(mappings) ? mappings : [];
        
        // Convert mappings to canvas format
        const { nodes: canvasNodes, edges: canvasEdges } = convertMappingsToCanvas(mappingsArray);
        
        // Convert canvas format to React Flow format
        const { nodes: flowNodes, edges: flowEdges } = applyTemplate({ nodes: canvasNodes, edges: canvasEdges });
        
        return {
          mappings: mappingsArray,
          rawResponse,
          sentSourceData: simplifiedSourceData,
          sentTargetData: simplifiedTargetData,
          canvasNodes,
          canvasEdges,
          flowNodes,
          flowEdges,
          prompt: promptContent
        };
      } catch (e) {
        console.error('Failed to parse entire response as JSON:', e);
        return {
          mappings: [],
          rawResponse,
          sentSourceData: simplifiedSourceData,
          sentTargetData: simplifiedTargetData,
          canvasNodes: [],
          canvasEdges: [],
          flowNodes: [],
          flowEdges: [],
          prompt: promptContent
        };
      }
    }
  } catch (error: any) {
    console.error('OpenAI API call failed:', error);
    throw new Error(`Failed to generate mappings: ${error.message}`);
  }
}