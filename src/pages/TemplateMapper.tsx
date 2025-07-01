
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Upload, Download, Wand2, ArrowRight, MessageCircle, Copy, Check, Play, AlertCircle } from 'lucide-react';
import NavigationBar from '../components/NavigationBar';
import DataUploadZone from '../components/DataUploadZone';
import { useToast } from '../hooks/use-toast';
import { Alert, AlertDescription } from '../components/ui/alert';

const TemplateMapper = () => {
  const [sourceData, setSourceData] = useState('');
  const [outputTemplate, setOutputTemplate] = useState('');
  const [transformedResults, setTransformedResults] = useState('');
  const [hasExecuted, setHasExecuted] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const sampleSourceData = `[
  {
    "orderCode": "ORD-001",
    "adminCode": "ADM-123",
    "lineNumber": 1,
    "deliveryLineNumber": 1,
    "confirmationDate": "2024-01-15",
    "deliveryAfter": "2024-01-20",
    "deliveryBefore": "2024-01-25"
  },
  {
    "orderCode": "ORD-001",
    "adminCode": "ADM-123",
    "lineNumber": 1,
    "deliveryLineNumber": 2,
    "confirmationDate": "2024-01-16",
    "deliveryAfter": "2024-01-20",
    "deliveryBefore": "2024-01-25"
  },
  {
    "orderCode": "ORD-001",
    "adminCode": "ADM-123",
    "lineNumber": 2,
    "deliveryLineNumber": 1,
    "confirmationDate": "2024-01-17",
    "deliveryAfter": "2024-01-22",
    "deliveryBefore": "2024-01-27"
  }
]`;

  const sampleTemplate = `{
  "id": "{{ orderCode }}",
  "orderCode": "{{ orderCode }}",
  "adminCode": "{{ adminCode }}",
  "lines": [
    {
      "id": "{{ orderCode }},{{ lineNumber }}",
      "lineNumber": {{ lineNumber }},
      "orderCode": "{{ orderCode }}",
      "adminCode": "{{ adminCode }}",
      "deliveryAfter": "{{ deliveryAfter }}",
      "deliveryBefore": "{{ deliveryBefore }}",
      "deliveryLines": [
        {
          "id": "{{ orderCode }},{{ lineNumber }},{{ deliveryLineNumber }}",
          "orderCode": "{{ orderCode }}",
          "adminCode": "{{ adminCode }}",
          "orderLineNumber": {{ lineNumber }},
          "deliveryLineNumber": {{ deliveryLineNumber }},
          "confirmationDate": "{{ confirmationDate }}",
          "deliveryAfter": "{{ deliveryAfter }}",
          "deliveryBefore": "{{ deliveryBefore }}"
        }
      ]
    }
  ]
}`;

  const handleDataUpload = useCallback((data: any[]) => {
    setSourceData(JSON.stringify(data, null, 2));
    setHasExecuted(false);
    setTransformedResults('');
  }, []);

  // Execute the template transformation (like Weavo's "Run" button)
  const executeTemplate = useCallback(() => {
    if (!sourceData || !outputTemplate) {
      toast({ title: "Please provide both source data and template", variant: "destructive" });
      return;
    }

    setIsExecuting(true);
    setExecutionError('');

    try {
      const data = JSON.parse(sourceData);
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Source data must be a non-empty array');
      }

      // Process template for each record
      const results = data.map(record => {
        let processed = outputTemplate;
        
        // Replace template variables
        Object.entries(record).forEach(([key, value]) => {
          const regex = new RegExp(`{{ ${key} }}`, 'g');
          processed = processed.replace(regex, typeof value === 'string' ? `"${value}"` : String(value));
        });

        return JSON.parse(processed);
      });

      setTransformedResults(JSON.stringify(results, null, 2));
      setHasExecuted(true);
      toast({ title: "Template executed successfully!" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setExecutionError(errorMessage);
      toast({ title: "Execution failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsExecuting(false);
    }
  }, [sourceData, outputTemplate, toast]);

  const handleAIChat = useCallback(async (message: string) => {
    if (!message.trim()) return;

    setIsProcessing(true);
    setChatMessages(prev => [...prev, { role: 'user', content: message }]);

    // Simple AI simulation - in real implementation, this would call an AI service
    setTimeout(() => {
      let response = '';
      
      if (message.toLowerCase().includes('example') || message.toLowerCase().includes('sample')) {
        response = "I've added sample data and template to help you get started. Click 'Run Template' to see the transformation results.";
        setSourceData(sampleSourceData);
        setOutputTemplate(sampleTemplate);
        setHasExecuted(false);
        setTransformedResults('');
      } else if (message.toLowerCase().includes('group')) {
        response = "To group data, use array structures in your template. For example, wrap related items in `[]` and use the same grouping field like `{{ orderCode }}`.";
      } else if (message.toLowerCase().includes('concat')) {
        response = "To concatenate fields, use comma-separated template variables like `{{ field1 }},{{ field2 }}`. This will combine the values with a comma.";
      } else if (message.toLowerCase().includes('run') || message.toLowerCase().includes('execute')) {
        response = "Click the 'Run Template' button to execute your template against the source data and see the actual transformation results.";
      } else {
        response = "I can help you build templates! Try asking me to 'show an example', help with 'grouping data', 'concatenation', or how to 'run the template'.";
      }

      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsProcessing(false);
    }, 1000);

    setChatInput('');
  }, []);

  const handleCopyTemplate = useCallback(() => {
    navigator.clipboard.writeText(outputTemplate);
    setCopied(true);
    toast({ title: "Template copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  }, [outputTemplate, toast]);

  const handleConvertToNodes = useCallback(() => {
    if (!hasExecuted) {
      toast({ title: "Please run the template first to verify it works correctly", variant: "destructive" });
      return;
    }

    if (!outputTemplate || !sourceData) {
      toast({ title: "Please add source data and template first", variant: "destructive" });
      return;
    }

    // Store template data for the manual editor
    localStorage.setItem('template-conversion', JSON.stringify({
      sourceData: JSON.parse(sourceData),
      template: outputTemplate,
      transformedResults: transformedResults
    }));

    toast({ title: "Template ready for conversion!" });
    
    // Navigate to manual editor with conversion flag
    window.location.href = '/manual?from=template-conversion';
  }, [outputTemplate, sourceData, transformedResults, hasExecuted, toast]);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />
      
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Template Mapper</h1>
          <p className="text-gray-600">Build data transformations with templates, then convert to visual nodes</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Source Data Panel */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Source Data
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <Tabs defaultValue="paste" className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="paste">Paste JSON</TabsTrigger>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                </TabsList>
                
                <TabsContent value="paste" className="flex-1 flex flex-col">
                  <Label className="mb-2">Paste your JSON array:</Label>
                  <Textarea
                    value={sourceData}
                    onChange={(e) => {
                      setSourceData(e.target.value);
                      setHasExecuted(false);
                      setTransformedResults('');
                    }}
                    placeholder="[{...your data...}]"
                    className="flex-1 font-mono text-sm"
                  />
                </TabsContent>
                
                <TabsContent value="upload" className="flex-1 flex flex-col">
                  <DataUploadZone
                    onDataUpload={handleDataUpload}
                    acceptedTypes={['.json', '.csv', '.xlsx']}
                    title="Upload Source Data"
                    description="Upload JSON, CSV, or Excel files"
                  />
                </TabsContent>
              </Tabs>
              
              <div className="mt-2 text-xs text-gray-500">
                {sourceData && `${JSON.parse(sourceData || '[]').length || 0} records`}
              </div>
            </CardContent>
          </Card>

          {/* Template Builder Panel */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Output Template
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyTemplate}
                  disabled={!outputTemplate}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <Label className="mb-2">Build your output structure:</Label>
              <Textarea
                value={outputTemplate}
                onChange={(e) => {
                  setOutputTemplate(e.target.value);
                  setHasExecuted(false);
                  setTransformedResults('');
                }}
                placeholder='{"id": "{{ fieldName }}", ...}'
                className="flex-1 font-mono text-sm"
              />
              
              {/* Run Template Button (like Weavo) */}
              <div className="mt-4 space-y-2">
                <Button
                  onClick={executeTemplate}
                  disabled={!outputTemplate || !sourceData || isExecuting}
                  className="w-full"
                  variant={hasExecuted ? "secondary" : "default"}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isExecuting ? "Running..." : hasExecuted ? "Run Again" : "Run Template"}
                </Button>
                
                {executionError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{executionError}</AlertDescription>
                  </Alert>
                )}
                
                {hasExecuted && (
                  <Button
                    onClick={handleConvertToNodes}
                    className="w-full"
                    variant="outline"
                  >
                    Convert to Visual Nodes
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results and AI Chat Panel */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Transformation Results & AI Assistant</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <Tabs defaultValue="results" className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="results">Results</TabsTrigger>
                  <TabsTrigger value="chat">AI Chat</TabsTrigger>
                </TabsList>
                
                <TabsContent value="results" className="flex-1 flex flex-col">
                  <Label className="mb-2">Transformation results:</Label>
                  <div className="flex-1 bg-gray-50 border rounded p-3 overflow-auto">
                    <pre className="text-xs whitespace-pre-wrap">
                      {transformedResults || (hasExecuted ? 'No results generated' : 'Click "Run Template" to execute and see results...')}
                    </pre>
                  </div>
                </TabsContent>
                
                <TabsContent value="chat" className="flex-1 flex flex-col">
                  <div className="flex-1 bg-gray-50 border rounded p-3 overflow-auto mb-3">
                    {chatMessages.length === 0 ? (
                      <div className="text-sm text-gray-500">
                        Ask me for help! Try "show me an example" or "how do I group data?"
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {chatMessages.map((msg, idx) => (
                          <div key={idx} className={`text-sm ${msg.role === 'user' ? 'text-blue-600' : 'text-gray-700'}`}>
                            <div className="font-medium mb-1">
                              {msg.role === 'user' ? 'You:' : 'AI:'}
                            </div>
                            <div>{msg.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask AI for help..."
                      onKeyDown={(e) => e.key === 'Enter' && handleAIChat(chatInput)}
                    />
                    <Button 
                      onClick={() => handleAIChat(chatInput)}
                      disabled={!chatInput.trim() || isProcessing}
                      size="sm"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TemplateMapper;
