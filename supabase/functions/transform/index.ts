import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface TransformRequest {
  operationId: string;
  mappingName: string;
  category?: string;
  input: any;
}

interface TransformResponse {
  success: boolean;
  output?: any;
  error?: string;
  operationId: string;
  executionTime?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Get API key from header
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'API key is required',
        operationId: 'unknown'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate API key and get user
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('user_id, status, expires_at, last_used_at')
      .eq('key', apiKey)
      .eq('status', 'active')
      .eq('revoked', false)
      .single();

    if (keyError || !keyData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid API key',
        operationId: 'unknown'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if key is expired
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return new Response(JSON.stringify({
        success: false,
        error: 'API key has expired',
        operationId: 'unknown'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key', apiKey);

    // Parse request body
    const body: TransformRequest = await req.json();
    const { operationId, mappingName, category, input } = body;

    // Validate operationId - for now we only support JsonToJson
    if (operationId !== 'JsonToJson') {
      return new Response(JSON.stringify({
        success: false,
        error: `Unsupported operation: ${operationId}. Currently supported: JsonToJson`,
        operationId
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get active mapping for this user
    const { data: mapping, error: mappingError } = await supabase
      .rpc('get_active_mapping', {
        p_user_id: keyData.user_id,
        p_name: mappingName,
        p_category: category
      });

    if (mappingError || !mapping) {
      return new Response(JSON.stringify({
        success: false,
        error: `Mapping '${mappingName}' not found or not active`,
        operationId
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute transformation based on execution_config
    const executionConfig = mapping.execution_config;
    if (!executionConfig || !executionConfig.mappings) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Mapping has no execution configuration',
        operationId
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute the transformation
    const transformResult = await executeTransformation(input, executionConfig);
    const output = transformResult.output;
    const recordCount = transformResult.recordCount;
    const executionTime = Date.now() - startTime;

    // Log execution
    await supabase
      .from('mapping_logs')
      .insert({
        mapping_id: mapping.id,
        input_payload: input,
        output_payload: output,
        status: 'success',
        transform_type: mapping.transform_type,
        category: mapping.category,
        version: mapping.version
      });

    const response: TransformResponse = {
      success: true,
      output,
      operationId,
      executionTime
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Transform function error:', error);
    
    const executionTime = Date.now() - startTime;
    const errorResponse: TransformResponse = {
      success: false,
      error: error.message,
      operationId: 'unknown',
      executionTime
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function executeTransformation(input: any, executionConfig: any): Promise<{ output: any; recordCount: number }> {
  const output: any = {};
  let recordCount = 0;
  
  // Handle direct mappings
  if (executionConfig.mappings) {
    for (const mapping of executionConfig.mappings) {
      try {
        const value = await executeMappingRule(input, mapping);
        setNestedValue(output, mapping.to, value);
      } catch (error) {
        console.error(`Error executing mapping rule for ${mapping.to}:`, error);
        // Continue with other mappings
      }
    }
    // For direct mappings, we process 1 record
    recordCount = 1;
  }

  // Handle array mappings
  if (executionConfig.arrays) {
    for (const arrayMapping of executionConfig.arrays) {
      try {
        const arrayResult = await executeArrayMapping(input, arrayMapping);
        setNestedValue(output, arrayMapping.target, arrayResult);
        // Add the length of the array to record count
        recordCount += arrayResult.length;
      } catch (error) {
        console.error(`Error executing array mapping for ${arrayMapping.target}:`, error);
        // Continue with other mappings
      }
    }
  }

  // If no mappings were processed, default to 1 record
  if (recordCount === 0) {
    recordCount = 1;
  }

  return { output, recordCount };
}

async function executeMappingRule(input: any, mapping: any): Promise<any> {
  switch (mapping.type) {
    case 'direct':
      return getNestedValue(input, mapping.from);
    
    case 'static':
      return mapping.value;
    
    case 'ifThen':
      const sourceValue = getNestedValue(input, mapping.from);
      const condition = evaluateCondition(sourceValue, mapping.if);
      return condition ? mapping.then : mapping.else;
    
    case 'map':
      const mapSourceValue = getNestedValue(input, mapping.from);
      return mapping.map[mapSourceValue] || mapping.defaultValue;
    
    case 'split':
      const splitValue = getNestedValue(input, mapping.from);
      if (typeof splitValue === 'string') {
        const parts = splitValue.split(mapping.split.delimiter);
        return parts[mapping.split.index] || '';
      }
      return '';
    
    case 'transform':
      return executeTransformRule(input, mapping);
    
    default:
      return null;
  }
}

async function executeArrayMapping(input: any, arrayMapping: any): Promise<any[]> {
  const sourceArray = getNestedValue(input, arrayMapping.target);
  if (!Array.isArray(sourceArray)) {
    return [];
  }

  const results = [];
  for (const item of sourceArray) {
    const mappedItem: any = {};
    
    for (const mapping of arrayMapping.mappings) {
      try {
        const value = await executeMappingRule(item, mapping);
        setNestedValue(mappedItem, mapping.to, value);
      } catch (error) {
        console.error(`Error in array mapping for ${mapping.to}:`, error);
      }
    }
    
    results.push(mappedItem);
  }

  return results;
}

function executeTransformRule(input: any, mapping: any): any {
  const transform = mapping.transform;
  const params = transform.parameters || {};

  switch (transform.type) {
    case 'concat':
      if (params.fields && params.separator) {
        const values = params.fields.map((field: string) => getNestedValue(input, field) || '');
        return values.join(params.separator);
      }
      return '';
    
    case 'coalesce':
      if (params.rules) {
        for (const rule of params.rules.sort((a: any, b: any) => a.priority - b.priority)) {
          const sourceValue = getNestedValue(input, rule.sourceField);
          if (sourceValue !== null && sourceValue !== undefined && sourceValue !== '') {
            return rule.outputValue;
          }
        }
      }
      return params.defaultValue || '';
    
    default:
      return null;
  }
}

function evaluateCondition(value: any, condition: any): boolean {
  switch (condition.operator) {
    case '==':
      return value == condition.value;
    case '===':
      return value === condition.value;
    case '!=':
      return value != condition.value;
    case '!==':
      return value !== condition.value;
    case '>':
      return Number(value) > Number(condition.value);
    case '<':
      return Number(value) < Number(condition.value);
    case '>=':
      return Number(value) >= Number(condition.value);
    case '<=':
      return Number(value) <= Number(condition.value);
    default:
      return false;
  }
}

function getNestedValue(obj: any, path: string): any {
  if (!path) return obj;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return null;
    }
    current = current[key];
  }
  
  return current;
}

function setNestedValue(obj: any, path: string, value: any): void {
  if (!path) return;
  
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}