import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Upload, Play, Copy, Check } from 'lucide-react';
import DataUploadZone from '../components/DataUploadZone';
import { useToast } from '../hooks/use-toast';
import { TemplateToNodesConverter } from '../services/TemplateToNodesConverter';
import { useNavigate } from 'react-router-dom';

const TemplateMapper = () => {
  const [sourceData, setSourceData] = useState('');
  const [targetData, setTargetData] = useState('');
  const [generatedTemplate, setGeneratedTemplate] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSourceDataUpload = useCallback((data: any[]) => {
    setSourceData(JSON.stringify(data, null, 2));
    setGeneratedTemplate('');
    toast({ title: "Source data uploaded successfully!" });
  }, [toast]);

  const handleTargetDataUpload = useCallback((data: any[]) => {
    setTargetData(JSON.stringify(data, null, 2));
    setGeneratedTemplate('');
    toast({ title: "Target data uploaded successfully!" });
  }, [toast]);

  // Simple conversion logic - you can build your own here
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
    console.log('🔄 Converting data to template...');
    
    try {
      const parsedData = JSON.parse(sourceData);
      
      // Basic conversion logic - generates a simple template from the source data structure
      let template;
      if (Array.isArray(parsedData)) {
        // Use first item as template structure
        template = createTemplateFromObject(parsedData[0] || {});
      } else if (parsedData.rows && Array.isArray(parsedData.rows)) {
        // Handle {rows: [...]} structure  
        template = createTemplateFromObject(parsedData.rows[0] || {});
      } else {
        template = createTemplateFromObject(parsedData);
      }
      
      setGeneratedTemplate(JSON.stringify(template, null, 2));
      toast({ 
        title: "Template generated!", 
        description: "Template created from source data structure" 
      });
    } catch (error) {
      console.error('❌ Conversion error:', error);
      toast({ 
        title: "Conversion failed", 
        description: "Invalid JSON data", 
        variant: "destructive" 
      });
    } finally {
      setIsConverting(false);
    }
  }, [sourceData, toast]);

  // Basic template creation - replaces values with template variables
  const createTemplateFromObject = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.length > 0 ? [createTemplateFromObject(obj[0])] : [];
    }
    
    if (typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = createTemplateFromObject(value);
      }
      return result;
    }
    
    // Convert primitive values to template variables
    if (typeof obj === 'string') {
      return `{{ ${obj} }}`; // You can customize this logic
    }
    
    return `{{ value }}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied to clipboard!" });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({ 
        title: "Copy failed", 
        description: "Please copy manually", 
        variant: "destructive" 
      });
    }
  };

  const handleCreateVisualMapping = useCallback(() => {
    if (!sourceData || !generatedTemplate) {
      toast({ 
        title: "Missing Data", 
        description: "Please upload data and generate template first",
        variant: "destructive" 
      });
      return;
    }

    try {
      const parsedSourceData = JSON.parse(sourceData);
      let dataForConversion;
      
      if (Array.isArray(parsedSourceData)) {
        dataForConversion = parsedSourceData[0] || {};
      } else if (parsedSourceData.rows && Array.isArray(parsedSourceData.rows)) {
        dataForConversion = parsedSourceData.rows[0] || {};
      } else {
        dataForConversion = parsedSourceData;
      }

      const { nodes, edges } = TemplateToNodesConverter.convertTemplateToNodes(
        generatedTemplate,
        [dataForConversion]
      );

      localStorage.setItem('templateConversionData', JSON.stringify({
        nodes,
        edges,
        sampleData: dataForConversion
      }));

      navigate('/canvas');
      toast({ 
        title: "Visual mapping created!", 
        description: "Opening canvas with your mapping" 
      });
    } catch (error) {
      console.error('Visual mapping creation error:', error);
      toast({ 
        title: "Creation failed", 
        description: "Failed to create visual mapping", 
        variant: "destructive" 
      });
    }
  }, [sourceData, generatedTemplate, navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Template Mapper
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Upload your data and generate templates for visual mapping
          </p>
        </div>

        {/* Source Data Upload */}
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
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">
                    Source Data Preview
                  </span>
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
                  onChange={(e) => setSourceData(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Your source data will appear here..."
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Target Data Upload */}
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
              description="Drag and drop your target data file or click to browse"
            />
            
            {targetData && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">
                    Target Data Preview
                  </span>
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
                  onChange={(e) => setTargetData(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Your target data will appear here..."
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion */}
        <Card>
          <CardHeader>
            <CardTitle>Template Generation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleConvertToTemplate}
              disabled={isConverting || !sourceData}
              size="lg"
              className="w-full"
            >
              {isConverting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Converting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Convert to Template
                </>
              )}
            </Button>
            
            {generatedTemplate && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">
                    Generated Template
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(generatedTemplate)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Textarea
                  value={generatedTemplate}
                  onChange={(e) => setGeneratedTemplate(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Generated template will appear here..."
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Visual Mapping */}
        {generatedTemplate && (
          <Card>
            <CardHeader>
              <CardTitle>Visual Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleCreateVisualMapping}
                disabled={!sourceData || !generatedTemplate}
                size="lg"
                variant="outline"
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                Create Visual Mapping
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TemplateMapper;