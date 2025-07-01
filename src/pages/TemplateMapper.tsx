
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Upload, Play, ArrowRight, AlertCircle, Copy, Check } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const sampleSourceData = `[
  {
    "ID": "ACC047105-SHIPMENT-NLRTM-SIF-30244573",
    "Reference": "PU211861",
    "Container_number": "MSKU9025828",
    "DeliveryDate_Type": "ATA",
    "Delivery_date": "2025-05-03T22:00:00Z"
  }
]`;

  const sampleTemplate = `{
  "ID": "{{ ID }}",
  "Reference": "{{ Reference }}",
  "Container_number": "{{ Container_number }}",
  "DeliveryDate_Type": "{{ DeliveryDate_Type }}",
  "Delivery_date": "{{ Delivery_date }}"
}`;

  const handleDataUpload = useCallback((data: any[]) => {
    setSourceData(JSON.stringify(data, null, 2));
    setHasExecuted(false);
    setTransformedResults('');
  }, []);

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

        {/* Three Panel Layout - Weavo Style */}
        <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          
          {/* Left Panel - Input Data */}
          <Card className="flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5" />
                Source Data
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4">
              <Tabs defaultValue="paste" className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="paste">Paste JSON</TabsTrigger>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                </TabsList>
                
                <TabsContent value="paste" className="flex-1 flex flex-col">
                  <Textarea
                    value={sourceData}
                    onChange={(e) => {
                      setSourceData(e.target.value);
                      setHasExecuted(false);
                      setTransformedResults('');
                    }}
                    placeholder={sampleSourceData}
                    className="flex-1 font-mono text-xs resize-none"
                  />
                </TabsContent>
                
                <TabsContent value="upload" className="flex-1 flex flex-col">
                  <DataUploadZone
                    onDataUpload={handleDataUpload}
                    acceptedTypes={['.json', '.csv', '.xlsx']}
                    title="Upload Source Data"
                    description="JSON, CSV, or Excel files"
                  />
                </TabsContent>
              </Tabs>
              
              <div className="mt-2 text-xs text-gray-500">
                {sourceData && `${JSON.parse(sourceData || '[]').length || 0} records`}
              </div>
            </CardContent>
          </Card>

          {/* Middle Panel - Template Builder */}
          <Card className="flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 justify-between text-lg">
                <span>Output Template</span>
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
            <CardContent className="flex-1 flex flex-col p-4">
              <Textarea
                value={outputTemplate}
                onChange={(e) => {
                  setOutputTemplate(e.target.value);
                  setHasExecuted(false);
                  setTransformedResults('');
                }}
                placeholder={sampleTemplate}
                className="flex-1 font-mono text-xs resize-none"
              />
              
              {/* Action Buttons */}
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
                    <AlertDescription className="text-xs">{executionError}</AlertDescription>
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

          {/* Right Panel - Output Preview */}
          <Card className="flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4">
              <div className="flex-1 bg-gray-50 border rounded p-3 overflow-auto">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {transformedResults || (hasExecuted ? 'No results generated' : 'Click "Run Template" to see output preview...')}
                </pre>
              </div>
              
              {transformedResults && (
                <div className="mt-2 text-xs text-gray-500">
                  {JSON.parse(transformedResults || '[]').length || 0} transformed records
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default TemplateMapper;
