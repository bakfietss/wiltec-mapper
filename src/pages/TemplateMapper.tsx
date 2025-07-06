import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Upload, Play, Copy, Check, Download, ArrowRight, Sparkles, Wand2, Map } from 'lucide-react';
import DataUploadZone from '../components/DataUploadZone';
import { useToast } from '../hooks/use-toast';
import { TemplateGenerationService } from '../services/TemplateGenerationService';
import { TemplateToNodesConverter } from '../services/TemplateToNodesConverter';
import { useNavigate } from 'react-router-dom';

const TemplateMapper = () => {
  const [sourceData, setSourceData] = useState('');
  const [outputExample, setOutputExample] = useState('');
  const [outputTemplate, setOutputTemplate] = useState('');
  const [transformedResults, setTransformedResults] = useState('');
  const [fieldConnections, setFieldConnections] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const sampleSourceData = `[
  {
    "customerName": "John Smith",
    "orderId": "ORD-12345",
    "amount": 99.99,
    "status": "completed"
  },
  {
    "customerName": "Jane Doe", 
    "orderId": "ORD-12346",
    "amount": 149.50,
    "status": "pending"
  }
]`;

  const sampleOutputExample = `{
  "customer": "John Smith",
  "order": "ORD-12345",
  "total": 99.99,
  "orderStatus": "completed"
}`;

  const sampleTemplate = `{
  "customer": "{{ customerName }}",
  "order": "{{ orderId }}",
  "total": "{{ amount }}",
  "orderStatus": "{{ status }}"
}`;

  const handleDataUpload = useCallback((data: any[]) => {
    setSourceData(JSON.stringify(data, null, 2));
    setTransformedResults('');
    setFieldConnections([]);
    toast({ title: "Data uploaded successfully!" });
  }, [toast]);

  const handleGenerateTemplate = useCallback(async () => {
    if (!sourceData || !outputExample) {
      toast({ 
        title: "Missing Data", 
        description: "Please provide both source data and output example",
        variant: "destructive" 
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const parsedSourceData = JSON.parse(sourceData);
      const parsedOutputExample = JSON.parse(outputExample);
      
      const generatedTemplate = TemplateGenerationService.generateTemplateFromExamples(
        Array.isArray(parsedSourceData) ? parsedSourceData : [parsedSourceData],
        parsedOutputExample
      );
      
      setOutputTemplate(generatedTemplate);
      toast({ 
        title: "Template generated!", 
        description: "Review and modify the generated template as needed" 
      });
    } catch (error) {
      console.error('Template generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate template';
      toast({ 
        title: "Generation failed", 
        description: errorMessage, 
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  }, [sourceData, outputExample, toast]);

  // Helper function to get nested object value by path
  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object') {
        return current[key];
      }
      return undefined;
    }, obj);
  };

  // Helper function to find value in nested object (more flexible search)
  const findValueInObject = (obj: any, searchKey: string): any => {
    if (!obj || typeof obj !== 'object') return undefined;
    
    // Direct key match
    if (obj.hasOwnProperty(searchKey)) {
      return obj[searchKey];
    }
    
    // Search recursively
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const found = findValueInObject(obj[key], searchKey);
        if (found !== undefined) return found;
      }
    }
    
    return undefined;
  };

  const executeTemplate = useCallback(() => {
    if (!sourceData || !outputTemplate) {
      toast({ 
        title: "Missing Data", 
        description: "Please provide both source data and template",
        variant: "destructive" 
      });
      return;
    }

    setIsExecuting(true);

    try {
      let data = JSON.parse(sourceData);
      const connections: any[] = [];
      
      // If it's not an array, make it an array for consistent processing
      if (!Array.isArray(data)) {
        data = [data];
      }

      console.log('Processing data:', data);
      console.log('Template:', outputTemplate);

      const results = data.map((record, recordIndex) => {
        let processed = outputTemplate;
        
        // Find all template variables in the format {{ variable }}
        const templateVars = processed.match(/\{\{\s*([^}]+)\s*\}\}/g) || [];
        console.log('Found template variables:', templateVars);
        
        templateVars.forEach(templateVar => {
          const cleanVar = templateVar.replace(/\{\{\s*|\s*\}\}/g, '');
          let value = undefined;
          let sourcePath = '';
          let connectionType = 'not_found';
          
          console.log('Processing variable:', cleanVar);
          
          // Try different ways to find the value
          // 1. Direct property access
          if (record.hasOwnProperty(cleanVar)) {
            value = record[cleanVar];
            sourcePath = cleanVar;
            connectionType = 'direct';
          }
          // 2. Nested path access (e.g., "client.company.company_name")
          else if (cleanVar.includes('.')) {
            value = getNestedValue(record, cleanVar);
            sourcePath = cleanVar;
            connectionType = 'nested';
          }
          // 3. Search recursively in the object
          else {
            value = findValueInObject(record, cleanVar);
            if (value !== undefined) {
              sourcePath = `[found: ${cleanVar}]`;
              connectionType = 'search';
            }
          }
          
          // Handle special field mappings for your specific case
          if (value === undefined) {
            switch (cleanVar) {
              case 'ID':
                value = record.id || record._id || record.ID;
                sourcePath = record.id ? 'id' : record._id ? '_id' : 'ID';
                connectionType = 'mapped';
                break;
              case 'Reference':
                value = record.client_reference || record.reference || record.Reference;
                sourcePath = record.client_reference ? 'client_reference' : 
                           record.reference ? 'reference' : 'Reference';
                connectionType = 'mapped';
                break;
              case 'Container_number':
                value = record.containers?.[0]?.container_number || 
                        record.container_number || 
                        record.Container_number;
                sourcePath = record.containers?.[0]?.container_number ? 'containers[0].container_number' :
                           record.container_number ? 'container_number' : 'Container_number';
                connectionType = 'mapped';
                break;
              case 'DeliveryDate_Type':
                value = 'ATA'; // Default value
                sourcePath = '[static value]';
                connectionType = 'static';
                break;
              case 'Delivery_date':
                value = record.itinerary?.actual_time_of_arrival || 
                        record.actual_time_of_arrival ||
                        record.delivery_date ||
                        record.Delivery_date;
                sourcePath = record.itinerary?.actual_time_of_arrival ? 'itinerary.actual_time_of_arrival' :
                           record.actual_time_of_arrival ? 'actual_time_of_arrival' :
                           record.delivery_date ? 'delivery_date' : 'Delivery_date';
                connectionType = 'mapped';
                break;
            }
          }
          
          console.log(`Variable ${cleanVar}: value=${value}, sourcePath=${sourcePath}, type=${connectionType}`);
          
          // Add connection info (only for first record to avoid duplicates)
          if (recordIndex === 0) {
            connections.push({
              templateField: cleanVar,
              sourceField: sourcePath,
              connectionType,
              value: value !== undefined ? String(value) : '[not found]',
              found: value !== undefined
            });
          }
          
          // Replace the template variable with the actual value
          const regex = new RegExp(templateVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          processed = processed.replace(regex, value !== undefined ? String(value) : '');
        });

        return JSON.parse(processed);
      });

      console.log('Final results:', results);
      console.log('Field connections:', connections);

      const resultsJson = JSON.stringify(results, null, 2);
      
      setFieldConnections(connections);
      setTransformedResults(resultsJson);
      
      console.log('State updated - transformedResults:', resultsJson);
      console.log('State updated - fieldConnections:', connections);
      
      toast({ title: "Template executed successfully!", description: `Transformed ${results.length} records` });
    } catch (error) {
      console.error('Template execution error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({ 
        title: "Execution failed", 
        description: errorMessage, 
        variant: "destructive" 
      });
    } finally {
      setIsExecuting(false);
    }
  }, [sourceData, outputTemplate, toast]);

  const handleCopyTemplate = useCallback(() => {
    if (!outputTemplate) return;
    
    navigator.clipboard.writeText(outputTemplate);
    setCopied(true);
    toast({ title: "Template copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  }, [outputTemplate, toast]);

  const handleCopyResults = useCallback(() => {
    if (!transformedResults) return;
    
    navigator.clipboard.writeText(transformedResults);
    setCopied(true);
    toast({ title: "Results copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  }, [transformedResults, toast]);

  const downloadResults = useCallback(() => {
    if (!transformedResults) return;
    
    const blob = new Blob([transformedResults], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transformed-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({ title: "File downloaded!" });
  }, [transformedResults, toast]);

  const handleConvertToVisualMapping = useCallback(() => {
    if (!outputTemplate || !sourceData) {
      toast({ 
        title: "Missing Data", 
        description: "Please generate a template first and have source data",
        variant: "destructive" 
      });
      return;
    }

    try {
      const parsedSourceData = JSON.parse(sourceData);
      const sourceArray = Array.isArray(parsedSourceData) ? parsedSourceData : [parsedSourceData];
      
      const conversionResult = TemplateToNodesConverter.convertTemplateToNodes(
        outputTemplate, 
        sourceArray
      );
      
      TemplateToNodesConverter.storeConversionData(conversionResult);
      
      toast({ 
        title: "Converting to visual mapping!", 
        description: "Opening canvas with generated nodes..." 
      });
      
      // Navigate to the manual mapping canvas page with conversion flag
      navigate('/manual?from=template-conversion');
      
    } catch (error) {
      console.error('Conversion error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to convert template';
      toast({ 
        title: "Conversion failed", 
        description: errorMessage, 
        variant: "destructive" 
      });
    }
  }, [outputTemplate, sourceData, navigate, toast]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Template Mapper</h1>
          <p className="text-lg text-gray-600">Transform your data using custom templates with our Weavo-style interface</p>
        </div>

        {/* 3-Panel Weavo Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-240px)]">
          
          {/* Panel 1: Source Data Input */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Upload className="h-5 w-5 text-blue-600" />
                Source Data
              </CardTitle>
              <p className="text-sm text-gray-500">Input your data to transform</p>
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
                      setTransformedResults('');
                      setFieldConnections([]);
                    }}
                    placeholder={sampleSourceData}
                    className="flex-1 min-h-[400px] font-mono text-sm resize-none border-2 focus:border-blue-500"
                  />
                </TabsContent>
                
                <TabsContent value="upload" className="flex-1 flex flex-col">
                  <DataUploadZone
                    onDataUpload={handleDataUpload}
                    acceptedTypes={['.json', '.csv', '.xlsx']}
                    title="Upload Source Data"
                    description="Drag & drop or click to upload JSON, CSV, or Excel files"
                  />
                </TabsContent>
              </Tabs>
              
              <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
                {sourceData ? `${JSON.parse(sourceData || '[]').length || 0} records loaded` : 'No data loaded'}
              </div>
            </CardContent>
          </Card>

          {/* Panel 2: Output Example Input */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="w-5 h-5 bg-orange-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">E</span>
                </div>
                Output Example
              </CardTitle>
              <p className="text-sm text-gray-500">Provide an example of your desired output</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4">
              <Textarea
                value={outputExample}
                onChange={(e) => setOutputExample(e.target.value)}
                placeholder={sampleOutputExample}
                className="flex-1 min-h-[400px] font-mono text-sm resize-none border-2 focus:border-orange-500 mb-4"
              />
              
              <Button
                onClick={handleGenerateTemplate}
                disabled={!outputExample || !sourceData || isGenerating}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white mb-4"
                size="lg"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {isGenerating ? "Generating..." : "Generate Template"}
              </Button>
              
              <div className="p-3 bg-orange-50 rounded text-sm text-orange-700">
                <strong>How it works:</strong> Provide an example of your desired output structure, and we'll automatically generate the template with proper {`{{ fieldName }}`} placeholders
              </div>
            </CardContent>
          </Card>

          {/* Panel 3: Generated Template */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 justify-between text-xl">
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">T</span>
                  </div>
                  Generated Template
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyTemplate}
                    disabled={!outputTemplate}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardTitle>
              <p className="text-sm text-gray-500">AI-generated template with field mappings</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4">
              {outputTemplate ? (
                <Tabs defaultValue="template" className="flex-1 flex flex-col">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="template">Template</TabsTrigger>
                    <TabsTrigger value="results">Results</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="template" className="flex-1 flex flex-col">
                    <Textarea
                      value={outputTemplate}
                      onChange={(e) => {
                        setOutputTemplate(e.target.value);
                        setTransformedResults('');
                        setFieldConnections([]);
                      }}
                      className="flex-1 min-h-[300px] font-mono text-sm resize-none border-2 focus:border-green-500 mb-4"
                    />
                    
                    <div className="space-y-3">
                      <Button
                        onClick={executeTemplate}
                        disabled={!outputTemplate || !sourceData || isExecuting}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {isExecuting ? "Transforming..." : "Run Transformation"}
                      </Button>
                      
                      <Button
                        onClick={handleConvertToVisualMapping}
                        disabled={!outputTemplate || !sourceData}
                        variant="outline"
                        className="w-full border-purple-500 text-purple-700 hover:bg-purple-50"
                        size="lg"
                      >
                        <Map className="h-4 w-4 mr-2" />
                        Convert to Visual Mapping
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="results" className="flex-1 overflow-auto">
                    {transformedResults ? (
                      <div className="space-y-4">
                        {/* Field Connections */}
                        {fieldConnections.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm text-gray-700">Field Connections</h4>
                            {fieldConnections.map((conn, index) => (
                              <div key={index} className={`p-2 rounded text-xs border-l-4 ${
                                conn.found ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono bg-purple-100 px-1 rounded">{conn.templateField}</span>
                                  <ArrowRight className="h-3 w-3 text-gray-400" />
                                  <span className="font-mono bg-blue-100 px-1 rounded">{conn.sourceField}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Results */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium text-sm text-gray-700">Transformed Data</h4>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={handleCopyResults}>
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={downloadResults}>
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <pre className="text-xs whitespace-pre-wrap font-mono text-gray-800 bg-gray-50 p-3 rounded max-h-60 overflow-auto">
                            {transformedResults}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 text-sm">
                        Run the transformation to see results
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium">Ready to Generate</p>
                    <p className="text-sm">Provide source data and output example to generate your template</p>
                  </div>
                </div>
              )}
              
              {outputTemplate && (
                <div className="mt-3 p-2 bg-green-50 rounded text-sm text-green-700">
                  <div className="p-3 bg-green-50 rounded text-sm text-green-700">
                    <strong>Template Syntax:</strong> Use {`{{ fieldName }}`} to reference source data fields
                  </div>
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
