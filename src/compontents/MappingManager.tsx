
import React, { useState } from 'react';
import { Download, Upload, ChevronDown, ChevronUp, Settings } from 'lucide-react';

interface MappingManagerProps {
  onExportMapping?: () => void;
  onImportMapping?: (file: File) => void;
}

const MappingManager: React.FC<MappingManagerProps> = ({ 
  onExportMapping,
  onImportMapping
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

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
            <span className="font-semibold text-gray-900 text-sm">Mapping Manager</span>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export/Import Mapping:
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
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-green-50 text-green-700 hover:bg-green-100 rounded border border-green-200"
                  >
                    <Upload className="w-4 h-4" />
                    Import Mapping
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
