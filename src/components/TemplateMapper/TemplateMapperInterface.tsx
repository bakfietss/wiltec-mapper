

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Zap, Loader2 } from 'lucide-react';
import { TemplateMapperService } from '@/services/TemplateMapper/TemplateMapperService';
import { useToast } from '@/hooks/use-toast';

interface TemplateMapperInterfaceProps {
  onMappingGenerated: (nodes: any[], edges: any[]) => void;
}

export const TemplateMapperInterface: React.FC<TemplateMapperInterfaceProps> = ({
  onMappingGenerated
}) => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = (file: File, type: 'source' | 'target') => {
    if (type === 'source') {
      setSourceFile(file);
    } else {
      setTargetFile(file);
    }
  };

  const generateMapping = async () => {
    if (!sourceFile || !targetFile) {
      toast({
        title: "Missing Files",
        description: "Please upload both source and target files",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await TemplateMapperService.generateMappingFromFiles(
        sourceFile,
        targetFile
      );
      
      onMappingGenerated(result.nodes, result.edges);
      
      toast({
        title: "Template Mapping Generated",
        description: `Successfully generated ${result.nodes.length} nodes and ${result.edges.length} connections`,
      });
    } catch (error) {
      console.error('Template mapping generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate template mapping",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Template Mapper
        </CardTitle>
        <CardDescription>
          Upload source and target data files to automatically generate field mappings using AI template mapping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Source Data File</label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".json,.xml,.csv"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'source')}
                className="hidden"
                id="template-source-file"
              />
              <label
                htmlFor="template-source-file"
                className="flex flex-col items-center justify-center cursor-pointer space-y-2"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-center">
                  {sourceFile ? sourceFile.name : 'Upload source file (.json/.xml/.csv)'}
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Target Data File</label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".json,.xml,.csv"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'target')}
                className="hidden"
                id="template-target-file"
              />
              <label
                htmlFor="template-target-file"
                className="flex flex-col items-center justify-center cursor-pointer space-y-2"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-center">
                  {targetFile ? targetFile.name : 'Upload target file (.json/.xml/.csv)'}
                </span>
              </label>
            </div>
          </div>
        </div>

        <Button
          onClick={generateMapping}
          disabled={!sourceFile || !targetFile || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Template Mapping...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Generate Template Mapping
            </>
          )}
        </Button>

        {sourceFile && targetFile && (
          <div className="text-sm text-muted-foreground text-center">
            Ready to generate template mapping between {sourceFile.name} and {targetFile.name}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

