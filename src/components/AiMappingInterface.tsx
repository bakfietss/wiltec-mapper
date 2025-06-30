
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, Download, Settings, Sparkles, ArrowRight } from 'lucide-react';
import { Progress } from './ui/progress';
import DataUploadZone from './DataUploadZone';
import MappingSuggestions from './MappingSuggestions';
import { AIMappingService } from '../services/AIMappingService';

interface AiMappingInterfaceProps {
  isProcessing: boolean;
  onMappingComplete: (result: any) => void;
  onMappingError: (error: string) => void;
  onProcessingChange: (processing: boolean) => void;
  mappingResult: any;
}

const AiMappingInterface: React.FC<AiMappingInterfaceProps> = ({
  isProcessing,
  onMappingComplete,
  onMappingError,
  onProcessingChange,
  mappingResult
}) => {
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [targetSchema, setTargetSchema] = useState<any[]>([]);
  const [step, setStep] = useState<'upload' | 'configure' | 'results'>('upload');
  const [progress, setProgress] = useState(0);

  const handleDataUpload = useCallback((data: any[], type: 'source' | 'target') => {
    if (type === 'source') {
      setSourceData(data);
    } else {
      setTargetSchema(data);
    }
  }, []);

  const handleGenerateMapping = useCallback(async () => {
    if (!sourceData.length) {
      onMappingError('Please upload source data first');
      return;
    }

    onProcessingChange(true);
    setStep('configure');
    setProgress(20);

    try {
      // Simulate AI processing with progress updates
      const intervals = [40, 60, 80, 100];
      for (const targetProgress of intervals) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgress(targetProgress);
      }

      const aiService = new AIMappingService();
      const suggestions = await aiService.generateMappingSuggestions(sourceData, targetSchema);
      
      onMappingComplete(suggestions);
      setStep('results');
    } catch (error) {
      onMappingError('Failed to generate mapping suggestions');
    }
  }, [sourceData, targetSchema, onMappingComplete, onMappingError, onProcessingChange]);

  const handleGenerateVisualMapping = useCallback(async (suggestions: any[]) => {
    try {
      const aiService = new AIMappingService();
      const nodeGeneration = await aiService.generateNodesFromMappings(suggestions);
      
      // Store the generated nodes and edges in localStorage for the manual editor
      localStorage.setItem('ai-generated-mapping', JSON.stringify({
        nodes: nodeGeneration.nodes,
        edges: nodeGeneration.edges,
        mappings: nodeGeneration.mappings,
        sourceData: sourceData
      }));
      
      console.log('Generated visual mapping:', nodeGeneration);
    } catch (error) {
      console.error('Failed to generate visual mapping:', error);
      onMappingError('Failed to generate visual mapping');
    }
  }, [sourceData, onMappingError]);

  const handleRefineInManualTool = useCallback(() => {
    // Store current state for manual tool
    localStorage.setItem('ai-suggestions', JSON.stringify({
      suggestions: mappingResult,
      sourceData: sourceData,
      targetSchema: targetSchema
    }));
  }, [mappingResult, sourceData, targetSchema]);

  if (step === 'configure' && isProcessing) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Generating AI Mapping Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">Analyzing your data...</div>
            <Progress value={progress} className="w-full" />
            <div className="text-sm text-gray-500 mt-2">
              {progress < 40 && "Reading source data structure..."}
              {progress >= 40 && progress < 60 && "Identifying field patterns..."}
              {progress >= 60 && progress < 80 && "Generating smart suggestions..."}
              {progress >= 80 && "Finalizing recommendations..."}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'results' && mappingResult) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-500" />
              AI Mapping Suggestions Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MappingSuggestions 
              suggestions={mappingResult}
              onExport={() => {}}
              onRefineManually={handleRefineInManualTool}
              onGenerateVisualMapping={handleGenerateVisualMapping}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Source Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataUploadZone
              onDataUpload={(data) => handleDataUpload(data, 'source')}
              acceptedTypes={['.json', '.csv', '.xlsx']}
              title="Upload your source data"
              description="JSON, CSV, or Excel files"
            />
            {sourceData.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-800">
                  ✓ {sourceData.length} records loaded
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Target Schema (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataUploadZone
              onDataUpload={(data) => handleDataUpload(data, 'target')}
              acceptedTypes={['.json', '.csv']}
              title="Upload target schema"
              description="Or we'll infer from source data"
              optional
            />
            {targetSchema.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800">
                  ✓ Target schema defined
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Button 
          onClick={handleGenerateMapping}
          disabled={!sourceData.length || isProcessing}
          size="lg"
          className="px-8"
        >
          <Sparkles className="h-5 w-5 mr-2" />
          Generate AI Mapping
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default AiMappingInterface;
