import React, { useState, useCallback } from 'react';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { SourceDataSection } from '../templatemapper/components/SourceDataSection';
import { TargetDataSection } from '../templatemapper/components/TargetDataSection';
import { TemplateGenerationSection } from '../templatemapper/components/TemplateGenerationSection';
import { VisualMappingSection } from '../templatemapper/components/VisualMappingSection';
import { TemplateMapperHeader } from '../templatemapper/components/TemplateMapperHeader';
import { RedactionConfig } from '../templatemapper/input-processor/redact';
import { RedactionSettings } from '../templatemapper/components/RedactionSettings';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { flattenJsonData } from '../utils/flatten';
import { copyToClipboard } from '../utils/clipboard';
import { generateTemplate } from '../templatemapper/input-processor/template-generator';
import { TemplateToNodesConverter } from '../services/TemplateToNodesConverter';

export default function TemplateMapper() {
  // State management
  const [sourceData, setSourceData] = useState('');
  const [targetData, setTargetData] = useState('');
  const [sourceDataFlattened, setSourceDataFlattened] = useState('');
  const [targetDataFlattened, setTargetDataFlattened] = useState('');
  const [generatedTemplate, setGeneratedTemplate] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRedacted, setShowRedacted] = useState(false);
  const [redactionConfig, setRedactionConfig] = useState(() => new RedactionConfig());
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRedactionConfigChange = useCallback((newConfig: RedactionConfig) => {
    setRedactionConfig(newConfig);
  }, []);

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
      let dataForConversion = Array.isArray(parsedSourceData) ? parsedSourceData[0] : 
                             parsedSourceData.rows ? parsedSourceData.rows[0] : 
                             parsedSourceData;

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
        <TemplateMapperHeader />

        <SourceDataSection
          sourceData={sourceData}
          sourceDataFlattened={sourceDataFlattened}
          showRedacted={showRedacted}
          redactionConfig={redactionConfig}
          onSourceDataUpload={handleSourceDataUpload}
          onShowRedactedChange={setShowRedacted}
          onCopyToClipboard={copyToClipboard}
          copied={copied}
        />

        <TargetDataSection
          targetData={targetData}
          targetDataFlattened={targetDataFlattened}
          onTargetDataUpload={handleTargetDataUpload}
          onCopyToClipboard={copyToClipboard}
          copied={copied}
        />

        <TemplateGenerationSection
          sourceData={sourceData}
          generatedTemplate={generatedTemplate}
          isConverting={isConverting}
          onConvertToTemplate={handleConvertToTemplate}
          onTemplateChange={setGeneratedTemplate}
          onCopyToClipboard={copyToClipboard}
          copied={copied}
        />

        {generatedTemplate && (
          <VisualMappingSection
            sourceData={sourceData}
            generatedTemplate={generatedTemplate}
            onCreateVisualMapping={handleCreateVisualMapping}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Redaction Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <RedactionSettings onConfigChange={handleRedactionConfigChange} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}