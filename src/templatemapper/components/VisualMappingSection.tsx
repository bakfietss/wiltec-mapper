import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';
import { TemplateToNodesConverter } from '../../services/TemplateToNodesConverter';

interface VisualMappingSectionProps {
  sourceData: string;
  generatedTemplate: string;
}

export const VisualMappingSection: React.FC<VisualMappingSectionProps> = ({
  sourceData,
  generatedTemplate
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreateVisualMapping = () => {
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
  };

  return (
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
  );
};