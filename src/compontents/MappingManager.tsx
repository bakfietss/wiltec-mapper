
import React, { useState } from 'react';
import { Download, Upload, ChevronDown, ChevronUp, Settings, Plus, Save, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

interface MappingManagerProps {
  onExportMapping?: () => void;
  onImportMapping?: (file: File) => void;
  onNewMapping?: (name: string) => void;
  onSaveMapping?: (name: string) => void;
  onExportDocumentation?: () => void;
  currentMappingName?: string;
}

const MappingManager: React.FC<MappingManagerProps> = ({ 
  onExportMapping,
  onImportMapping,
  onNewMapping,
  onSaveMapping,
  onExportDocumentation,
  currentMappingName = 'Untitled Mapping'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isNewMappingOpen, setIsNewMappingOpen] = useState(false);
  const [isSaveMappingOpen, setIsSaveMappingOpen] = useState(false);
  const [newMappingName, setNewMappingName] = useState('');
  const [saveMappingName, setSaveMappingName] = useState(currentMappingName);

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
    if (saveMappingName.trim() && onSaveMapping) {
      onSaveMapping(saveMappingName.trim());
      setIsSaveMappingOpen(false);
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
              <span className="text-xs text-gray-500">{currentMappingName}</span>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
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
                <Dialog open={isSaveMappingOpen} onOpenChange={setIsSaveMappingOpen}>
                  <DialogTrigger asChild>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 rounded border border-purple-200">
                      <Save className="w-4 h-4" />
                      Save Mapping
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Mapping</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mapping Name
                        </label>
                        <Input
                          value={saveMappingName}
                          onChange={(e) => setSaveMappingName(e.target.value)}
                          placeholder="Enter mapping name..."
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveMapping()}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsSaveMappingOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveMapping} disabled={!saveMappingName.trim()}>
                          Save
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
