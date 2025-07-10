import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Upload, Play, Copy, Check, Download, ArrowRight, Sparkles, Wand2, Map, Brain, BarChart3 } from 'lucide-react';
import DataUploadZone from '../components/DataUploadZone';
import { useToast } from '../hooks/use-toast';
import { TemplateGenerationService } from '../services/TemplateGenerationService';
import { TemplateToNodesConverter } from '../services/TemplateToNodesConverter';
import { XmlJsonConverter } from '../services/XmlJsonConverter';
import { IntelligentMappingService, type MappingRule, type AnalysisResult } from '../services/IntelligentMappingService';
import { useNavigate } from 'react-router-dom';

const TemplateMapper = () => {
  const [sourceData, setSourceData] = useState('');
  const [outputExample, setOutputExample] = useState('');
  const [outputTemplate, setOutputTemplate] = useState('');
  const [transformedResults, setTransformedResults] = useState('');
  const [fieldConnections, setFieldConnections] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [outputFormat, setOutputFormat] = useState<'xml' | 'json'>('json');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [batchMode, setBatchMode] = useState(false);
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

  const sampleXmlOutput = `<?xml version="1.0" encoding="UTF-8"?>
<persons company_acro_name="TEIJIN">
  <person personid_extern="7726295" firstname="John" lastname="Smith" email="john@example.com"/>
</persons>`;

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
    setAnalysisResult(null);
    toast({ title: "Data uploaded successfully!" });
  }, [toast]);

  const handleIntelligentAnalysis = useCallback(async () => {
    if (!sourceData || !outputExample) {
      toast({ 
        title: "Missing Data", 
        description: "Please provide both source data and output examples for intelligent analysis",
        variant: "destructive" 
      });
      return;
    }

    setIsAnalyzing(true);
    console.log('🧠 Starting intelligent analysis...');
    console.log('Source data length:', sourceData.length);
    console.log('Output example length:', outputExample.length);
    
    try {
      const parsedSourceData = JSON.parse(sourceData);
      console.log('📊 Parsed source data:', parsedSourceData);
      
      // Handle different data structures
      let sourceArray;
      if (Array.isArray(parsedSourceData)) {
        sourceArray = parsedSourceData;
      } else if (parsedSourceData.rows && Array.isArray(parsedSourceData.rows)) {
        // Handle {rows: [...]} structure
        sourceArray = parsedSourceData.rows;
        console.log('📋 Found rows structure with', sourceArray.length, 'records');
      } else {
        sourceArray = [parsedSourceData];
      }
      
      console.log('📈 Processing', sourceArray.length, 'source records');
      
      // For large datasets, use smart sampling
      const isLargeDataset = sourceArray.length > 100;
      let sampleSize = Math.min(100, sourceArray.length);
      
      if (isLargeDataset) {
        // Smart sampling: take samples from different parts of the dataset
        const step = Math.floor(sourceArray.length / sampleSize);
        const sampledData = [];
        for (let i = 0; i < sourceArray.length && sampledData.length < sampleSize; i += step) {
          sampledData.push(sourceArray[i]);
        }
        sourceArray = sampledData;
        console.log('🎯 Sampled', sourceArray.length, 'records for analysis');
        
        toast({ 
          title: "Large Dataset Detected", 
          description: `Analyzing ${sampleSize} representative samples from ${parsedSourceData.rows?.length || parsedSourceData.length} total records`,
          variant: "default"
        });
      }
      
      // Auto-detect output format and convert if needed
      const detectedFormat = XmlJsonConverter.detectFormat(outputExample);
      console.log('🔍 Detected output format:', detectedFormat);
      setOutputFormat(detectedFormat as 'xml' | 'json');
      
      let normalizedOutput;
      if (detectedFormat === 'xml') {
        console.log('🔧 Converting XML to JSON for analysis...');
        normalizedOutput = XmlJsonConverter.xmlToJson(outputExample);
        console.log('✅ Normalized XML output:', normalizedOutput);
      } else {
        normalizedOutput = JSON.parse(outputExample);
        console.log('✅ Parsed JSON output:', normalizedOutput);
      }
      
      // Create target examples for analysis
      // For intelligent analysis, we need to map source records to expected targets
      console.log('🎯 Creating target examples for analysis...');
      const numSamples = Math.min(5, sourceArray.length);
      const targetExamples = Array(numSamples).fill(normalizedOutput);
      
      console.log('🔬 Running intelligent mapping analysis...');
      const analysisResult = IntelligentMappingService.analyzeMultipleExamples(
        sourceArray.slice(0, numSamples),
        targetExamples
      );
      
      console.log('📊 Analysis result:', analysisResult);
      setAnalysisResult(analysisResult);
      
      // Generate enhanced template based on analysis results
      if (analysisResult.mappingRules.length > 0 || Object.keys(analysisResult.staticValues).length > 0) {
        console.log('🔧 Generating intelligent template...');
        const enhancedTemplate = await generateIntelligentTemplate(analysisResult, detectedFormat, normalizedOutput);
        console.log('✅ Generated template:', enhancedTemplate);
        setOutputTemplate(enhancedTemplate);
      } else {
        console.log('⚠️ No mapping rules found, generating basic template...');
        // Fallback to basic template generation
        const basicTemplate = TemplateGenerationService.generateTemplateFromExamples(
          sourceArray.slice(0, 3),
          normalizedOutput
        );
        setOutputTemplate(basicTemplate);
      }
      
      const totalRules = analysisResult.mappingRules.length + Object.keys(analysisResult.staticValues).length;
      toast({ 
        title: "🧠 Intelligent Analysis Complete!", 
        description: `Found ${totalRules} mappings with ${Math.round(analysisResult.confidence * 100)}% confidence${isLargeDataset ? ` from ${sampleSize} samples` : ''}` 
      });
    } catch (error) {
      console.error('❌ Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      toast({ 
        title: "Analysis failed", 
        description: `${errorMessage}. Check console for details.`, 
        variant: "destructive" 
      });
      
      // Try fallback to basic template generation
      try {
        console.log('🔄 Attempting fallback to basic template generation...');
        const parsedSourceData = JSON.parse(sourceData);
        const sourceArray = Array.isArray(parsedSourceData) ? parsedSourceData : 
                          parsedSourceData.rows ? parsedSourceData.rows : [parsedSourceData];
        
        const detectedFormat = XmlJsonConverter.detectFormat(outputExample);
        let normalizedOutput;
        if (detectedFormat === 'xml') {
          normalizedOutput = XmlJsonConverter.xmlToJson(outputExample);
        } else {
          normalizedOutput = JSON.parse(outputExample);
        }
        
        const basicTemplate = TemplateGenerationService.generateTemplateFromExamples(
          sourceArray.slice(0, 3),
          normalizedOutput
        );
        setOutputTemplate(basicTemplate);
        setOutputFormat(detectedFormat as 'xml' | 'json');
        
        toast({ 
          title: "Fallback Template Generated", 
          description: "Used basic template generation since intelligent analysis failed" 
        });
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [sourceData, outputExample, toast]);

  // Generate template based on intelligent analysis results
  const generateIntelligentTemplate = async (analysisResult: AnalysisResult, outputFormat: string, normalizedOutput: any): Promise<string> => {
    let template = JSON.stringify(normalizedOutput, null, 2);
    
    // Apply detected mapping rules
    for (const rule of analysisResult.mappingRules) {
      const targetPattern = `"${rule.targetField}"\\s*:\\s*"[^"]*"`;
      const regex = new RegExp(targetPattern, 'g');
      
      if (rule.mappingType === 'conditional' && rule.conditions) {
        // Generate conditional template logic
        let conditionalLogic = '{{#if ' + rule.sourceField + '}}';
        rule.conditions.forEach(condition => {
          conditionalLogic += `{{#eq ${rule.sourceField} "${condition.sourceValue}"}}${condition.targetValue}{{/eq}}`;
        });
        conditionalLogic += '{{/if}}';
        
        template = template.replace(regex, `"${rule.targetField}": "${conditionalLogic}"`);
      } else if (rule.mappingType === 'transform' && rule.transformation) {
        // Generate transformation template
        if (rule.transformation.type === 'date_format') {
          template = template.replace(regex, `"${rule.targetField}": "{{formatDate ${rule.sourceField} 'YYYY-MM-DD'}}"`);
        }
      } else {
        // Direct mapping
        template = template.replace(regex, `"${rule.targetField}": "{{ ${rule.sourceField} }}"`);
      }
    }
    
    // Apply static values
    for (const [field, value] of Object.entries(analysisResult.staticValues)) {
      const staticPattern = `"${field}"\\s*:\\s*"[^"]*"`;
      const staticRegex = new RegExp(staticPattern, 'g');
      template = template.replace(staticRegex, `"${field}": "${value}"`);
    }
    
    // Convert back to XML if needed
    if (outputFormat === 'xml') {
      try {
        const jsonTemplate = JSON.parse(template);
        template = XmlJsonConverter.jsonToXml(jsonTemplate);
      } catch (error) {
        console.warn('Could not convert template back to XML, keeping JSON format');
      }
    }
    
    return template;
  };

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
    <div className="h-full bg-gray-50">
      <div className="h-full px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Template Mapper</h1>
          <p className="text-lg text-gray-600">Transform your data using custom templates with our Weavo-style interface</p>
        </div>

        {/* Analysis Results Panel */}
        {analysisResult && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                Intelligent Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-lg font-bold text-green-700">{Math.round(analysisResult.confidence * 100)}%</div>
                  <div className="text-sm text-green-600">Confidence</div>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-lg font-bold text-blue-700">{analysisResult.mappingRules.length}</div>
                  <div className="text-sm text-blue-600">Smart Mappings</div>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <div className="text-lg font-bold text-purple-700">{Math.round(analysisResult.coverage * 100)}%</div>
                  <div className="text-sm text-purple-600">Coverage</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Detected Patterns:</h4>
                {analysisResult.mappingRules.map((rule, index) => (
                  <div key={index} className={`p-2 rounded text-xs border-l-4 ${
                    rule.mappingType === 'direct' ? 'bg-green-50 border-green-500' :
                    rule.mappingType === 'conditional' ? 'bg-yellow-50 border-yellow-500' :
                    rule.mappingType === 'transform' ? 'bg-blue-50 border-blue-500' :
                    'bg-gray-50 border-gray-500'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono bg-white px-1 rounded">{rule.sourceField}</span>
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                      <span className="font-mono bg-white px-1 rounded">{rule.targetField}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        rule.mappingType === 'direct' ? 'bg-green-100 text-green-700' :
                        rule.mappingType === 'conditional' ? 'bg-yellow-100 text-yellow-700' :
                        rule.mappingType === 'transform' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {rule.mappingType}
                      </span>
                    </div>
                    {rule.conditions && (
                      <div className="text-xs text-gray-600 ml-4">
                        Conditions: {rule.conditions.map(c => `${c.sourceValue}→${c.targetValue}`).join(', ')}
                      </div>
                    )}
                    {rule.transformation && (
                      <div className="text-xs text-gray-600 ml-4">
                        Transform: {rule.transformation.type}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3-Panel Weavo Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          
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
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="paste">Paste JSON</TabsTrigger>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                  <TabsTrigger value="large">Large Dataset</TabsTrigger>
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

                <TabsContent value="large" className="flex-1 flex flex-col space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">📊 Large Dataset Mode</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      For datasets with 1000+ records, upload your file and we'll analyze the first 100 records for pattern detection, then apply the logic to all records.
                    </p>
                    <div className="space-y-2">
                      <DataUploadZone
                        onDataUpload={handleDataUpload}
                        acceptedTypes={['.json', '.csv', '.xlsx']}
                        title="Upload Large Dataset"
                        description="JSON, CSV, or Excel files up to 50MB"
                      />
                      <div className="text-xs text-blue-600">
                        💡 We'll show a sample preview and use intelligent analysis on representative data
                      </div>
                    </div>
                  </div>
                  
                  {sourceData && (
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Dataset Preview</span>
                        <span className="text-xs text-gray-500">
                          {JSON.parse(sourceData || '[]').length} records loaded
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded border max-h-32 overflow-y-auto">
                        <pre className="text-xs text-gray-600">
                          {JSON.stringify(JSON.parse(sourceData || '[]').slice(0, 2), null, 2)}
                          {JSON.parse(sourceData || '[]').length > 2 && '\n... and ' + (JSON.parse(sourceData || '[]').length - 2) + ' more records'}
                        </pre>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
              
              <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
                {sourceData ? (
                  (() => {
                    const recordCount = JSON.parse(sourceData || '[]').length || 0;
                    return `${recordCount.toLocaleString()} records loaded ${recordCount > 1000 ? '(Large dataset detected 🚀)' : ''}`;
                  })()
                ) : 'No data loaded'}
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
              {/* Format Selection */}
              <div className="mb-4">
                <Tabs value={outputFormat} onValueChange={(value) => setOutputFormat(value as 'xml' | 'json')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="json">JSON Output</TabsTrigger>
                    <TabsTrigger value="xml">XML Output</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <Tabs value="output" className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="output">Output Example</TabsTrigger>
                  <TabsTrigger value="template">Template Result</TabsTrigger>
                </TabsList>
                
                <TabsContent value="output" className="flex-1 flex flex-col">
                  <Textarea
                    value={outputExample}
                    onChange={(e) => setOutputExample(e.target.value)}
                    placeholder={outputFormat === 'xml' ? sampleXmlOutput : sampleOutputExample}
                    className="flex-1 min-h-[300px] font-mono text-sm resize-none border-2 focus:border-orange-500 mb-4"
                  />
                  
                  <div className="space-y-2">
                    <Button
                      onClick={handleIntelligentAnalysis}
                      disabled={!outputExample || !sourceData || isAnalyzing}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      size="lg"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      {isAnalyzing ? "Analyzing 10K+ records..." : "🧠 Intelligent Analysis"}
                    </Button>
                    
                    <Button
                      onClick={handleGenerateTemplate}
                      disabled={!outputExample || !sourceData || isGenerating}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                      size="lg"
                      variant="outline"
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      {isGenerating ? "Generating..." : "Basic Template"}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="template" className="flex-1 flex flex-col">
                  <Textarea
                    value={outputTemplate}
                    onChange={(e) => setOutputTemplate(e.target.value)}
                    placeholder="Generated template will appear here..."
                    className="flex-1 min-h-[350px] font-mono text-sm resize-none border-2 focus:border-green-500"
                    readOnly={!outputTemplate}
                  />
                </TabsContent>
              </Tabs>
              
              <div className="p-3 bg-orange-50 rounded text-sm text-orange-700">
                <strong>💡 Pro Tip:</strong> Use "Intelligent Analysis" to automatically detect patterns like conditional mappings (M→Male), date transformations, and more!
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
