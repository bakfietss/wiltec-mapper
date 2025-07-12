import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, User, Key, Settings } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { useReactFlow } from '@xyflow/react';
import { toast } from 'sonner';
import { AIMappingService } from '../services/AIMappingService';
import SmartConnectionDialog from './SmartConnectionDialog';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface AiChatAssistantProps {
  onCreateNodes?: (nodeConfig: any) => void;
}

const AiChatAssistant: React.FC<AiChatAssistantProps> = ({ onCreateNodes }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('openai-api-key') || '');
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem('openai-api-key'));
  const [smartConnectionOpen, setSmartConnectionOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{
    sourceField: string;
    targetSchema: any[];
  } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Load messages from session storage
    const savedMessages = sessionStorage.getItem('ai-chat-messages');
    if (savedMessages) {
      try {
        return JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }
    
    // Default welcome message
    return [{
      id: '1',
      role: 'ai',
      content: !localStorage.getItem('openai-api-key') 
        ? "Hi! I'm your AI mapping assistant. First, please enter your OpenAI API key to get started. I can then help you with any mapping task - from creating transforms to modifying source nodes and much more!"
        : "Hi! I'm your AI mapping assistant. I can help you with any mapping task:\n\n• Add or modify fields in source/target nodes\n• Create any type of transform\n• Build complex mapping workflows\n• Analyze and optimize your mappings\n\nJust describe what you need in natural language!",
      timestamp: new Date()
    }];
  });
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getNodes, setNodes, getEdges, setEdges } = useReactFlow();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save messages to session storage whenever they change
  useEffect(() => {
    sessionStorage.setItem('ai-chat-messages', JSON.stringify(messages));
  }, [messages]);

  const parseUserRequest = (request: string) => {
    const lowercaseRequest = request.toLowerCase();
    
    // Extract field names (words in quotes or field-like patterns)
    const fieldPattern = /(?:field\s+)?(?:"|')?(\w+)(?:"|')?/gi;
    const fields = [];
    let match;
    while ((match = fieldPattern.exec(request)) !== null) {
      fields.push(match[1]);
    }

    // Determine transform type
    let transformType = 'string';
    let operation = '';
    let config: any = {};

    if (lowercaseRequest.includes('split') || lowercaseRequest.includes('substring')) {
      operation = 'substring';
      // Try to extract digit count
      const digitMatch = request.match(/(\d+)\s*digits?/i);
      if (digitMatch) {
        config.substringStart = 0;
        config.substringEnd = parseInt(digitMatch[1]);
      }
    } else if (lowercaseRequest.includes('uppercase') || lowercaseRequest.includes('upper case')) {
      operation = 'uppercase';
    } else if (lowercaseRequest.includes('lowercase') || lowercaseRequest.includes('lower case')) {
      operation = 'lowercase';
    } else if (lowercaseRequest.includes('concat') || lowercaseRequest.includes('join') || lowercaseRequest.includes('combine')) {
      transformType = 'concat';
      // Extract delimiter
      const delimiterMatch = request.match(/with\s+(?:"|')?([^"'\s]+)(?:"|')?/i);
      config.delimiter = delimiterMatch ? delimiterMatch[1] : ' ';
    } else if (lowercaseRequest.includes('trim') || lowercaseRequest.includes('remove whitespace')) {
      operation = 'trim';
    } else if (lowercaseRequest.includes('prefix') || lowercaseRequest.includes('add at beginning')) {
      operation = 'prefix';
      const prefixMatch = request.match(/prefix\s+(?:"|')?([^"'\s]+)(?:"|')?/i);
      if (prefixMatch) config.prefix = prefixMatch[1];
    } else if (lowercaseRequest.includes('suffix') || lowercaseRequest.includes('add at end')) {
      operation = 'suffix';
      const suffixMatch = request.match(/suffix\s+(?:"|')?([^"'\s]+)(?:"|')?/i);
      if (suffixMatch) config.suffix = suffixMatch[1];
    }

    // Extract source and target fields
    const mapToMatch = request.match(/map\s+to\s+(\w+)/i);
    const targetField = mapToMatch ? mapToMatch[1] : fields[fields.length - 1];
    const sourceField = fields[0];

    return {
      sourceField,
      targetField,
      transformType,
      operation,
      config,
      fields
    };
  };

  const createTransformNode = (parsedRequest: any) => {
    const nodes = getNodes();
    const edges = getEdges();
    
    // Find available position
    const yPosition = Math.max(...nodes.map(n => n.position.y), 100) + 150;
    const xPosition = 400;

    let newNode;
    let newEdges = [];

    if (parsedRequest.transformType === 'concat') {
      // Create concat node
      const nodeId = `concat-${Date.now()}`;
      const rules = parsedRequest.fields.slice(0, -1).map((field: string, index: number) => ({
        id: `rule-${field}-${index}`,
        priority: index + 1,
        sourceField: field,
        sourceHandle: `rule-${field}-${index}`
      }));

      newNode = {
        id: nodeId,
        type: 'concat',
        position: { x: xPosition, y: yPosition },
        data: {
          label: 'AI Generated Concat',
          transformType: 'concat',
          rules: rules,
          delimiter: parsedRequest.config.delimiter || ' ',
          outputType: 'value',
          inputValues: {}
        }
      };

      // Create edges for each rule (if source nodes exist)
      const sourceNode = nodes.find(n => n.type === 'source');
      if (sourceNode) {
        rules.forEach((rule: any) => {
          newEdges.push({
            id: `edge-${sourceNode.id}-${rule.id}`,
            source: sourceNode.id,
            target: nodeId,
            sourceHandle: rule.sourceField,
            targetHandle: rule.id
          });
        });

        // Edge to target
        const targetNode = nodes.find(n => n.type === 'target');
        if (targetNode) {
          newEdges.push({
            id: `edge-${nodeId}-${parsedRequest.targetField}`,
            source: nodeId,
            target: targetNode.id,
            targetHandle: parsedRequest.targetField
          });
        }
      }
    } else {
      // Create string transform node
      const nodeId = `transform-${Date.now()}`;
      newNode = {
        id: nodeId,
        type: 'transform',
        position: { x: xPosition, y: yPosition },
        data: {
          label: 'AI Generated Transform',
          transformType: 'String Transform',
          description: `${parsedRequest.operation} transform`,
          config: {
            stringOperation: parsedRequest.operation,
            ...parsedRequest.config
          },
          outputType: 'value',
          inputValues: {}
        }
      };

      // Create edges
      const sourceNode = nodes.find(n => n.type === 'source');
      const targetNode = nodes.find(n => n.type === 'target');
      
      if (sourceNode) {
        newEdges.push({
          id: `edge-${sourceNode.id}-${nodeId}`,
          source: sourceNode.id,
          target: nodeId,
          sourceHandle: parsedRequest.sourceField,
          targetHandle: 'input'
        });
      }
      
      if (targetNode) {
        newEdges.push({
          id: `edge-${nodeId}-${parsedRequest.targetField}`,
          source: nodeId,
          target: targetNode.id,
          targetHandle: parsedRequest.targetField
        });
      }
    }

    // Add node and edges to the flow
    setNodes([...nodes, newNode]);
    setEdges([...edges, ...newEdges]);

    return { node: newNode, edges: newEdges };
  };

  const callOpenAI = async (userMessage: string) => {
    if (!apiKey) {
      throw new Error('OpenAI API key not provided');
    }

    const nodes = getNodes();
    const edges = getEdges();
    
    // Include recent conversation context for better AI understanding
    const recentMessages = messages.slice(-4).map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
    
    const systemPrompt = `You are an expert AI assistant for a visual data mapping application. You understand how to create and modify mapping workflows.

## Recent Conversation Context:
${recentMessages}

## Available Node Types:
- **source**: Input data nodes with fields (like database tables)
- **target**: Output data nodes with fields (where data maps to)
- **transform**: String transformations (uppercase, lowercase, substring, trim, prefix, suffix)
- **concatTransform**: Combines multiple fields with a delimiter
- **splitterTransform**: Splits text into multiple parts
- **coalesceTransform**: Returns first non-null value from multiple inputs
- **ifThen**: Conditional logic node
- **staticValue**: Static value nodes
- **conversionMapping**: Field value mapping/translation tables (e.g., "van" → "naar")

## Current Canvas State:
- Nodes: ${JSON.stringify(nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })), null, 2)}
- Edges: ${JSON.stringify(edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })), null, 2)}

## IMPORTANT: Field Format Requirements
For source and target nodes, fields MUST use this exact SchemaField format:
{
  "id": "unique-field-id",
  "name": "field_name", 
  "type": "string|number|boolean|date|object|array",
  "exampleValue": "actual_value_or_empty_string"
}

## CRITICAL: Handle Connection Rules & Smart Mapping
- You can use EITHER field.id OR field.name for handles - the system will auto-resolve field names to IDs
- For create_edge actions, you can use field names like "Voorvoegsel" or "reference_5" and the system will find the correct field IDs
- Example: "sourceHandle": "Voorvoegsel", "targetHandle": "reference_5" will work perfectly
- For conversionMapping nodes: use "input" as targetHandle and "output" as sourceHandle
- IMPORTANT: For multi-step workflows, use "storeAsId" to store the created node ID, then reference it with "$storedId" syntax

## CRITICAL: Array Field Mapping
- NEVER map directly to array containers (like "deliveryLines", "items", etc.)
- ALWAYS map to specific fields within arrays (like "deliveryLineNumber", "itemCode", etc.)
- When user asks to connect to "deliverylines", they mean fields INSIDE the deliveryLines array
- Use "smart_connection" action for array field mapping to get user confirmation on the exact field

## Smart Connection Action (REQUIRED for array fields):
{
  "type": "smart_connection",
  "sourceField": "concat_output_field_name",
  "targetNodeId": "target-node-id"
}

## Multi-Step Workflow Example:
{
  "actions": [
    {
      "type": "create_node",
      "nodeType": "conversionMapping",
      "position": { "x": 100, "y": 200 },
      "storeAsId": "newMappingNode",
      "data": { /* node data */ }
    },
    {
      "type": "create_edge",
      "source": "source-node-id",
      "target": "$newMappingNode",
      "sourceHandle": "Voorvoegsel",
      "targetHandle": "input"
    },
    {
      "type": "create_edge", 
      "source": "$newMappingNode",
      "target": "target-node-id",
      "sourceHandle": "output",
      "targetHandle": "reference_4"
    }
  ]
}

## Your Capabilities:
1. **Create any type of node** with proper configuration
2. **Modify existing nodes** (add/remove fields, change properties)
3. **Create connections** between nodes
4. **Delete nodes or edges**
5. **Analyze and optimize** mapping workflows

## Response Format:
Always respond with:
1. Natural language explanation of what you're doing
2. JSON action instructions (if performing actions)

## Action Format:
{
  "actions": [
    {
      "type": "create_node",
      "nodeType": "transform|concatTransform|conversionMapping|source|target|etc",
      "position": { "x": 400, "y": 200 },
      "data": { 
        // For conversionMapping nodes:
        "label": "Field Mapping",
        "mappings": [
          { "id": "map-1", "from": "van", "to": "naar" },
          { "id": "map-2", "from": "toe", "to": "naartoe" }
        ],
        "isExpanded": true
      }
    },
    {
      "type": "modify_node", 
      "nodeId": "existing-node-id",
      "updates": { 
        "fields": [
          {
            "id": "field-123",
            "name": "fieldName",
            "type": "string",
            "exampleValue": "value"
          }
        ]
      }
    },
    {
      "type": "create_edge",
      "source": "node-id",
      "target": "node-id", 
      "sourceHandle": "field-name",
      "targetHandle": "field-name"
    },
    {
      "type": "delete_node",
      "nodeId": "node-id"
    },
    {
      "type": "delete_edge", 
      "edgeId": "edge-id"
      // OR use field names to find and delete edges:
      // "source": "source-node-id", "target": "target-node-id", 
      // "sourceHandle": "field-name", "targetHandle": "field-name"
    }
  ]
}

Be conversational and helpful. Always explain what you understand and what you'll do before taking actions.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API call failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const executeAIAction = (response: string) => {
    console.log('=== EXECUTING AI ACTIONS ===');
    console.log('AI Response:', response);
    
    try {
      // Try to extract JSON from markdown code blocks first
      const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      let jsonString = '';
      
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
        console.log('Found JSON in code block:', jsonString);
      } else {
        // Fallback: Try to find JSON object in the response
        const jsonMatch = response.match(/\{(?:[^{}]|{[^{}]*})*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
          console.log('Found JSON object:', jsonString);
        }
      }
      
      if (jsonString) {
        const actionData = JSON.parse(jsonString);
        console.log('Parsed action data:', actionData);
        
        if (actionData.actions && Array.isArray(actionData.actions)) {
          console.log(`Executing ${actionData.actions.length} actions...`);
          // Process multiple actions sequentially to handle dependencies
          actionData.actions.forEach((action: any, index: number) => {
            console.log(`Scheduling action ${index + 1}:`, action);
            // Small delay for each action to ensure proper state updates
            setTimeout(() => executeSingleAction(action), index * 100);
          });
        } else if (actionData.action) {
          console.log('Executing single legacy action:', actionData);
          // Legacy single action format
          executeSingleAction(actionData);
        } else {
          console.log('No valid actions found in parsed data');
        }
      } else {
        console.log('No JSON found in AI response');
      }
    } catch (error) {
      console.error('Error parsing/executing AI actions:', error);
      console.log('Response content for debugging:', response);
    }
  };

  const findFieldIdByName = (nodeId: string, fieldName: string) => {
    const nodes = getNodes();
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.data.fields || !Array.isArray(node.data.fields)) return fieldName;
    
    const field = (node.data.fields as any[]).find((f: any) => {
      // Try exact match first
      if (f.name === fieldName || f.id === fieldName) return true;
      // Try case-insensitive match
      if (f.name?.toLowerCase() === fieldName.toLowerCase()) return true;
      // Try partial ID match (for generated IDs)
      if (f.id?.toLowerCase().includes(fieldName.toLowerCase())) return true;
      return false;
    });
    
    console.log(`Field resolution for "${fieldName}" in node ${nodeId}:`, {
      nodeFields: node.data.fields.map((f: any) => ({ id: f.id, name: f.name })),
      foundField: field,
      resultId: field?.id || fieldName
    });
    
    return field?.id || fieldName;
  };

  const executeSingleAction = (action: any) => {
    const nodes = getNodes();
    const edges = getEdges();
    
    switch (action.type || action.action) {
      case 'create_node':
        const nodeId = `ai-${action.nodeType}-${Date.now()}`;
        const newNode = {
          id: nodeId,
          type: action.nodeType,
          position: action.position || { x: 400, y: Math.max(...nodes.map(n => n.position.y), 100) + 150 },
          data: {
            label: `AI Generated ${action.nodeType}`,
            ...action.data
          }
        };
        
        console.log('=== AI ASSISTANT NODE CREATION ===');
        console.log('Creating node:', newNode);
        console.log('Node fields:', newNode.data.fields);
        
        setNodes(prev => [...prev, newNode]);
        
        // Store the created node ID for subsequent actions
        if (action.storeAsId) {
          (window as any)[action.storeAsId] = nodeId;
        }
        
        toast.success(`${action.nodeType} node created successfully!`);
        break;

      case 'modify_node':
        setNodes(prev => prev.map(node => 
          node.id === action.nodeId 
            ? { 
                ...node, 
                data: { 
                  ...node.data, 
                  ...action.updates,
                  // CRITICAL FIX: Ensure data array only has one record
                  data: action.updates.data 
                    ? (Array.isArray(action.updates.data) && action.updates.data.length > 0 
                        ? [action.updates.data[0]]  // Only take the first record
                        : action.updates.data)
                    : node.data.data
                } 
              }
            : node
        ));
        toast.success('Node updated successfully!');
        break;

      case 'create_edge':
        // Resolve node IDs (in case they reference stored IDs)
        let sourceNodeId = action.source;
        let targetNodeId = action.target;
        
        // Check for stored node IDs (for multi-step workflows)
        if (sourceNodeId.startsWith('$') && (window as any)[sourceNodeId.slice(1)]) {
          sourceNodeId = (window as any)[sourceNodeId.slice(1)];
        }
        if (targetNodeId.startsWith('$') && (window as any)[targetNodeId.slice(1)]) {
          targetNodeId = (window as any)[targetNodeId.slice(1)];
        }
        
        // Validate that the nodes exist
        const currentNodes = getNodes(); // Get fresh nodes state
        const edgeSourceNode = currentNodes.find(n => n.id === sourceNodeId);
        const edgeTargetNode = currentNodes.find(n => n.id === targetNodeId);
        
        if (!edgeSourceNode || !edgeTargetNode) {
          console.error('Edge creation failed: Source or target node not found', {
            sourceId: sourceNodeId,
            targetId: targetNodeId,
            availableNodes: currentNodes.map(n => n.id)
          });
          toast.error('Connection failed: Node not found');
          break;
        }

        // Auto-find field IDs if field names were provided
        let sourceHandle = action.sourceHandle;
        let targetHandle = action.targetHandle;
        
        // Always try to resolve field names to IDs
        sourceHandle = findFieldIdByName(sourceNodeId, sourceHandle);
        targetHandle = findFieldIdByName(targetNodeId, targetHandle);

        console.log('=== AI EDGE CREATION DEBUG ===');
        console.log('Original action:', action);
        console.log('Resolved source node:', sourceNodeId, 'Handle:', sourceHandle);
        console.log('Resolved target node:', targetNodeId, 'Handle:', targetHandle);
        console.log('Source node fields:', edgeSourceNode.data.fields);
        console.log('Target node fields:', edgeTargetNode.data.fields);

        const newEdge = {
          id: `ai-edge-${Date.now()}`,
          source: sourceNodeId,
          target: targetNodeId,
          sourceHandle: sourceHandle,
          targetHandle: targetHandle,
          type: 'smoothstep',
          animated: true,
          style: { 
            strokeWidth: 2,
            stroke: '#3b82f6',
            strokeDasharray: '5,5'
          }
        };
        setEdges(prev => [...prev, newEdge]);
        toast.success('Connection created successfully!');
        break;

      case 'delete_node':
        setNodes(prev => prev.filter(node => node.id !== action.nodeId));
        setEdges(prev => prev.filter(edge => 
          edge.source !== action.nodeId && edge.target !== action.nodeId
        ));
        toast.success('Node deleted successfully!');
        break;

      case 'delete_edge':
        if (action.edgeId) {
          // Direct edge ID deletion
          setEdges(prev => prev.filter(edge => edge.id !== action.edgeId));
          toast.success('Connection deleted successfully!');
        } else if (action.source && action.target) {
          // Find edge by source/target/handles and delete it
          const currentEdges = getEdges();
          
          // Resolve field names to actual handles for both source and target
          const resolvedSourceHandle = findFieldIdByName(action.source, action.sourceHandle || '');
          const resolvedTargetHandle = findFieldIdByName(action.target, action.targetHandle || '');
          
          console.log('=== AI EDGE DELETION DEBUG ===');
          console.log('Looking for edge to delete:', {
            source: action.source,
            target: action.target,
            originalSourceHandle: action.sourceHandle,
            originalTargetHandle: action.targetHandle,
            resolvedSourceHandle,
            resolvedTargetHandle
          });
          console.log('Available edges:', currentEdges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle
          })));
          
          const edgesToDelete = currentEdges.filter(edge => {
            const matchesSource = edge.source === action.source;
            const matchesTarget = edge.target === action.target;
            
            // Try multiple handle matching strategies
            let matchesSourceHandle = true;
            let matchesTargetHandle = true;
            
            if (action.sourceHandle) {
              matchesSourceHandle = edge.sourceHandle === action.sourceHandle || 
                                  edge.sourceHandle === resolvedSourceHandle ||
                                  edge.sourceHandle?.toLowerCase() === action.sourceHandle.toLowerCase();
            }
            
            if (action.targetHandle) {
              matchesTargetHandle = edge.targetHandle === action.targetHandle || 
                                  edge.targetHandle === resolvedTargetHandle ||
                                  edge.targetHandle?.toLowerCase() === action.targetHandle.toLowerCase();
            }
            
            return matchesSource && matchesTarget && matchesSourceHandle && matchesTargetHandle;
          });
          
          console.log('Edges to delete:', edgesToDelete);
          
          if (edgesToDelete.length > 0) {
            setEdges(prev => prev.filter(edge => 
              !edgesToDelete.some(deleteEdge => deleteEdge.id === edge.id)
            ));
            toast.success(`${edgesToDelete.length} connection(s) deleted successfully!`);
          } else {
            toast.error('No matching connection found to delete');
            console.error('No matching edge found for deletion criteria');
          }
        }
        break;

      case 'smart_connection':
        // Use smart AI field matching for connection
        const { sourceField: connectionSourceField, targetNodeId: connectionTargetId } = action;
        const connectionTargetNode = currentNodes.find(n => n.id === connectionTargetId);
        
        if (connectionTargetNode && connectionTargetNode.data.fields && Array.isArray(connectionTargetNode.data.fields)) {
          setPendingConnection({
            sourceField: connectionSourceField,
            targetSchema: connectionTargetNode.data.fields
          });
          setSmartConnectionOpen(true);
        } else {
          toast.error('Target node not found or has no fields');
        }
        break;

      // Legacy support for old action format
      case 'create_transform':
        const { transformType, config, position } = action.details || action;
        const transformNodeId = `ai-transform-${Date.now()}`;
        const transformNode = {
          id: transformNodeId,
          type: transformType === 'concat' ? 'concat' : 'transform',
          position: position || { x: 400, y: Math.max(...nodes.map(n => n.position.y), 100) + 150 },
          data: {
            label: 'AI Generated Transform',
            transformType: transformType,
            ...config
          }
        };
        setNodes(prev => [...prev, transformNode]);
        toast.success('Transform node created successfully!');
        break;

      case 'modify_source':
        const { fields } = action.details || action;
        const sourceNode = nodes.find(n => n.type === 'source');
        if (sourceNode && Array.isArray(fields)) {
          // Convert legacy field format to SchemaField format if needed
          const schemaFields = fields.map((field: any, index: number) => ({
            id: field.id || `field-${Date.now()}-${index}`,
            name: field.name || 'New Field',
            type: field.type || 'string',
            exampleValue: field.value || field.exampleValue || ''
          }));
          
          const currentFields = Array.isArray(sourceNode.data.fields) ? sourceNode.data.fields : [];
          setNodes(prev => prev.map(node => 
            node.id === sourceNode.id 
              ? { ...node, data: { ...node.data, fields: [...currentFields, ...schemaFields] }}
              : node
          ));
          toast.success('Source node updated successfully!');
        }
        break;

      default:
        console.log('Unknown action type:', action.type || action.action);
    }
  };

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai-api-key', apiKey.trim());
      setShowKeyInput(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: "Great! API key saved. I'm now ready to help you with any mapping task:\n\n• Add or modify fields in source/target nodes\n• Create any type of transform\n• Build complex mapping workflows\n• Analyze and optimize your mappings\n\nJust describe what you need in natural language!",
        timestamp: new Date()
      }]);
      toast.success('OpenAI API key saved successfully!');
    }
  };

  const clearApiKey = () => {
    localStorage.removeItem('openai-api-key');
    setApiKey('');
    setShowKeyInput(true);
    toast.info('API key cleared');
  };

  const handleSmartConnection = (sourceField: string, targetFieldId: string) => {
    if (!pendingConnection) return;
    
    const currentNodes = getNodes();
    
    // Find source node that has the source field
    const sourceNode = currentNodes.find(n => 
      n.data.fields && Array.isArray(n.data.fields) && 
      n.data.fields.some((f: any) => f.name === sourceField || f.id === sourceField)
    );
    
    // Find target node (we already know its schema from pendingConnection)
    const targetNode = currentNodes.find(n => 
      n.data.fields && Array.isArray(n.data.fields) && 
      n.data.fields.some((f: any) => f.id === targetFieldId)
    );
    
    if (sourceNode && targetNode) {
      const sourceFieldId = findFieldIdByName(sourceNode.id, sourceField);
      
      const newEdge = {
        id: `smart-edge-${Date.now()}`,
        source: sourceNode.id,
        target: targetNode.id,
        sourceHandle: sourceFieldId,
        targetHandle: targetFieldId,
        type: 'smoothstep',
        animated: true,
        style: { 
          strokeWidth: 2,
          stroke: '#10b981',
          strokeDasharray: '5,5'
        }
      };
      
      setEdges(prev => [...prev, newEdge]);
      toast.success(`Connected "${sourceField}" to target field successfully!`);
      
      // Add AI response about the connection
      const connectionMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'ai',
        content: `Perfect! I've connected "${sourceField}" to the target field using smart field matching. The connection was made with high confidence based on field name similarity and context analysis.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, connectionMessage]);
    } else {
      toast.error('Failed to create connection - source or target node not found');
    }
    
    setPendingConnection(null);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    // If no API key, just handle key input
    if (showKeyInput && !apiKey) {
      toast.error('Please enter your OpenAI API key first');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      // Call OpenAI API
      const aiResponse = await callOpenAI(userMessage.content);
      
      // Execute any actions the AI suggests
      executeAIAction(aiResponse);

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      
      let errorMessage = 'Sorry, I encountered an error while processing your request.';
      if (error.message.includes('API key')) {
        errorMessage = 'Invalid API key. Please check your OpenAI API key and try again.';
        setShowKeyInput(true);
      }
      
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: errorMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[400px] sm:w-[400px] p-0 flex flex-col">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                AI Mapping Assistant
              </SheetTitle>
            </SheetHeader>
            
            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'ai' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      <div className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-sm">Thinking...</div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            {/* Input Area */}
            <div className="p-4 border-t">
              {showKeyInput ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Key className="h-4 w-4" />
                    OpenAI API Key Required
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="flex-1"
                    />
                    <Button 
                      onClick={saveApiKey}
                      disabled={!apiKey.trim()}
                      size="icon"
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Your API key will be stored locally in your browser. Get one at{' '}
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      OpenAI Platform
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Describe your mapping need..."
                      disabled={isProcessing}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!input.trim() || isProcessing}
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button 
                      onClick={() => setShowKeyInput(true)}
                      variant="outline"
                      size="icon"
                      title="Manage API Key"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ask me anything: "Add customerEmail field to source", "Create uppercase transform", etc.
                  </div>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Smart Connection Dialog */}
      <SmartConnectionDialog
        isOpen={smartConnectionOpen}
        onClose={() => {
          setSmartConnectionOpen(false);
          setPendingConnection(null);
        }}
        sourceField={pendingConnection?.sourceField || ''}
        targetSchema={pendingConnection?.targetSchema || []}
        onConfirmConnection={handleSmartConnection}
      />
    </>
  );
};

export default AiChatAssistant;