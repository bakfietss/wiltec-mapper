import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AlertTriangle } from 'lucide-react';
import NavigationBar from '../../components/NavigationBar';
import { Alert, AlertDescription } from '../../components/ui/alert';
import AiMappingInterface from '../../components/temp-ai-components/AiMappingInterface';

const AiMapper = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [mappingResult, setMappingResult] = useState(null);
  const [mappingError, setMappingError] = useState('');

  const handleMappingComplete = useCallback((result: any) => {
    setMappingResult(result);
    setIsProcessing(false);
  }, []);

  const handleMappingError = useCallback((error: string) => {
    setMappingError(error);
    setIsProcessing(false);
  }, []);

  const handleProcessingChange = useCallback((processing: boolean) => {
    setIsProcessing(processing);
    setMappingError('');
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <NavigationBar />

      <div className="container mx-auto px-4 py-8 mt-20">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              AI-Powered Mapping Tool
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mappingError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{mappingError}</AlertDescription>
              </Alert>
            )}

            <AiMappingInterface
              isProcessing={isProcessing}
              onMappingComplete={handleMappingComplete}
              onMappingError={handleMappingError}
              onProcessingChange={handleProcessingChange}
              mappingResult={mappingResult}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AiMapper;
