
import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Scissors, Edit3 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';

interface SplitterConfig {
  delimiter?: string;
  index?: number;
  maxSplit?: number;
}

interface SplitterTransformNodeData {
  label: string;
  transformType: string;
  description?: string;
  config?: SplitterConfig;
}

const SplitterTransformNode: React.FC<{ data: SplitterTransformNodeData; id: string }> = ({ data, id }) => {
  const { setNodes } = useReactFlow();
  const [config, setConfig] = useState<SplitterConfig>(data.config || { delimiter: ',', index: 0 });
  const { label, description } = data;
  
  const updateNodeData = useCallback((newConfig: SplitterConfig) => {
    console.log('Updating splitter node config:', newConfig);
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                config: newConfig,
              },
            }
          : node
      )
    );
  }, [id, setNodes]);
  
  const updateConfig = (updates: Partial<SplitterConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    updateNodeData(newConfig);
  };
  
  return (
    <div className="relative border-2 rounded-lg shadow-sm min-w-48 border-teal-300 bg-teal-50">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-400 border-2 border-white hover:bg-gray-600"
        style={{ left: '-6px' }}
      />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-white rounded-md shadow-sm">
            <Scissors className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 text-sm">{label}</div>
            {description && (
              <div className="text-xs text-gray-600">{description}</div>
            )}
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-1 hover:bg-white/50 rounded">
                <Edit3 className="w-3 h-3 text-gray-600" />
              </button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Configure Text Splitter</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Delimiter:</label>
                  <input
                    type="text"
                    value={config.delimiter || ','}
                    onChange={(e) => updateConfig({ delimiter: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Delimiter (e.g., comma, space, etc.)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Index (which part to return):</label>
                  <input
                    type="number"
                    value={config.index || 0}
                    onChange={(e) => updateConfig({ index: parseInt(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Max Splits (optional):</label>
                  <input
                    type="number"
                    value={config.maxSplit || ''}
                    onChange={(e) => updateConfig({ maxSplit: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full border rounded px-3 py-2"
                    min="1"
                    placeholder="Leave empty for no limit"
                  />
                </div>
                
                <div className="mt-6 p-3 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Preview:</h4>
                  <div className="text-sm text-gray-600">
                    Split by "{config.delimiter}" and return part {config.index}
                    {config.maxSplit && ` (max ${config.maxSplit} splits)`}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
          Text Splitter
        </div>
        
        <div className="text-xs text-teal-600 mt-1 font-medium">
          Split by "{config.delimiter}" → [{config.index}]
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-2 border-white hover:bg-blue-600"
        style={{ right: '-6px' }}
      />
    </div>
  );
};

export default SplitterTransformNode;
