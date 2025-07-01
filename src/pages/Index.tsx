
import React, { useState, useCallback, useEffect } from 'react';
import Canvas from '../Canvas/Canvas';
import DataSidebar from '../compontents/DataSidebar';
import NavigationBar from '../components/NavigationBar';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Wand2, X } from 'lucide-react';

const Index = () => {
  const [showDataSidebar, setShowDataSidebar] = useState(false);
  const [templateConversion, setTemplateConversion] = useState<any>(null);
  const [sidebarData, setSidebarData] = useState<any[]>([]);

  // Check for template conversion data on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('from') === 'template-conversion') {
      const conversionData = localStorage.getItem('template-conversion');
      if (conversionData) {
        try {
          const parsed = JSON.parse(conversionData);
          setTemplateConversion(parsed);
        } catch (error) {
          console.error('Failed to parse template conversion data:', error);
        }
      }
    }
  }, []);

  const handleConvertTemplate = useCallback(() => {
    if (!templateConversion) return;

    // Here we would implement the template-to-nodes conversion logic
    // For now, just clear the notification
    setTemplateConversion(null);
    localStorage.removeItem('template-conversion');
    
    // TODO: Parse template and create nodes based on the patterns found
    console.log('Converting template to nodes:', templateConversion);
  }, [templateConversion]);

  const handleDismissConversion = useCallback(() => {
    setTemplateConversion(null);
    localStorage.removeItem('template-conversion');
  }, []);

  const handleSidebarDataChange = useCallback((data: any[]) => {
    setSidebarData(data);
  }, []);

  return (
    <div className="h-screen bg-gray-100 relative overflow-hidden">
      <NavigationBar />
      
      {/* Template Conversion Notification */}
      {templateConversion && (
        <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-20 w-96">
          <Alert className="border-blue-200 bg-blue-50">
            <Wand2 className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Template ready for conversion to visual nodes!</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleConvertTemplate}>
                  Convert
                </Button>
                <Button size="sm" variant="outline" onClick={handleDismissConversion}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      <Canvas />
      
      {showDataSidebar && (
        <DataSidebar 
          side="right"
          title="Source Data"
          data={sidebarData}
          onDataChange={handleSidebarDataChange}
        />
      )}
    </div>
  );
};

export default Index;
