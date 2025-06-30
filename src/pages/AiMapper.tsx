
import React, { useState, useCallback } from 'react';
import { ThemeProvider } from '../Theme/ThemeContext';
import UserHeader from '../components/UserHeader';
import AiMappingInterface from '../components/AiMappingInterface';
import { toast } from 'sonner';

const AiMapper = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [mappingResult, setMappingResult] = useState<any>(null);

  const handleMappingComplete = useCallback((result: any) => {
    setMappingResult(result);
    setIsProcessing(false);
    toast.success('Mapping generated successfully!');
  }, []);

  const handleMappingError = useCallback((error: string) => {
    setIsProcessing(false);
    toast.error(error);
  }, []);

  return (
    <ThemeProvider>
      <div className="w-full h-screen relative bg-gradient-to-br from-blue-50 to-indigo-100">
        <UserHeader />
        <div className="container mx-auto px-4 py-8 h-full">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                AI-Powered Data Mapping
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Upload your data, let AI suggest mappings, export or refine with our visual editor
              </p>
            </div>
            
            <AiMappingInterface
              isProcessing={isProcessing}
              onMappingComplete={handleMappingComplete}
              onMappingError={handleMappingError}
              onProcessingChange={setIsProcessing}
              mappingResult={mappingResult}
            />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default AiMapper;
