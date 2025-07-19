import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Play, Copy, Check } from 'lucide-react';
import { createTemplateFromObject } from '../input-processor/template-generator';
import { copyToClipboard } from '../../utils/clipboard';
import { useToast } from '../../hooks/use-toast';

interface TemplateGenerationSectionProps {
  sourceData: string;
  generatedTemplate: string;
  onTemplateGenerated: (template: string) => void;
}

export const TemplateGenerationSection: React.FC<TemplateGenerationSectionProps> = ({
  sourceData,
  generatedTemplate,
  onTemplateGenerated
}) => {
  const [isConverting, setIsConverting] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleConvertToTemplate = async () => {
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
      const parsedData = JSON.parse(sourceData);
      let template;
      
      if (Array.isArray(parsedData)) {
        template = createTemplateFromObject(parsedData[0] || {});
      } else if (parsedData.rows && Array.isArray(parsedData.rows)) {
        template = createTemplateFromObject(parsedData.rows[0] || {});
      } else {
        template = createTemplateFromObject(parsedData);
      }
      
      onTemplateGenerated(JSON.stringify(template, null, 2));
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
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(generatedTemplate);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
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
                onClick={handleCopy}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Textarea
              value={generatedTemplate}
              onChange={(e) => onTemplateGenerated(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="Generated template will appear here..."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};