
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, Download, Settings, Sparkles, ArrowRight, AlertTriangle, Lightbulb } from 'lucide-react';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
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
  const [step, setStep] = useState<'upload' | 'analyze' | 'configure' | 'results'>('upload');
  const [progress, setProgress] = useState(0);
  const [smartAlerts, setSmartAlerts] = useState<any[]>([]);
  const [templateSuggestions, setTemplateSuggestions] = useState<any[]>([]);

  const handleDataUpload = useCallback((data: any[], type: 'source' | 'target') => {
    if (type === 'source') {
      setSourceData(data);
      // Immediately analyze for smart alerts
      analyzeDataForAlerts(data);
    } else {
      setTargetSchema(data);
    }
  }, []);

  const analyzeDataForAlerts = useCallback((data: any[]) => {
    if (!data.length) return;
    
    const alerts = [];
    const sampleRecord = data[0];
    
    // Check for fields that might need mapping tables
    Object.entries(sampleRecord).forEach(([fieldName, value]) => {
      const uniqueValues = [...new Set(data.map(record => record[fieldName]))];
      
      // Alert for categorical fields with multiple values
      if (uniqueValues.length > 1 && uniqueValues.length < data.length * 0.5) {
        alerts.push({
          type: 'mapping_table',
          field: fieldName,
          message: `Field "${fieldName}" has ${uniqueValues.length} unique values - consider a mapping table`,
          severity: 'warning',
          values: uniqueValues.slice(0, 5)
        });
      }
      
      // Alert for potential ID fields
      if (fieldName.toLowerCase().includes('id') || fieldName.toLowerCase().includes('code')) {
        alerts.push({
          type: 'id_field',
          field: fieldName,
          message: `Field "${fieldName}" appears to be an identifier - might need substring or lookup`,
          severity: 'info'
        });
      }
      
      // Alert for date fields
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        alerts.push({
          type: 'date_field',
          field: fieldName,
          message: `Field "${fieldName}" contains dates - might need formatting`,
          severity: 'info'
        });
      }
    });
    
    setSmartAlerts(alerts);
  }, []);

  const handleGenerateMapping = useCallback(async () => {
    if (!sourceData.length) {
      onMappingError('Please upload source data first');
      return;
    }

    onProcessingChange(true);
    setStep('analyze');
    setProgress(20);

    try {
      // Step 1: Analyze structure
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(40);

      // Step 2: Generate template suggestions
      const templates = await generateTemplateSuggestions(sourceData);
      setTemplateSuggestions(templates);
      setProgress(60);

      // Step 3: Generate base structure
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(80);

      const aiService = new AIMappingService();
      const suggestions = await aiService.generateMappingSuggestions(sourceData, targetSchema);
      
      // Add smart alerts to suggestions
      const enhancedSuggestions = {
        ...suggestions,
        smartAlerts,
        templateSuggestions,
        structureOnly: true // Flag to indicate this is structure-focused
      };
      
      setProgress(100);
      onMappingComplete(enhancedSuggestions);
      setStep('results');
    } catch (error) {
      onMappingError('Failed to generate mapping structure');
    }
  }, [sourceData, targetSchema, onMappingComplete, onMappingError, onProcessingChange, smartAlerts]);

  const generateTemplateSuggestions = useCallback(async (data: any[]) => {
    // Analyze data patterns to suggest templates
    const sampleRecord = data[0];
    const templates = [];
    
    // Employee data template
    if (sampleRecord.Medewerker || sampleRecord.employee_id || sampleRecord.firstname) {
      templates.push({
        name: 'Employee Data Mapping',
        description: 'Common employee/HR data transformation',
        confidence: 85,
        nodes: ['source', 'mapping_table', 'if_then', 'target']
      });
    }
    
    // Shipment data template
    if (sampleRecord.id && sampleRecord.containers) {
      templates.push({
        name: 'Shipment Data Mapping',
        description: 'Logistics/shipping data transformation',
        confidence: 90,
        nodes: ['source', 'array_access', 'coalesce', 'target']
      });
    }
    
    // Simple flat data template  
    if (Object.keys(sampleRecord).length < 10) {
      templates.push({
        name: 'Simple Data Mapping',
        description: 'Direct field-to-field mapping',
        confidence: 70,
        nodes: ['source', 'static_values', 'target']
      });
    }
    
    return templates;
  }, []);

  const handleGenerateVisualMapping = useCallback(async (suggestions: any[]) => {
    try {
      const aiService = new AIMappingService();
      const nodeGeneration = await aiService.generateNodesFromMappings(suggestions);
      
      // Store the generated nodes and edges in localStorage for the manual editor
      localStorage.setItem('ai-generated-mapping', JSON.stringify({
        nodes: nodeGeneration.nodes,
        edges: nodeGeneration.edges,
        mappings: nodeGeneration.mappings,
        sourceData: sourceData,
        smartAlerts: smartAlerts,
        templateSuggestions: templateSuggestions
      }));
      
      console.log('Generated visual mapping with smart alerts:', nodeGeneration);
    } catch (error) {
      console.error('Failed to generate visual mapping:', error);
      onMappingError('Failed to generate visual mapping');
    }
  }, [sourceData, onMappingError, smartAlerts, templateSuggestions]);

  const handleRefineInManualTool = useCallback(() => {
    // Store current state for manual tool
    localStorage.setItem('ai-suggestions', JSON.stringify({
      suggestions: mappingResult,
      sourceData: sourceData,
      targetSchema: targetSchema,
      smartAlerts: smartAlerts,
      templateSuggestions: templateSuggestions
    }));
  }, [mappingResult, sourceData, targetSchema, smartAlerts, templateSuggestions]);

  if (step === 'analyze' && isProcessing) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Analyzing Data Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">Building your mapping structure...</div>
            <Progress value={progress} className="w-full" />
            <div className="text-sm text-gray-500 mt-2">
              {progress < 40 && "Analyzing field types and patterns..."}
              {progress >= 40 && progress < 60 && "Finding template matches..."}
              {progress >= 60 && progress < 80 && "Generating smart alerts..."}
              {progress >= 80 && "Creating base structure..."}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'results' && mappingResult) {
    return (
      <div className="space-y-6">
        {/* Smart Alerts Section */}
        {smartAlerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Smart Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {smartAlerts.map((alert, index) => (
                <Alert key={index} className={alert.severity === 'warning' ? 'border-orange-200' : 'border-blue-200'}>
                  <AlertDescription>
                    <strong>{alert.field}:</strong> {alert.message}
                    {alert.values && (
                      <div className="text-xs text-gray-500 mt-1">
                        Sample values: {alert.values.join(', ')}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Template Suggestions Section */}
        {templateSuggestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-green-500" />
                Template Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {templateSuggestions.map((template, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-gray-600">{template.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Suggested nodes: {template.nodes.join(' → ')}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-green-600">
                      {template.confidence}% match
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-500" />
              Mapping Structure Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h4 className="font-medium text-blue-900">What we've generated:</h4>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>• Basic node structure and connections</li>
                <li>• Field type detection and suggestions</li>
                <li>• Alerts for complex fields needing your input</li>
                <li>• Template recommendations based on your data</li>
              </ul>
            </div>
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
              description="Or we'll create a basic structure"
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

      {/* Smart Alerts Preview */}
      {smartAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Data Analysis Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 mb-3">
              Found {smartAlerts.length} fields that might need special handling:
            </div>
            <div className="space-y-2">
              {smartAlerts.slice(0, 3).map((alert, index) => (
                <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                  <strong>{alert.field}:</strong> {alert.message.split(' - ')[1]}
                </div>
              ))}
              {smartAlerts.length > 3 && (
                <div className="text-sm text-gray-500">
                  +{smartAlerts.length - 3} more alerts...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Button 
          onClick={handleGenerateMapping}
          disabled={!sourceData.length || isProcessing}
          size="lg"
          className="px-8"
        >
          <Sparkles className="h-5 w-5 mr-2" />
          Generate Mapping Structure
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
        <div className="text-sm text-gray-500 mt-2">
          We'll create the structure - you add the business logic
        </div>
      </div>
    </div>
  );
};

export default AiMappingInterface;
