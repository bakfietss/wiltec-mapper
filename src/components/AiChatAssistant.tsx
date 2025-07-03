import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, User, Key, Settings } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { useReactFlow } from '@xyflow/react';
import { toast } from 'sonner';

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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'ai',
      content: !localStorage.getItem('openai-api-key') 
        ? "Hi! I'm your AI mapping assistant. First, please enter your OpenAI API key to get started. I can then help you with any mapping task - from creating transforms to modifying source nodes and much more!"
        : "Hi! I'm your AI mapping assistant. I can help you with any mapping task:\n\n• Add or modify fields in source/target nodes\n• Create any type of transform\n• Build complex mapping workflows\n• Analyze and optimize your mappings\n\nJust describe what you need in natural language!",
      timestamp: new Date()
    }
  ]);
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
    
    const systemPrompt = `You are an expert AI assistant for a visual data mapping application. You understand how to create and modify mapping workflows.

## Available Node Types:
- **source**: Input data nodes with fields (like database tables)
- **target**: Output data nodes with fields (where data maps to)
- **transform**: String transformations (uppercase, lowercase, substring, trim, prefix, suffix)
- **concat**: Combines multiple fields with a delimiter
- **splitter**: Splits text into multiple parts
- **coalesce**: Returns first non-null value from multiple inputs
- **ifthen**: Conditional logic node
- **static**: Static value nodes
- **mapping**: Direct field-to-field mappings

## Current Canvas State:
- Nodes: ${JSON.stringify(nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data })), null, 2)}
- Edges: ${JSON.stringify(edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })), null, 2)}

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
      "nodeType": "transform|concat|source|target|etc",
      "position": { "x": 400, "y": 200 },
      "data": { /* node-specific data */ }
    },
    {
      "type": "modify_node", 
      "nodeId": "existing-node-id",
      "updates": { /* properties to update */ }
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
    try {
      // Try to extract JSON instructions from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const actionData = JSON.parse(jsonMatch[0]);
        
        if (actionData.actions && Array.isArray(actionData.actions)) {
          // Process multiple actions
          actionData.actions.forEach((action: any) => {
            executeSingleAction(action);
          });
        } else if (actionData.action) {
          // Legacy single action format
          executeSingleAction(actionData);
        }
      }
    } catch (error) {
      console.log('No executable actions found in AI response', error);
    }
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
        setNodes(prev => [...prev, newNode]);
        toast.success(`${action.nodeType} node created successfully!`);
        break;

      case 'modify_node':
        setNodes(prev => prev.map(node => 
          node.id === action.nodeId 
            ? { ...node, data: { ...node.data, ...action.updates } }
            : node
        ));
        toast.success('Node updated successfully!');
        break;

      case 'create_edge':
        const newEdge = {
          id: `ai-edge-${Date.now()}`,
          source: action.source,
          target: action.target,
          sourceHandle: action.sourceHandle,
          targetHandle: action.targetHandle,
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
        setEdges(prev => prev.filter(edge => edge.id !== action.edgeId));
        toast.success('Connection deleted successfully!');
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
          const currentFields = Array.isArray(sourceNode.data.fields) ? sourceNode.data.fields : [];
          setNodes(prev => prev.map(node => 
            node.id === sourceNode.id 
              ? { ...node, data: { ...node.data, fields: [...currentFields, ...fields] }}
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
    </>
  );
};

export default AiChatAssistant;