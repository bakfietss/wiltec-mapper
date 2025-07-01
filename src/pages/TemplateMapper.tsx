
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Upload, Play, Copy, Check, Download } from 'lucide-react';
import NavigationBar from '../components/NavigationBar';
import DataUploadZone from '../components/DataUploadZone';
import { useToast } from '../hooks/use-toast';

const TemplateMapper = () => {
  const [sourceData, setSourceData] = useState('');
  const [outputTemplate, setOutputTemplate] = useState('');
  const [transformedResults, setTransformedResults] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

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

  const sampleTemplate = `{
  "customer": "{{ customerName }}",
  "order": "{{ orderId }}",
  "total": "{{ amount }}",
  "orderStatus": "{{ status }}"
}`;

  const handleDataUpload = useCallback((data: any[]) => {
    setSourceData(JSON.stringify(data, null, 2));
    setTransformedResults('');
    toast({ title: "Data uploaded successfully!" });
  }, [toast]);

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
      
      // If it's not an array, make it an array for consistent processing
      if (!Array.isArray(data)) {
        data = [data];
      }

      const results = data.map(record => {
        let processed = outputTemplate;
        
        // Find all template variables in the format {{ variable }}
        const templateVars = processed.match(/\{\{\s*([^}]+)\s*\}\}/g) || [];
        
        templateVars.forEach(templateVar => {
          const cleanVar = templateVar.replace(/\{\{\s*|\s*\}\}/g, '');
          let value = undefined;
          
          // Try different ways to find the value
          // 1. Direct property access
          if (record.hasOwnProperty(cleanVar)) {
            value = record[cleanVar];
          }
          // 2. Nested path access (e.g., "client.company.company_name")
          else if (cleanVar.includes('.')) {
            value = getNestedValue(record, cleanVar);
          }
          // 3. Search recursively in the object
          else {
            value = findValueInObject(record, cleanVar);
          }
          
          // Handle special cases for your specific data structure
          if (value === undefined) {
            switch (cleanVar.toLowerCase()) {
              case 'id':
                value = record.id || record._id || record.ID;
                break;
              case 'reference':
                value = record.client_reference || record.reference || record.Reference;
                break;
              case 'container_number':
                value = record.containers?.[0]?.container_number || 
                        record.container_number || 
                        record.Container_number;
                break;
              case 'deliverydate_type':
                value = 'ATA'; // Default value as shown in your template
                break;
              case 'delivery_date':
                value = record.itinerary?.actual_time_of_arrival || 
                        record.actual_time_of_arrival ||
                        record.delivery_date ||
                        record.Delivery_date;
                break;
            }
          }
          
          // Replace the template variable with the actual value
          const regex = new RegExp(templateVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          processed = processed.replace(regex, value !== undefined ? String(value) : '');
        });

        return JSON.parse(processed);
      });

      setTransformedResults(JSON.stringify(results, null, 2));
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

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />
      
      <div className="container mx-auto px-6 py-8 mt-16">
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

          {/* Panel 2: Template Builder */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 justify-between text-xl">
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">T</span>
                  </div>
                  Output Template
                </span>
              </CardTitle>
              <p className="text-sm text-gray-500">Design your output structure</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4">
              <Textarea
                value={outputTemplate}
                onChange={(e) => {
                  setOutputTemplate(e.target.value);
                  setTransformedResults('');
                }}
                placeholder={sampleTemplate}
                className="flex-1 font-mono text-sm resize-none border-2 focus:border-green-500 mb-4"
              />
              
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded text-sm text-green-700">
                  <strong>Template Syntax:</strong> Use {`{{ fieldName }}`} to reference source data fields
                </div>
                
                <Button
                  onClick={executeTemplate}
                  disabled={!outputTemplate || !sourceData || isExecuting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isExecuting ? "Transforming..." : "Run Transformation"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Panel 3: Results Preview */}
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 justify-between text-xl">
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-purple-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">R</span>
                  </div>
                  Results Preview
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyResults}
                    disabled={!transformedResults}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadResults}
                    disabled={!transformedResults}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <p className="text-sm text-gray-500">View your transformed data</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4">
              <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 overflow-auto">
                {transformedResults ? (
                  <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800">
                    {transformedResults}
                  </pre>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                        <Play className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-lg font-medium">Ready to Transform</p>
                      <p className="text-sm">Click "Run Transformation" to see results</p>
                    </div>
                  </div>
                )}
              </div>
              
              {transformedResults && (
                <div className="mt-3 p-2 bg-purple-50 rounded text-sm text-purple-700">
                  ✅ {JSON.parse(transformedResults || '[]').length || 0} records transformed successfully
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
