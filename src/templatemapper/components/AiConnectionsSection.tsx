import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { Copy, Check, Sparkles, AlertCircle, Database, ChevronDown, ChevronUp, Code, Box, Layers } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';
import { OpenAIResponse } from '../services/AIConnectionGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

interface AiConnectionsSectionProps {
  isGenerating: boolean;
  aiResponse: OpenAIResponse | null;
  onGenerateConnections: () => void;
  sourceDataAvailable: boolean;
  targetDataAvailable: boolean;
  hasOpenAIKey?: boolean;
  sentSourceData?: any[];
  sentTargetData?: any[];
}

export const AiConnectionsSection: React.FC<AiConnectionsSectionProps> = ({
  isGenerating,
  aiResponse,
  onGenerateConnections,
  sourceDataAvailable,
  targetDataAvailable,
  hasOpenAIKey = true,
  sentSourceData = [],
  sentTargetData = []
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!aiResponse) return;
    
    const success = await copyToClipboard(JSON.stringify(aiResponse.mappings, null, 2));
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Connections
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={onGenerateConnections}
          disabled={isGenerating || !sourceDataAvailable || !targetDataAvailable || !hasOpenAIKey}
          size="lg"
          className="w-full"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Generating Connections...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Connections
            </>
          )}
        </Button>

        {!hasOpenAIKey && (
          <div className="flex items-center gap-2 p-4 bg-red-50 text-red-800 rounded-md">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">OpenAI API Key Missing</p>
              <p className="text-sm">Please add your OpenAI API key using one of these methods:</p>
              <ol className="text-sm mt-1 list-decimal pl-5 space-y-1">
                <li>
                  <strong>Recommended:</strong> Go to API Key Manager and add an OpenAI API key
                </li>
                <li>
                  <strong>Alternative:</strong> Add it directly to localStorage by opening the browser console and running:
                  <pre className="bg-red-100 p-2 rounded mt-1 text-xs overflow-x-auto">
                    localStorage.setItem('openai_api_key', 'your-api-key-here')
                  </pre>
                </li>
              </ol>
            </div>
          </div>
        )}

        {(!sourceDataAvailable || !targetDataAvailable) && (
          <div className="flex items-center gap-2 p-4 bg-amber-50 text-amber-800 rounded-md">
            <AlertCircle className="h-5 w-5" />
            <span>Please upload both source and target data to generate connections</span>
          </div>
        )}

        {aiResponse && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">AI Mapping Suggestions</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="space-y-2">
              {aiResponse.mappings.map((mapping, index) => (
                <div key={index} className="p-3 border rounded-md bg-slate-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium">{mapping.target_field}</div>
                    <Badge variant="outline">{mapping.mapping_type}</Badge>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    {mapping.source_field && (
                      <div>Source: <span className="font-mono">{mapping.source_field}</span></div>
                    )}
                    {mapping.source_fields && (
                      <div>Sources: <span className="font-mono">{mapping.source_fields.join(', ')}</span></div>
                    )}
                    {mapping.separator && (
                      <div>Separator: <span className="font-mono">"{mapping.separator}"</span></div>
                    )}
                    {mapping.value && (
                      <div>Value: <span className="font-mono">{mapping.value}</span></div>
                    )}
                    {mapping.format && (
                      <div>Format: <span className="font-mono">{mapping.format}</span></div>
                    )}
                    {mapping.conditions && (
                      <div>Conditions: <span className="font-mono">{JSON.stringify(mapping.conditions)}</span></div>
                    )}
                    {mapping.delimiter && (
                      <div>Delimiter: <span className="font-mono">"{mapping.delimiter}"</span></div>
                    )}
                    {mapping.index !== undefined && (
                      <div>Index: <span className="font-mono">{mapping.index}</span></div>
                    )}
                    {mapping.table && (
                      <div>Table: <span className="font-mono">{JSON.stringify(mapping.table)}</span></div>
                    )}
                    {mapping.reasoning && (
                      <div className="text-slate-500 mt-1">{mapping.reasoning}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Tabs defaultValue="mappings">
                <TabsList className="mb-2">
                  <TabsTrigger value="mappings">AI Mapping Suggestions</TabsTrigger>
                  <TabsTrigger value="canvas">Canvas-Ready Nodes & Edges</TabsTrigger>
                  <TabsTrigger value="reactflow">React Flow–Ready Output</TabsTrigger>
                  <TabsTrigger value="dataset">Dataset Sent to OpenAI</TabsTrigger>
                  <TabsTrigger value="prompt">Prompt</TabsTrigger>
                  <TabsTrigger value="raw">Raw Response</TabsTrigger>
                </TabsList>
                
                <TabsContent value="mappings">
                  <div className="space-y-2">
                    {aiResponse.mappings.map((mapping, index) => (
                      <div key={index} className="p-3 border rounded-md bg-slate-50">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium">{mapping.target_field}</div>
                          <Badge variant="outline">{mapping.mapping_type}</Badge>
                        </div>
                        
                        <div className="text-sm space-y-1">
                          {mapping.source_field && (
                            <div>Source: <span className="font-mono">{mapping.source_field}</span></div>
                          )}
                          {mapping.source_fields && (
                            <div>Sources: <span className="font-mono">{mapping.source_fields.join(', ')}</span></div>
                          )}
                          {mapping.separator && (
                            <div>Separator: <span className="font-mono">"{mapping.separator}"</span></div>
                          )}
                          {mapping.value && (
                            <div>Value: <span className="font-mono">{mapping.value}</span></div>
                          )}
                          {mapping.format && (
                            <div>Format: <span className="font-mono">{mapping.format}</span></div>
                          )}
                          {mapping.conditions && (
                            <div>Conditions: <span className="font-mono">{JSON.stringify(mapping.conditions)}</span></div>
                          )}
                          {mapping.delimiter && (
                            <div>Delimiter: <span className="font-mono">"{mapping.delimiter}"</span></div>
                          )}
                          {mapping.index !== undefined && (
                            <div>Index: <span className="font-mono">{mapping.index}</span></div>
                          )}
                          {mapping.table && (
                            <div>Table: <span className="font-mono">{JSON.stringify(mapping.table)}</span></div>
                          )}
                          {mapping.reasoning && (
                            <div className="text-slate-500 mt-1">{mapping.reasoning}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="canvas">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Box className="h-4 w-4" />
                        <span className="text-sm font-medium">Canvas Nodes</span>
                      </div>
                      <Textarea
                        value={aiResponse.canvasNodes && aiResponse.canvasNodes.length > 0 
                          ? JSON.stringify(aiResponse.canvasNodes, null, 2) 
                          : "No canvas nodes were generated"}
                        readOnly
                        className="min-h-[300px] font-mono text-sm"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="h-4 w-4" />
                        <span className="text-sm font-medium">Canvas Edges</span>
                      </div>
                      <Textarea
                        value={aiResponse.canvasEdges && aiResponse.canvasEdges.length > 0 
                          ? JSON.stringify(aiResponse.canvasEdges, null, 2) 
                          : "No canvas edges were generated"}
                        readOnly
                        className="min-h-[300px] font-mono text-sm"
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="reactflow">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Box className="h-4 w-4" />
                        <span className="text-sm font-medium">React Flow Nodes</span>
                      </div>
                      <Textarea
                        value={aiResponse.flowNodes && aiResponse.flowNodes.length > 0 
                          ? JSON.stringify(aiResponse.flowNodes, null, 2) 
                          : "No React Flow nodes were generated"}
                        readOnly
                        className="min-h-[300px] font-mono text-sm"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="h-4 w-4" />
                        <span className="text-sm font-medium">React Flow Edges</span>
                      </div>
                      <Textarea
                        value={aiResponse.flowEdges && aiResponse.flowEdges.length > 0 
                          ? JSON.stringify(aiResponse.flowEdges, null, 2) 
                          : "No React Flow edges were generated"}
                        readOnly
                        className="min-h-[300px] font-mono text-sm"
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="dataset">
                  <div className="border rounded-md p-4">
                    <Tabs defaultValue="source">
                      <TabsList className="mb-2">
                        <TabsTrigger value="source">Source Data</TabsTrigger>
                        <TabsTrigger value="target">Target Data</TabsTrigger>
                      </TabsList>
                      <TabsContent value="source">
                        <Textarea
                          value={sentSourceData.length > 0 ? JSON.stringify(sentSourceData, null, 2) : "No source data was sent"}
                          readOnly
                          className="min-h-[300px] font-mono text-sm"
                        />
                      </TabsContent>
                      <TabsContent value="target">
                        <Textarea
                          value={sentTargetData.length > 0 ? JSON.stringify(sentTargetData, null, 2) : "No target data was sent"}
                          readOnly
                          className="min-h-[300px] font-mono text-sm"
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                </TabsContent>
                
                <TabsContent value="prompt">
                  <Textarea
                    value={aiResponse.prompt || "No prompt was stored"}
                    readOnly
                    className="min-h-[300px] font-mono text-sm"
                  />
                </TabsContent>
                
                <TabsContent value="raw">
                  <Textarea
                    value={aiResponse.rawResponse}
                    readOnly
                    className="min-h-[300px] font-mono text-sm"
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};