import React, { useState } from 'react';
import { Download, Upload, ChevronDown, ChevronUp, Settings, Plus, Save, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface MappingManagerProps {
  onExportMapping?: () => void;
  onImportMapping?: (file: File) => void;
  onNewMapping?: (name: string) => void;
  onSaveMapping?: (name: string) => void;
  onExportDocumentation?: () => void;
  currentMappingName?: string;
  currentMappingVersion?: string;
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
  isExpanded = false,
  onToggleExpanded
}) => {
  const [isNewMappingOpen, setIsNewMappingOpen] = useState(false);
  const [isSaveMappingOpen, setIsSaveMappingOpen] = useState(false);
  const [newMappingName, setNewMappingName] = useState('');

  // Debug logging
  console.log('=== MappingManager Render ===');
  console.log('isSaveMappingOpen:', isSaveMappingOpen);
  console.log('isExpanded:', isExpanded);

  const handleToggle = () => {
    console.log('=== TOGGLE CLICKED ===');
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
      onNewMapping(newMappingName.trim());
      setNewMappingName('');
      setIsNewMappingOpen(false);
    }
  };

  const handleSaveMapping = () => {
    console.log('=== SAVE BUTTON CLICKED IN UI ===');
    console.log('Save mapping name:', currentMappingName);
    console.log('onSaveMapping function exists:', !!onSaveMapping);
    
    if (currentMappingName.trim() && onSaveMapping) {
      console.log('Calling onSaveMapping with name:', currentMappingName.trim());
      onSaveMapping(currentMappingName.trim());
      setIsSaveMappingOpen(false);
    } else {
      console.log('Save blocked - name empty or no callback');
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mapping Name
                        </label>
                        <Input
                          value={newMappingName}
                          onChange={(e) => setNewMappingName(e.target.value)}
                          placeholder="Enter mapping name..."
                          onKeyDown={(e) => e.key === 'Enter' && handleNewMapping()}
                        />
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

                {/* Save Mapping */}
                <button 
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 rounded border border-purple-200"
                  onClick={(e) => {
                    console.log('=== SAVE BUTTON CLICKED ===');
                    e.stopPropagation();
                    handleSaveMapping();
                  }}
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
