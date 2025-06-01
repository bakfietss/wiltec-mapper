import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Hash, Edit3, Plus, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';

interface StaticValue {
  id: string;
  name: string;
  value: string | number | Date;
  valueType: 'string' | 'number' | 'date';
}

interface StaticValueConfig {
  values: StaticValue[];
}

interface StaticValueTransformNodeData {
  label: string;
  transformType: string;
  description?: string;
  config?: StaticValueConfig;
  data?: any[];
}

const StaticValueTransformNode: React.FC<{ data: StaticValueTransformNodeData; id: string }> = ({ data, id }) => {
  const { setNodes } = useReactFlow();
  const [config, setConfig] = useState<StaticValueConfig>(data.config || { values: [] });
  const { label, description } = data;
  
  const updateNodeData = useCallback((newConfig: StaticValueConfig) => {
    console.log('Updating static value node config:', newConfig);
    
    // Create data object exactly like source nodes do
    const dataObject: Record<string, any> = {};
    (newConfig.values || []).forEach(value => {
      dataObject[value.id] = value.value;
    });
    
    console.log('Static value data object (source-like):', dataObject);
    
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                config: newConfig,
                data: [dataObject], // Match source node data structure exactly
              },
            }
          : node
      )
    );
  }, [id, setNodes]);

  // Update node data whenever config changes
  useEffect(() => {
    updateNodeData(config);
  }, [config, updateNodeData]);
  
  const updateConfig = (updates: Partial<StaticValueConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
  };

  const addValue = () => {
    const currentValues = config.values || [];
    const newValue: StaticValue = {
      id: `value-${Date.now()}`,
      name: `Value ${currentValues.length + 1}`,
      value: '',
      valueType: 'string'
    };
    updateConfig({ values: [...currentValues, newValue] });
  };

  const updateValue = (valueId: string, updates: Partial<StaticValue>) => {
    const currentValues = config.values || [];
    const updatedValues = currentValues.map(value => 
      value.id === valueId ? { ...value, ...updates } : value
    );
    updateConfig({ values: updatedValues });
  };

  const removeValue = (valueId: string) => {
    const currentValues = config.values || [];
    const updatedValues = currentValues.filter(value => value.id !== valueId);
    updateConfig({ values: updatedValues });
  };

  const handleValueChange = (valueId: string, newValue: string) => {
    const currentValues = config.values || [];
    const value = currentValues.find(v => v.id === valueId);
    if (!value) return;

    let parsedValue: string | number | Date = newValue;
    
    if (value.valueType === 'number') {
      parsedValue = parseFloat(newValue) || 0;
    } else if (value.valueType === 'date') {
      parsedValue = new Date(newValue);
    }
    
    updateValue(valueId, { value: parsedValue });
  };

  // Calculate dynamic height based on number of values
  const currentValues = config.values || [];
  const valueHeight = 40; // Increased to accommodate handles
  const headerHeight = 100;
  const padding = 16;
  const dynamicHeight = headerHeight + (currentValues.length * valueHeight) + padding;
  
  return (
    <div 
      className="relative border-2 rounded-lg shadow-sm min-w-48 border-indigo-300 bg-indigo-50"
      style={{ height: currentValues.length > 0 ? `${dynamicHeight}px` : 'auto' }}
    >
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
                <SheetTitle>Configure Static Values</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Static Values</h4>
                  <button
                    onClick={addValue}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                  >
                    <Plus className="w-3 h-3" />
                    Add Value
                  </button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {currentValues.map((value) => (
                    <div key={value.id} className="border rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={value.name}
                          onChange={(e) => updateValue(value.id, { name: e.target.value })}
                          placeholder="Value name"
                          className="text-sm font-medium border rounded px-2 py-1 flex-1"
                        />
                        <button
                          onClick={() => removeValue(value.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded ml-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium mb-1">Type:</label>
                        <select
                          value={value.valueType}
                          onChange={(e) => updateValue(value.id, { valueType: e.target.value as 'string' | 'number' | 'date' })}
                          className="w-full border rounded px-2 py-1 text-xs"
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium mb-1">Value:</label>
                        {value.valueType === 'date' ? (
                          <input
                            type="date"
                            value={value.value ? new Date(value.value).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleValueChange(value.id, e.target.value)}
                            className="w-full border rounded px-2 py-1 text-xs"
                          />
                        ) : (
                          <input
                            type={value.valueType === 'number' ? 'number' : 'text'}
                            value={value.value?.toString() || ''}
                            onChange={(e) => handleValueChange(value.id, e.target.value)}
                            className="w-full border rounded px-2 py-1 text-xs"
                            placeholder={`Enter ${value.valueType} value`}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {currentValues.length === 0 && (
                  <div className="text-center text-gray-500 text-sm py-8">
                    No static values configured. Click "Add Value" to get started.
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border mb-2">
          Static Value
        </div>

        {/* Display configured values with properly positioned source handles */}
        <div className="space-y-2">
          {currentValues.map((value, index) => (
            <div key={value.id} className="relative">
              <div className="flex items-center justify-between py-2 px-3 bg-white/80 rounded text-xs border group hover:bg-white">
                <div className="flex-1 pr-4">
                  <div className="font-medium text-gray-900">{value.name}</div>
                  <div className="text-indigo-600 text-xs">
                    {value.valueType}: {String(value.value || 'Not set')}
                  </div>
                </div>
              </div>
              
              {/* Source handle positioned on the right edge */}
              <Handle
                type="source"
                position={Position.Right}
                id={value.id}
                className="w-3 h-3 bg-blue-500 border-2 border-white hover:bg-blue-600"
                style={{
                  right: '-6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  position: 'absolute'
                }}
                onConnect={(params) => {
                  console.log('Source handle connected:', value.id, params);
                }}
              />
            </div>
          ))}
        </div>

        {currentValues.length === 0 && (
          <div className="text-xs text-gray-500 italic">
            No values configured
          </div>
        )}
      </div>
    </div>
  );
};

export default StaticValueTransformNode;
