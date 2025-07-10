import React, { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Lightbulb, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { SmartMappingAnalyzer, MappingSuggestion } from '../../services/SmartMappingAnalyzer';
import { SchemaField } from './shared/FieldRenderer';

interface SmartMappingSuggestionsProps {
    sourceData: any[];
    targetFields: SchemaField[];
    onApplySuggestion: (suggestion: MappingSuggestion) => void;
    className?: string;
}

export const SmartMappingSuggestions: React.FC<SmartMappingSuggestionsProps> = ({
    sourceData,
    targetFields,
    onApplySuggestion,
    className = ''
}) => {
    const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
    const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (sourceData?.length > 0 && targetFields?.length > 0) {
            analyzeMappings();
        }
    }, [sourceData, targetFields]);

    const analyzeMappings = async () => {
        setIsAnalyzing(true);
        try {
            const newSuggestions = SmartMappingAnalyzer.analyzeMappingSuggestions(
                sourceData,
                targetFields
            );
            setSuggestions(newSuggestions);
        } catch (error) {
            console.error('❌ Smart mapping analysis failed:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleApplySuggestion = (suggestion: MappingSuggestion) => {
        const suggestionKey = `${suggestion.sourceFieldPath}->${suggestion.targetFieldPath}`;
        setAppliedSuggestions(prev => new Set([...prev, suggestionKey]));
        onApplySuggestion(suggestion);
    };

    const handleApplyAllSuggestions = () => {
        suggestions.forEach(suggestion => {
            const suggestionKey = `${suggestion.sourceFieldPath}->${suggestion.targetFieldPath}`;
            if (!appliedSuggestions.has(suggestionKey)) {
                handleApplySuggestion(suggestion);
            }
        });
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'bg-green-100 text-green-800';
        if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
        return 'bg-red-100 text-red-800';
    };

    const getConfidenceLabel = (confidence: number) => {
        if (confidence >= 0.8) return 'High';
        if (confidence >= 0.6) return 'Medium';
        return 'Low';
    };

    if (isAnalyzing) {
        return (
            <div className={`bg-white border rounded-lg p-4 ${className}`}>
                <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-semibold">Smart Mapping Suggestions</h3>
                </div>
                <div className="text-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Analyzing data structure and generating mapping suggestions...</p>
                </div>
            </div>
        );
    }

    if (suggestions.length === 0) {
        return (
            <div className={`bg-white border rounded-lg p-4 ${className}`}>
                <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="w-5 h-5 text-gray-400" />
                    <h3 className="font-semibold text-gray-600">Smart Mapping Suggestions</h3>
                </div>
                <div className="text-center py-8">
                    <p className="text-sm text-gray-500">
                        {sourceData?.length === 0 
                            ? 'Import source data to generate mapping suggestions'
                            : targetFields?.length === 0
                            ? 'Define target schema fields to generate mapping suggestions'
                            : 'No mapping suggestions found. The data structures may be too different.'}
                    </p>
                </div>
            </div>
        );
    }

    const highConfidenceSuggestions = suggestions.filter(s => s.confidence >= 0.7);
    const unappliedSuggestions = suggestions.filter(s => {
        const key = `${s.sourceFieldPath}->${s.targetFieldPath}`;
        return !appliedSuggestions.has(key);
    });

    return (
        <div className={`bg-white border rounded-lg p-4 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-semibold">Smart Mapping Suggestions</h3>
                    <Badge variant="outline" className="text-xs">
                        {suggestions.length} found
                    </Badge>
                </div>
                {unappliedSuggestions.length > 0 && (
                    <Button
                        size="sm"
                        onClick={handleApplyAllSuggestions}
                        className="text-xs"
                    >
                        Apply All ({unappliedSuggestions.length})
                    </Button>
                )}
            </div>

            {highConfidenceSuggestions.length > 0 && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-700 font-medium">
                        🎯 {highConfidenceSuggestions.length} high-confidence mapping{highConfidenceSuggestions.length !== 1 ? 's' : ''} detected!
                    </p>
                </div>
            )}

            <ScrollArea className="h-64">
                <div className="space-y-3">
                    {suggestions.map((suggestion, index) => {
                        const suggestionKey = `${suggestion.sourceFieldPath}->${suggestion.targetFieldPath}`;
                        const isApplied = appliedSuggestions.has(suggestionKey);
                        
                        return (
                            <div
                                key={index}
                                className={`border rounded-lg p-3 ${
                                    isApplied ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge 
                                                variant="outline" 
                                                className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}
                                            >
                                                {getConfidenceLabel(suggestion.confidence)} ({Math.round(suggestion.confidence * 100)}%)
                                            </Badge>
                                            {suggestion.transformRequired && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {suggestion.transformRequired}
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-2 text-sm">
                                            <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono">
                                                {suggestion.sourceFieldPath}
                                            </code>
                                            <ArrowRight className="w-3 h-3 text-gray-400" />
                                            <code className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-mono">
                                                {suggestion.targetFieldPath}
                                            </code>
                                        </div>
                                        
                                        <p className="text-xs text-gray-600 mt-1">
                                            {suggestion.reason}
                                        </p>
                                    </div>
                                    
                                    <div className="flex-shrink-0">
                                        {isApplied ? (
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleApplySuggestion(suggestion)}
                                                className="text-xs px-3"
                                            >
                                                Apply
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
};