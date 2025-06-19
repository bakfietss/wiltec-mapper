import React from 'react';
import { Plus, Database, FileText, Shuffle, GitMerge, ChevronDown, ChevronUp, Layers } from 'lucide-react';

interface MappingToolbarProps {
  onAddTransform: (type: string) => void;
  onAddMappingNode: () => void;
  onAddSchemaNode?: (type: 'source' | 'target') => void;
  isExpanded?: boolean;
  onToggleExpanded?: (expanded: boolean) => void;
}

const MappingToolbar: React.FC<MappingToolbarProps> = ({ 
  onAddTransform, 
  onAddMappingNode,
  onAddSchemaNode,
  isExpanded = false,
  onToggleExpanded
}) => {
  const transformTypes = [
    { type: 'String Transform', label: 'String Transform', icon: GitMerge },
    { type: 'Math Operation', label: 'Math Operation', icon: Plus },
    { type: 'Date Format', label: 'Date Format', icon: Shuffle },
    { type: 'Text Splitter', label: 'Text Splitter', icon: Shuffle },
    { type: 'concat', label: 'Concatenate', icon: GitMerge },
    { type: 'format', label: 'Format', icon: Shuffle },
    { type: 'IF THEN', label: 'IF THEN Logic', icon: GitMerge },
    { type: 'Static Value', label: 'Static Value', icon: Database },
    { type: 'Coalesce', label: 'Coalesce Transform', icon: GitMerge },
  ];

  const handleToggle = () => {
    if (onToggleExpanded) {
      onToggleExpanded(!isExpanded);
    }
  };

  return (
    <div 
      className="absolute top-4 left-4 z-10 bg-white border border-gray-200 rounded-lg shadow-lg"
      data-toolbar="mapping-toolbar"
    >
      {/* Header - Always Visible */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-600" />
            <span className="font-semibold text-gray-900 text-sm">Add Nodes</span>
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
        <div className="p-4 w-80">
          {/* Schema Nodes */}
          {onAddSchemaNode && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Schema Nodes:
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => onAddSchemaNode('source')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200"
                >
                  <Database className="w-4 h-4" />
                  Add Source Node
                </button>
                <button
                  onClick={() => onAddSchemaNode('target')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-green-50 text-green-700 hover:bg-green-100 rounded border border-green-200"
                >
                  <FileText className="w-4 h-4" />
                  Add Target Node
                </button>
              </div>
            </div>
          )}
          
          {/* Transform Nodes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Transform Nodes:
            </label>
            <div className="space-y-2">
              {transformTypes.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => onAddTransform(type)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded border border-gray-200"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Mapping Node */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Mapping Node:
            </label>
            <button
              onClick={onAddMappingNode}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-700 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200"
            >
              <Shuffle className="w-4 h-4" />
              Field Mapping
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MappingToolbar;
