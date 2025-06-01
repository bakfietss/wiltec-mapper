
import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Zap, Edit3 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';

interface TransformConfig {
  operation?: string;
  value?: string;
  regex?: string;
  replacement?: string;
}

interface TransformNodeData {
  label: string;
  transformType: string;
  description?: string;
  config?: TransformConfig;
}

const TransformNode: React.FC<{ data: TransformNodeData; id: string }> = ({ data, id }) => {
  const { setNodes } = useReactFlow();
  const [config, setConfig] = useState<TransformConfig>(data.config || {});
  const { label, transformType, description } = data;
  
  const updateNodeData = useCallback((newConfig: TransformConfig) => {
    console.log('Updating transform node config:', newConfig);
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
  
  const updateConfig = (updates: Partial<TransformConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    updateNodeData(newConfig);
  };
  
  const getConfigSummary = () => {
    if (transformType === 'uppercase') return 'Convert to UPPERCASE';
    if (transformType === 'lowercase') return 'Convert to lowercase';
    if (transformType === 'trim') return 'Remove whitespace';
    if (transformType === 'replace' && config.regex && config.replacement) 
      return `Replace "${config.regex}" → "${config.replacement}"`;
    return transformType;
  };
  
  return (
    <div className="relative border-2 rounded-lg shadow-sm min-w-48 border-yellow-300 bg-yellow-50">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-400 border-2 border-white hover:bg-gray-600"
        style={{ left: '-6px' }}
      />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-white rounded-md shadow-sm">
            <Zap className="w-4 h-4 text-yellow-600" />
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
                <SheetTitle>Configure {transformType} Transform</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                {transformType === 'replace' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Find (regex):</label>
                      <input
                        type="text"
                        value={config.regex || ''}
                        onChange={(e) => updateConfig({ regex: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Enter regex pattern"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Replace with:</label>
                      <input
                        type="text"
                        value={config.replacement || ''}
                        onChange={(e) => updateConfig({ replacement: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Replacement text"
                      />
                    </div>
                  </>
                )}
                
                {transformType === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Custom Operation:</label>
                    <textarea
                      value={config.operation || ''}
                      onChange={(e) => updateConfig({ operation: e.target.value })}
                      className="w-full border rounded px-3 py-2 h-24"
                      placeholder="Enter custom transformation logic"
                    />
                  </div>
                )}
                
                <div className="mt-6 p-3 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Preview:</h4>
                  <div className="text-sm text-gray-600">
                    {getConfigSummary()}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
          Transform
        </div>
        
        <div className="text-xs text-yellow-600 mt-1 font-medium">
          {getConfigSummary()}
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

export default TransformNode;
