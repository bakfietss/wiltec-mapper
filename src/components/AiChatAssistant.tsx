import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, User } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { useReactFlow } from '@xyflow/react';

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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'ai',
      content: "Hi! I'm your mapping assistant. I can help you create transforms and connections. Try saying something like:\n\n• 'Split the orderCode field by 2 digits and map to itemId'\n• 'Convert customerName to uppercase and map to name'\n• 'Concat firstName and lastName with space and map to fullName'",
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

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;

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
      // Parse the user request
      const parsedRequest = parseUserRequest(input.trim());
      
      let aiResponse = '';
      
      if (parsedRequest.sourceField && (parsedRequest.operation || parsedRequest.transformType === 'concat')) {
        // Create the transform node
        const result = createTransformNode(parsedRequest);
        
        if (parsedRequest.transformType === 'concat') {
          aiResponse = `✅ Created a concat transform that combines ${parsedRequest.fields.slice(0, -1).join(', ')} with "${parsedRequest.config.delimiter}" and maps to ${parsedRequest.targetField}.`;
        } else {
          aiResponse = `✅ Created a ${parsedRequest.operation} transform for ${parsedRequest.sourceField} and mapped it to ${parsedRequest.targetField}.`;
        }
        
        if (onCreateNodes) {
          onCreateNodes(result);
        }
      } else {
        aiResponse = `I understand you want to work with field transformations, but I need more specific information. Please try:\n\n• "Split orderCode by 2 digits and map to itemId"\n• "Convert customerName to uppercase and map to name"\n• "Concat firstName and lastName with space and map to fullName"\n\nMake sure to specify the source field, operation, and target field.`;
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: 'Sorry, I encountered an error while processing your request. Please try again with a different phrasing.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
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
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Try: "Split orderCode by 2 digits and map to itemId"
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default AiChatAssistant;