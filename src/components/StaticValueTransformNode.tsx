
import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Hash, Edit3 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';

interface StaticValueConfig {
  value?: string | number | Date;
  valueType?: 'string' | 'number' | 'date';
}

interface StaticValueTransformNodeData {
  label: string;
  transformType: string;
  description?: string;
  config?: StaticValueConfig;
}

const StaticValueTransformNode: React.FC<{ data: StaticValueTransformNodeData; id: string }> = ({ data, id }) => {
  const { setNodes } = useReactFlow();
  const [config, setConfig] = useState<StaticValueConfig>(data.config || { value: '', valueType: 'string' });
  const { label, description } = data;
  
  const updateNodeData = useCallback((newConfig: StaticValueConfig) => {
    console.log('Updating static value node config:', newConfig);
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
  
  const updateConfig = (updates: Partial<StaticValueConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    updateNodeData(newConfig);
  };

  const handleValueChange = (value: string) => {
    let parsedValue: string | number | Date = value;
    
    if (config.valueType === 'number') {
      parsedValue = parseFloat(value) || 0;
    } else if (config.valueType === 'date') {
      parsedValue = new Date(value);
    }
    
    updateConfig({ value: parsedValue });
  };
  
  return (
    <div className="relative border-2 rounded-lg shadow-sm min-w-48 border-indigo-300 bg-indigo-50">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-white rounded-md shadow-sm">
            <Hash className="w-4 h-4" />
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
                <SheetTitle>Configure Static Value</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Value Type:</label>
                  <select
                    value={config.valueType || 'string'}
                    onChange={(e) => updateConfig({ valueType: e.target.value as 'string' | 'number' | 'date' })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Value:</label>
                  {config.valueType === 'date' ? (
                    <input
                      type="date"
                      value={config.value ? new Date(config.value).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleValueChange(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  ) : (
                    <input
                      type={config.valueType === 'number' ? 'number' : 'text'}
                      value={config.value?.toString() || ''}
                      onChange={(e) => handleValueChange(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      placeholder={`Enter ${config.valueType} value`}
                    />
                  )}
                </div>
                
                <div className="mt-6 p-3 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Preview:</h4>
                  <div className="text-sm text-gray-600">
                    Type: {config.valueType}<br/>
                    Value: {String(config.value || 'Not set')}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
          Static Value
        </div>
        
        <div className="text-xs text-indigo-600 mt-1 font-medium">
          {config.valueType}: {String(config.value || 'Not set')}
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

export default StaticValueTransformNode;
