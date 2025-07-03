import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle2, HelpCircle, ArrowRight } from 'lucide-react';
import { AIMappingService, FieldMatch } from '../services/AIMappingService';

interface SmartConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceField: string;
  targetSchema: any[];
  onConfirmConnection: (sourceField: string, targetFieldId: string) => void;
}

export const SmartConnectionDialog: React.FC<SmartConnectionDialogProps> = ({
  isOpen,
  onClose,
  sourceField,
  targetSchema,
  onConfirmConnection
}) => {
  const [suggestion, setSuggestion] = useState<{
    bestMatch?: FieldMatch;
    alternatives: FieldMatch[];
    question?: string;
  } | null>(null);
  const [selectedField, setSelectedField] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const aiService = new AIMappingService();

  useEffect(() => {
    if (isOpen && sourceField && targetSchema.length > 0) {
      analyzeSuggestions();
    }
  }, [isOpen, sourceField, targetSchema]);

  const analyzeSuggestions = async () => {
    setLoading(true);
    try {
      const result = aiService.suggestConnection(sourceField, targetSchema);
      setSuggestion(result);
      
      // Auto-select best match if confidence is high
      if (result.bestMatch && result.bestMatch.confidence >= 85) {
        setSelectedField(result.bestMatch.fieldId);
      }
    } catch (error) {
      console.error('Error analyzing field suggestions:', error);
    }
    setLoading(false);
  };

  const handleConfirm = () => {
    if (selectedField) {
      onConfirmConnection(sourceField, selectedField);
      onClose();
      setSelectedField('');
      setSuggestion(null);
    }
  };

  const handleCancel = () => {
    onClose();
    setSelectedField('');
    setSuggestion(null);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'bg-green-100 text-green-800';
    if (confidence >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 85) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    return <HelpCircle className="w-4 h-4 text-yellow-600" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-blue-600" />
            Smart Field Connection for "{sourceField}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Analyzing field matches...</span>
            </div>
          ) : suggestion ? (
            <>
              {/* Question from AI */}
              {suggestion.question && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">AI Analysis</h4>
                      <p className="text-blue-800">{suggestion.question}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Best Match */}
              {suggestion.bestMatch && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Recommended Match</h4>
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedField === suggestion.bestMatch.fieldId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedField(suggestion.bestMatch!.fieldId)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getConfidenceIcon(suggestion.bestMatch.confidence)}
                        <span className="font-medium">{suggestion.bestMatch.fieldName}</span>
                        {suggestion.bestMatch.isNested && (
                          <Badge variant="outline" className="text-xs">
                            Level {suggestion.bestMatch.level}
                          </Badge>
                        )}
                      </div>
                      <Badge className={getConfidenceColor(suggestion.bestMatch.confidence)}>
                        {Math.round(suggestion.bestMatch.confidence)}% match
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Path: <span className="font-mono bg-gray-100 px-1 rounded">{suggestion.bestMatch.fieldPath}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {suggestion.bestMatch.reasoning}
                    </div>
                  </div>
                </div>
              )}

              {/* Alternative Matches */}
              {suggestion.alternatives.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Other Options</h4>
                  <div className="space-y-2">
                    {suggestion.alternatives.map((alt) => (
                      <div
                        key={alt.fieldId}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedField === alt.fieldId
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedField(alt.fieldId)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{alt.fieldName}</span>
                            {alt.isNested && (
                              <Badge variant="outline" className="text-xs">
                                Level {alt.level}
                              </Badge>
                            )}
                          </div>
                          <Badge className={getConfidenceColor(alt.confidence)}>
                            {Math.round(alt.confidence)}% match
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          Path: <span className="font-mono bg-gray-100 px-1 rounded text-xs">{alt.fieldPath}</span>
                        </div>
                        <div className="text-xs text-gray-500">{alt.reasoning}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual Selection Note */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> Select the field that best represents where "{sourceField}" should be mapped.
                  The AI analyzes field names, types, and nesting levels to suggest the most appropriate connections.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirm}
                  disabled={!selectedField}
                  className="min-w-24"
                >
                  Connect
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No suggestions available for this field.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmartConnectionDialog;