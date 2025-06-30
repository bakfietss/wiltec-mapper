
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowRight, Download, Settings, CheckCircle, AlertTriangle, HelpCircle, Workflow } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MappingSuggestion {
  sourceField: string;
  targetField: string;
  confidence: number;
  reasoning: string;
  transformSuggestion?: string;
  nodeType?: 'direct' | 'transform' | 'group' | 'computed';
  groupBy?: string;
  computeLogic?: string;
}

interface MappingSuggestionsProps {
  suggestions: MappingSuggestion[];
  onExport: () => void;
  onRefineManually: () => void;
  onGenerateVisualMapping?: (suggestions: MappingSuggestion[]) => void;
}

const MappingSuggestions: React.FC<MappingSuggestionsProps> = ({
  suggestions,
  onExport,
  onRefineManually,
  onGenerateVisualMapping
}) => {
  const navigate = useNavigate();

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 80) return <CheckCircle className="h-4 w-4" />;
    if (confidence >= 60) return <AlertTriangle className="h-4 w-4" />;
    return <HelpCircle className="h-4 w-4" />;
  };

  const handleGenerateVisualMapping = () => {
    if (onGenerateVisualMapping) {
      onGenerateVisualMapping(suggestions);
    }
    // Navigate to manual editor with the generated mapping
    navigate('/manual?from=ai-generated');
  };

  const handleRefineManually = () => {
    // Navigate to manual editor
    navigate('/manual?from=ai-suggestions');
  };

  const highConfidence = suggestions.filter(s => s.confidence >= 80);
  const mediumConfidence = suggestions.filter(s => s.confidence >= 60 && s.confidence < 80);
  const lowConfidence = suggestions.filter(s => s.confidence < 60);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Mapping Suggestions</h3>
          <p className="text-sm text-gray-600">
            {highConfidence.length} high confidence • {mediumConfidence.length} medium • {lowConfidence.length} low
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateVisualMapping}>
            <Workflow className="h-4 w-4 mr-2" />
            Generate Visual Mapping
          </Button>
          <Button variant="outline" onClick={handleRefineManually}>
            <Settings className="h-4 w-4 mr-2" />
            Refine Manually
          </Button>
          <Button onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Mapping
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {suggestions.map((suggestion, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {suggestion.sourceField}
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="text-sm font-medium text-gray-900">
                  {suggestion.targetField}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {suggestion.transformSuggestion && (
                  <Badge variant="outline" className="text-xs">
                    {suggestion.transformSuggestion}
                  </Badge>
                )}
                {suggestion.nodeType && suggestion.nodeType !== 'direct' && (
                  <Badge variant="outline" className="text-xs">
                    {suggestion.nodeType}
                  </Badge>
                )}
                <Badge className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}>
                  {getConfidenceIcon(suggestion.confidence)}
                  <span className="ml-1">{suggestion.confidence}%</span>
                </Badge>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 mt-2">
              {suggestion.reasoning}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MappingSuggestions;
