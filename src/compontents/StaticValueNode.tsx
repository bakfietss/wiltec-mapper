
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Hash, Edit3, Plus, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { ScrollArea } from '../components/ui/scroll-area';
import { useNodeDataSync } from '../hooks/useNodeDataSync';

interface StaticValue {
  id: string;
  name: string;
  value: string;
  valueType: 'string' | 'number' | 'boolean';
}

interface StaticValueNodeData {
  label: string;
  values: StaticValue[];
}

const StaticValueNode: React.FC<{ data: StaticValueNodeData; id: string }> = ({ data, id }) => {
  const [values, setValues] = useState<StaticValue[]>(data.values || []);

  // Auto-sync state changes with React Flow's central state
  useNodeDataSync(id, { values }, [values]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'text-green-600 bg-green-50';
      case 'number': return 'text-blue-600 bg-blue-50';
      case 'boolean': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const addValue = () => {
    const newValue: StaticValue = {
      id: `value-${Date.now()}`,
      name: 'New Value',
      value: '',
      valueType: 'string'
    };
    setValues([...values, newValue]);
  };

  const updateValue = (valueId: string, updates: Partial<StaticValue>) => {
    setValues(values.map(val => 
      val.id === valueId ? { ...val, ...updates } : val
    ));
  };

  const deleteValue = (valueId: string) => {
    setValues(values.filter(val => val.id !== valueId));
  };

  const MAX_VISIBLE_VALUES = 6;
  const [showAllValues, setShowAllValues] = useState(false);
  const visibleValues = showAllValues ? values : values.slice(0, MAX_VISIBLE_VALUES);
  const hasMoreValues = values.length > MAX_VISIBLE_VALUES;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-64 max-w-80">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 bg-indigo-50">
        <div className="p-1.5 bg-white rounded-md shadow-sm">
          <Hash className="w-4 h-4 text-indigo-600" />
        </div>
        <span className="font-semibold text-gray-900 flex-1">{data.label}</span>
        <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
          static values
        </span>
        
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-1 hover:bg-gray-200 rounded">
              <Edit3 className="w-3 h-3 text-gray-600" />
            </button>
          </SheetTrigger>
          <SheetContent className="w-[500px] sm:w-[500px] flex flex-col">
            <SheetHeader>
              <SheetTitle>Edit Static Values - {data.label}</SheetTitle>
            </SheetHeader>
            
            <div className="flex-1 flex flex-col space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Static Values:</h4>
                <button
                  onClick={addValue}
                  className="flex items-center gap-1 px-2 py-1 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600"
                >
                  <Plus className="w-3 h-3" />
                  Add Value
                </button>
              </div>
              
              <div className="flex-1 border rounded min-h-0">
                <ScrollArea className="h-full max-h-96">
                  <div className="space-y-4 p-4">
                    {values.map((value) => (
                      <div key={value.id} className="border rounded p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={value.name}
                            onChange={(e) => updateValue(value.id, { name: e.target.value })}
                            className="flex-1 border rounded px-2 py-1 text-sm"
                            placeholder="Value name"
                          />
                          <select
                            value={value.valueType}
                            onChange={(e) => updateValue(value.id, { valueType: e.target.value as any })}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                          </select>
                          <button
                            onClick={() => deleteValue(value.id)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium mb-1">Value:</label>
                          {value.valueType === 'boolean' ? (
                            <select
                              value={value.value}
                              onChange={(e) => updateValue(value.id, { value: e.target.value })}
                              className="w-full border rounded px-2 py-1 text-sm"
                            >
                              <option value="">Select...</option>
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </select>
                          ) : (
                            <input
                              type={value.valueType === 'number' ? 'number' : 'text'}
                              value={value.value}
                              onChange={(e) => updateValue(value.id, { value: e.target.value })}
                              className="w-full border rounded px-2 py-1 text-sm"
                              placeholder={`Enter ${value.valueType} value`}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {values.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No static values yet. Add some values to get started.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="p-2 max-h-96">
        <ScrollArea className="h-full">
          {visibleValues.map((value, index) => (
            <div
              key={value.id}
              className="relative flex items-center justify-between gap-2 py-2 px-2 hover:bg-gray-50 rounded text-sm group"
            >
              <span className="font-medium text-gray-900 flex-1 truncate">{value.name}</span>
              
              <div className="flex items-center gap-2">
                <div className="text-xs min-w-[80px] text-right">
                  {value.value ? (
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded font-medium truncate">
                      {value.value}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">no value</span>
                  )}
                </div>
                
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(value.valueType)}`}>
                  {value.valueType}
                </span>
              </div>

              {/* Individual handle for each value */}
              <Handle
                type="source"
                position={Position.Right}
                id={value.id}
                className="w-3 h-3 bg-indigo-500 border-2 border-white group-hover:bg-indigo-600"
                style={{
                  right: '-6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
            </div>
          ))}
          
          {hasMoreValues && (
            <button
              onClick={() => setShowAllValues(!showAllValues)}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mt-2 px-2 py-1 rounded hover:bg-indigo-50 w-full justify-center"
            >
              {showAllValues ? (
                <>Show Less ({values.length - MAX_VISIBLE_VALUES} hidden)</>
              ) : (
                <>Show More ({values.length - MAX_VISIBLE_VALUES} more values)</>
              )}
            </button>
          )}
          
          {values.length === 0 && (
            <div className="text-center py-4 text-gray-500 text-sm">
              No static values defined. Click edit to add values.
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default StaticValueNode;
