import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ApiKeyService } from '@/services/ApiKeyService';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Upload, Copy, Check, Shield, PlayCircle, CheckCircle } from 'lucide-react';
import DataUploadZone from '../components/DataUploadZone';
import { RedactionConfig, redactArray, redactSample } from '../templatemapper/input-processor/redact';
import { flattenJsonData } from '../utils/flatten';
import { copyToClipboard } from '../utils/clipboard';
import { generateTemplate } from '../templatemapper/input-processor/template-generator';
import { VisualRedactionSettings } from '../templatemapper/components/VisualRedactionSettings';
import { AiConnectionsSection } from '../templatemapper/components/AiConnectionsSection';
import { generateMappings, OpenAIResponse } from '../templatemapper/services/AIConnectionGenerator';

export default function TemplateMapper() {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State management
  const [sourceData, setSourceData] = useState('');
  const [targetData, setTargetData] = useState('');
  const [sourceDataFlattened, setSourceDataFlattened] = useState('');
  const [targetDataFlattened, setTargetDataFlattened] = useState('');
  const [generatedTemplate, setGeneratedTemplate] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRedactionSettings, setShowRedactionSettings] = useState(false);
  const [redactionConfig, setRedactionConfig] = useState(() => new RedactionConfig());
  
  // State for AI connections
  const [isGeneratingConnections, setIsGeneratingConnections] = useState(false);
  const [aiResponse, setAiResponse] = useState<OpenAIResponse | null>(null);
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false);
  
  // Check if OpenAI API key exists in database or localStorage
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        // Check database first
        const { data: apiKeys, error } = await supabase
          .from('api_keys')
          .select('*')
          .like('description', 'OpenAI API Key%')
          .eq('status', 'active')
          .eq('revoked', false);
        
        if (error) {
          console.error('Failed to fetch OpenAI API keys:', error);
          // Fall back to localStorage check
          const localApiKey = localStorage.getItem('openai_api_key');
          setHasOpenAIKey(!!localApiKey);
          
          if (!localApiKey) {
            toast({
              title: "OpenAI API Key Missing",
              description: "Please add your OpenAI API key in API Key Manager to use AI features",
              variant: "destructive"
            });
          }
          return;
        }
        
        // Filter out expired keys
        const validKeys = apiKeys?.filter(key => !ApiKeyService.isExpired(key.expires_at)) || [];
        
        if (validKeys.length > 0) {
          setHasOpenAIKey(true);
          return;
        }
        
        // Fall back to localStorage check
        const localApiKey = localStorage.getItem('openai_api_key');
        setHasOpenAIKey(!!localApiKey);
        
        if (!localApiKey && validKeys.length === 0) {
          toast({
            title: "OpenAI API Key Missing",
            description: "Please add your OpenAI API key in API Key Manager to use AI features",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error checking for OpenAI API key:', error);
        // Fall back to localStorage check as a last resort
        const localApiKey = localStorage.getItem('openai_api_key');
        setHasOpenAIKey(!!localApiKey);
      }
    };
    
    checkApiKey();
  }, [toast]);

  const handleRedactionConfigChange = useCallback((newConfig: RedactionConfig) => {
    setRedactionConfig(newConfig);
  }, []);

  // Function to generate connections
  const handleGenerateConnections = useCallback(async () => {
    if (!sourceDataFlattened || !targetDataFlattened) {
      toast({ 
        title: "Missing Data", 
        description: "Please upload both source and target data",
        variant: "destructive" 
      });
      return;
    }

    setIsGeneratingConnections(true);
    
    try {
      // Parse the flattened data
      const sourceData = JSON.parse(sourceDataFlattened);
      const targetData = JSON.parse(targetDataFlattened);
      
      // Get the rows or use the data directly
      const sourceRows = sourceData.rows || [sourceData];
      const targetRows = targetData.rows || [targetData];
      
      // Generate mappings using OpenAI
      const response = await generateMappings(sourceRows, targetRows, redactionConfig);
      setAiResponse(response);
      
      toast({ 
        title: "Connections generated!", 
        description: `${response.mappings.length} field mappings suggested` 
      });
    } catch (error: any) {
      console.error('Connection generation error:', error);
      toast({ 
        title: "Generation failed", 
        description: error.message || "Failed to generate connections", 
        variant: "destructive" 
      });
    } finally {
      setIsGeneratingConnections(false);
    }
  }, [sourceDataFlattened, targetDataFlattened, redactionConfig, toast]);

  const handleSourceDataUpload = useCallback((data: any[]) => {
    setSourceData(JSON.stringify(data, null, 2));
    const flattenedData = flattenJsonData(data);
    setSourceDataFlattened(JSON.stringify(flattenedData, null, 2));
    setGeneratedTemplate('');
    toast({ title: "Source data uploaded and flattened successfully!" });
  }, [toast]);

  const handleTargetDataUpload = useCallback((data: any[]) => {
    setTargetData(JSON.stringify(data, null, 2));
    const flattenedData = flattenJsonData(data);
    setTargetDataFlattened(JSON.stringify(flattenedData, null, 2));
    setGeneratedTemplate('');
    toast({ title: "Target data uploaded and flattened successfully!" });
  }, [toast]);

  const handleConvertToTemplate = useCallback(async () => {
    if (!sourceData) {
      toast({ 
        title: "Missing Data", 
        description: "Please upload source data first",
        variant: "destructive" 
      });
      return;
    }

    setIsConverting(true);
    
    try {
      const template = await generateTemplate(sourceData);
      setGeneratedTemplate(JSON.stringify(template, null, 2));
      toast({ 
        title: "Template generated!", 
        description: "Template created from source data structure" 
      });
    } catch (error) {
      console.error('Template generation error:', error);
      toast({ 
        title: "Generation failed", 
        description: "Failed to generate template", 
        variant: "destructive" 
      });
    } finally {
      setIsConverting(false);
    }
  }, [sourceData, toast]);

return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Redaction Settings Button */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Template Mapper</h1>
            <p className="text-muted-foreground">Upload your data and generate templates for visual mapping</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowRedactionSettings(true)}>
            <Shield className="h-4 w-4 mr-2" />
            Redaction Settings
          </Button>
        </div>

        {/* Two-pane Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Source Data Pane */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Source Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataUploadZone 
                onDataUpload={handleSourceDataUpload}
                acceptedTypes={['JSON', 'CSV', 'Excel']}
                title="Upload Source Data"
                description="Drag and drop your data file or click to browse"
              />
              
              {sourceData && (
                <Tabs defaultValue="raw" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="raw">Raw</TabsTrigger>
                    <TabsTrigger value="flattened">Flattened</TabsTrigger>
                    <TabsTrigger value="redacted">Redacted</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="raw" className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Raw Data</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(sourceData)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Textarea
                      value={sourceData}
                      readOnly
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </TabsContent>
                  
                  <TabsContent value="flattened" className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Flattened Data</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(sourceDataFlattened)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Textarea
                      value={sourceDataFlattened}
                      readOnly
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </TabsContent>
                  
                  <TabsContent value="redacted" className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Redacted Data</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const data = JSON.parse(sourceDataFlattened);
                          const redactedData = data.rows ? 
                            { rows: redactArray(data.rows, redactionConfig) } : 
                            redactSample(data, redactionConfig);
                          copyToClipboard(JSON.stringify(redactedData, null, 2));
                        }}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Textarea
                      value={(() => {
                        try {
                          const data = JSON.parse(sourceDataFlattened);
                          const redactedData = data.rows ? 
                            { rows: redactArray(data.rows, redactionConfig) } : 
                            redactSample(data, redactionConfig);
                          return JSON.stringify(redactedData, null, 2);
                        } catch (e) {
                          return '';
                        }
                      })()}
                      readOnly
                      className="min-h-[400px] font-mono text-sm"
                    />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      Personal information has been redacted
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          {/* Target Data Pane */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Target Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataUploadZone 
                onDataUpload={handleTargetDataUpload}
                acceptedTypes={['JSON', 'CSV', 'Excel']}
                title="Upload Target Data"
                description="Drag and drop your data file or click to browse"
              />
              
              {targetData && (
                <Tabs defaultValue="raw" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="raw">Raw</TabsTrigger>
                    <TabsTrigger value="flattened">Flattened</TabsTrigger>
                    <TabsTrigger value="redacted">Redacted</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="raw" className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Raw Data</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(targetData)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Textarea
                      value={targetData}
                      readOnly
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </TabsContent>
                  
                  <TabsContent value="flattened" className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Flattened Data</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(targetDataFlattened)}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Textarea
                      value={targetDataFlattened}
                      readOnly
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </TabsContent>
                  
                  <TabsContent value="redacted" className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Redacted Data</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const data = JSON.parse(targetDataFlattened);
                          const redactedData = data.rows ? 
                            { rows: redactArray(data.rows, redactionConfig) } : 
                            redactSample(data, redactionConfig);
                          copyToClipboard(JSON.stringify(redactedData, null, 2));
                        }}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Textarea
                      value={(() => {
                        try {
                          const data = JSON.parse(targetDataFlattened);
                          const redactedData = data.rows ? 
                            { rows: redactArray(data.rows, redactionConfig) } : 
                            redactSample(data, redactionConfig);
                          return JSON.stringify(redactedData, null, 2);
                        } catch (e) {
                          return '';
                        }
                      })()}
                      readOnly
                      className="min-h-[400px] font-mono text-sm"
                    />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      Personal information has been redacted
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
  




        {/* AI Connections Section */}
        <AiConnectionsSection
            isGenerating={isGeneratingConnections}
            aiResponse={aiResponse}
            onGenerateConnections={handleGenerateConnections}
            sourceDataAvailable={!!sourceDataFlattened}
            targetDataAvailable={!!targetDataFlattened}
            hasOpenAIKey={hasOpenAIKey}
            sentSourceData={aiResponse?.sentSourceData}
            sentTargetData={aiResponse?.sentTargetData}
          />

        {/* Convert Button */}
      {sourceData && targetData && (
        <Card className="p-6 text-center bg-muted/50">
          <div className="space-y-4">
            <Badge variant="secondary" className="flex items-center space-x-1 w-fit mx-auto">
              <CheckCircle className="h-3 w-3" />
              <span>Ready to convert</span>
            </Badge>
            <Button
              size="lg"
              className="px-12 py-3 text-lg font-semibold"
              onClick={handleConvertToTemplate}
              disabled={isConverting}
            >
              <PlayCircle className="h-5 w-5 mr-2" />
              Convert to Template
            </Button>
          </div>
        </Card>
      )}

      {/* Visual Redaction Settings Dialog */}
      <VisualRedactionSettings
        open={showRedactionSettings}
        onOpenChange={setShowRedactionSettings}
        onConfigChange={handleRedactionConfigChange}
        initialConfig={redactionConfig}
      />
    </div>
  </div>
);
}