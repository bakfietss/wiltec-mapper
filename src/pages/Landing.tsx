
import React from 'react';
import { ThemeProvider } from '../Theme/ThemeContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Brain, Settings, ArrowRight, Zap, Eye, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserHeader from '../components/UserHeader';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <ThemeProvider>
      <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <UserHeader />
        
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Smart Data Mapping Platform
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Transform your data with AI-powered suggestions or precise manual control. 
              Choose the approach that fits your workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* AI Mapper Card */}
            <Card className="relative overflow-hidden border-2 hover:border-blue-300 transition-all duration-300 hover:shadow-lg">
              <div className="absolute top-4 right-4">
                <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Fast
                </div>
              </div>
              
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Brain className="h-6 w-6 text-blue-600" />
                  AI-Powered Mapper
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Upload your data and get instant intelligent mapping suggestions. 
                  Perfect for quick transformations and standard data formats.
                </p>
                
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3" />
                    Smart field detection
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3" />
                    Confidence scoring
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3" />
                    One-click export
                  </li>
                </ul>
                
                <Button 
                  className="w-full mt-6" 
                  onClick={() => navigate('/ai-mapper')}
                >
                  Start with AI
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Template Mapper Card */}
            <Card className="relative overflow-hidden border-2 hover:border-purple-300 transition-all duration-300 hover:shadow-lg">
              <div className="absolute top-4 right-4">
                <div className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                  <Wand2 className="h-3 w-3" />
                  Template
                </div>
              </div>
              
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Wand2 className="h-6 w-6 text-purple-600" />
                  Template Mapper
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Start with pre-built templates and examples to accelerate your mapping process. 
                  Perfect for common data transformation patterns.
                </p>
                
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3" />
                    Pre-built templates
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3" />
                    Example patterns
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3" />
                    Quick customization
                  </li>
                </ul>
                
                <Button 
                  variant="outline" 
                  className="w-full mt-6 border-purple-200 hover:bg-purple-50" 
                  onClick={() => navigate('/template-mapper')}
                >
                  Start with Template
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Manual Mapper Card */}
            <Card className="relative overflow-hidden border-2 hover:border-indigo-300 transition-all duration-300 hover:shadow-lg">
              <div className="absolute top-4 right-4">
                <div className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Precise
                </div>
              </div>
              
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Settings className="h-6 w-6 text-indigo-600" />
                  Visual Manual Mapper
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Build complex mappings with our visual drag-and-drop interface. 
                  Full control over transformations and data flow.
                </p>
                
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3" />
                    Visual node editor
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3" />
                    Complex transformations
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3" />
                    Advanced logic
                  </li>
                </ul>
                
                <Button 
                  variant="outline" 
                  className="w-full mt-6 border-indigo-200 hover:bg-indigo-50" 
                  onClick={() => navigate('/manual')}
                >
                  Start Manual Mapping
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <p className="text-sm text-gray-500">
              Not sure which to choose? Start with AI for quick results, then refine manually if needed.
            </p>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Landing;
