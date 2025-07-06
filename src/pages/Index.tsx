
import React, { useState, useCallback, useEffect } from 'react';
import Canvas from '../Canvas/Canvas';
import DataSidebar from '../components/nodes/DataSidebar';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Wand2, X } from 'lucide-react';
import { TemplateToNodesConverter } from '../services/TemplateToNodesConverter';

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

    try {
      // Dispatch event to Canvas to load the converted nodes and edges
      const event = new CustomEvent('loadTemplateConversion', {
        detail: {
          nodes: templateConversion.nodes,
          edges: templateConversion.edges,
          sourceData: templateConversion.sourceData
        }
      });
      window.dispatchEvent(event);
      
      // Clear the notification and storage
      setTemplateConversion(null);
      TemplateToNodesConverter.clearConversionData();
      
      console.log('Template converted to nodes successfully:', templateConversion);
    } catch (error) {
      console.error('Error applying template conversion:', error);
    }
  }, [templateConversion]);

  const handleDismissConversion = useCallback(() => {
    setTemplateConversion(null);
    localStorage.removeItem('template-conversion');
  }, []);

  const handleSidebarDataChange = useCallback((data: any[]) => {
    setSidebarData(data);
  }, []);

  return (
    <div className="h-screen relative overflow-hidden">
      {/* Template Conversion Notification */}
      {templateConversion && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-96">
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
