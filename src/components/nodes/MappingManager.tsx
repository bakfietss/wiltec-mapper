import React, { useState, useEffect } from 'react';
import { Download, Upload, ChevronDown, ChevronUp, Settings, Plus, Save, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TransformType {
  name: string;
  display_name: string;
  description?: string;
  input_format: string;
  output_format: string;
  category: string;
}

interface NewMappingData {
  name: string;
  category: string;
  transformType: string;
}

interface MappingManagerProps {
  onExportMapping?: () => void;
  onImportMapping?: (file: File) => void;
  onNewMapping?: (data: NewMappingData) => void;
  onSaveMapping?: (name: string) => void;
  onExportDocumentation?: () => void;
  currentMappingName?: string;
  currentMappingVersion?: string;
  currentCategory?: string;
  currentTransformType?: string;
  isExpanded?: boolean;
  onToggleExpanded?: (expanded: boolean) => void;
}

const MappingManager: React.FC<MappingManagerProps> = ({ 
  onExportMapping,
  onImportMapping,
  onNewMapping,
  onSaveMapping,
  onExportDocumentation,
  currentMappingName = 'Untitled Mapping',
  currentMappingVersion = '',
  currentCategory = 'General',
  currentTransformType = 'JsonToJson',
  isExpanded = false,
  onToggleExpanded
}) => {
  const [isNewMappingOpen, setIsNewMappingOpen] = useState(false);
  const [newMappingName, setNewMappingName] = useState('');
  const [newMappingCategory, setNewMappingCategory] = useState('General');
  const [newMappingTransformType, setNewMappingTransformType] = useState('JsonToJson');
  const [transformTypes, setTransformTypes] = useState<TransformType[]>([]);
  const [categories, setCategories] = useState<string[]>(['General', 'Integration', 'Data Processing', 'Custom']);

  useEffect(() => {
    fetchTransformTypes();
  }, []);

  const fetchTransformTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('transform_types')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('display_name', { ascending: true });

      if (error) throw error;
      setTransformTypes(data || []);
    } catch (error) {
      console.error('Failed to fetch transform types:', error);
      toast.error('Failed to load transform types');
    }
  };

  const handleToggle = () => {
    if (onToggleExpanded) {
      onToggleExpanded(!isExpanded);
    }
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && onImportMapping) {
        onImportMapping(file);
      }
    };
    input.click();
  };

  const handleNewMapping = () => {
    if (newMappingName.trim() && onNewMapping) {
      const mappingData: NewMappingData = {
        name: newMappingName.trim(),
        category: newMappingCategory,
        transformType: newMappingTransformType
      };
      onNewMapping(mappingData);
      setNewMappingName('');
      setNewMappingCategory('General');
      setNewMappingTransformType('JsonToJson');
      setIsNewMappingOpen(false);
    }
  };

  const handleSaveMapping = () => {
    console.log('🔥 MAPPING MANAGER SAVE CALLED 🔥');
    console.log('onSaveMapping exists:', !!onSaveMapping);
    console.log('currentMappingName:', currentMappingName);
    
    if (onSaveMapping) {
      const nameToSave = currentMappingName || 'Untitled Mapping';
      console.log('Calling onSaveMapping with:', nameToSave);
      onSaveMapping(nameToSave);
    } else {
      console.log('❌ No onSaveMapping function provided');
    }
  };

  return (
    <div 
      className="absolute top-4 right-4 z-10 bg-white border border-gray-200 rounded-lg shadow-lg"
      data-toolbar="mapping-manager"
    >
      {/* Header - Always Visible */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-600" />
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900 text-sm">Mapping Manager</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{currentMappingName}</span>
                {currentMappingVersion && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md font-medium">
                    {currentMappingVersion}
                  </span>
                )}
                {currentTransformType && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-md font-medium">
                    {transformTypes.find(t => t.name === currentTransformType)?.display_name || currentTransformType}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleToggle}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-4 w-64">
          <div className="space-y-3">
            {/* New Mapping */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mapping Actions:
              </label>
              <div className="space-y-2">
                <Dialog open={isNewMappingOpen} onOpenChange={setIsNewMappingOpen}>
                  <DialogTrigger asChild>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-green-50 text-green-700 hover:bg-green-100 rounded border border-green-200">
                      <Plus className="w-4 h-4" />
                      New Mapping
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Mapping</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="mapping-name" className="text-sm font-medium">
                          Mapping Name
                        </Label>
                        <Input
                          id="mapping-name"
                          value={newMappingName}
                          onChange={(e) => setNewMappingName(e.target.value)}
                          placeholder="Enter mapping name..."
                          onKeyDown={(e) => e.key === 'Enter' && handleNewMapping()}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="mapping-category" className="text-sm font-medium">
                          Category
                        </Label>
                        <Select value={newMappingCategory} onValueChange={setNewMappingCategory}>
                          <SelectTrigger id="mapping-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="transform-type" className="text-sm font-medium">
                          Transform Type
                        </Label>
                        <Select value={newMappingTransformType} onValueChange={setNewMappingTransformType}>
                          <SelectTrigger id="transform-type">
                            <SelectValue placeholder="Select transform type" />
                          </SelectTrigger>
                          <SelectContent>
                            {transformTypes.map((type) => (
                              <SelectItem key={type.name} value={type.name}>
                                <div className="flex flex-col">
                                  <span>{type.display_name}</span>
                                  <span className="text-xs text-gray-500">
                                    {type.input_format} → {type.output_format}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsNewMappingOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleNewMapping} disabled={!newMappingName.trim()}>
                          Create
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Save Mapping - Direct Action */}
                <button 
                  onClick={handleSaveMapping}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 rounded border border-purple-200"
                >
                  <Save className="w-4 h-4" />
                  Save Mapping
                </button>
              </div>
            </div>

            {/* Export/Import */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export/Import:
              </label>
              <div className="space-y-2">
                {onExportMapping && (
                  <button
                    onClick={onExportMapping}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200"
                  >
                    <Download className="w-4 h-4" />
                    Export Mapping
                  </button>
                )}
                {onImportMapping && (
                  <button
                    onClick={handleImportClick}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-orange-50 text-orange-700 hover:bg-orange-100 rounded border border-orange-200"
                  >
                    <Upload className="w-4 h-4" />
                    Import Mapping
                  </button>
                )}
              </div>
            </div>

            {/* Documentation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Documentation:
              </label>
              <div className="space-y-2">
                {onExportDocumentation && (
                  <button
                    onClick={onExportDocumentation}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200"
                  >
                    <FileText className="w-4 h-4" />
                    Export Documentation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MappingManager;
