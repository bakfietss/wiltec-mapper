
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Hash, Edit3 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { useNodeDataSync } from '../hooks/useNodeDataSync';

interface StaticValueNodeData {
  label: string;
  value: string;
  valueType: 'string' | 'number' | 'boolean';
}

const StaticValueNode: React.FC<{ data: StaticValueNodeData; id: string }> = ({ data, id }) => {
  const [value, setValue] = useState(data.value || '');
  const [valueType, setValueType] = useState(data.valueType || 'string');

  // Auto-sync state changes with React Flow's central state
  useNodeDataSync(id, { value, valueType }, [value, valueType]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'text-green-600 bg-green-50';
      case 'number': return 'text-blue-600 bg-blue-50';
      case 'boolean': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getValueSummary = () => {
    if (!value) return 'No value set';
    return `${valueType}: ${value}`;
  };

  return (
    <div className="relative border-2 rounded-lg shadow-sm min-w-48 border-indigo-300 bg-indigo-50">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-white rounded-md shadow-sm">
            <Hash className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 text-sm">{data.label}</div>
            <div className="text-xs text-gray-600">Static Value</div>
          </div>
          
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-1 hover:bg-white/50 rounded">
                <Edit3 className="w-3 h-3 text-gray-600" />
              </button>
            </SheetTrigger>
            <SheetContent className="w-[400px]">
              <SheetHeader>
                <SheetTitle>Configure Static Value Node</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Value Type:</label>
                  <select
                    value={valueType}
                    onChange={(e) => setValueType(e.target.value as any)}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Value:</label>
                  {valueType === 'boolean' ? (
                    <select
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="">Select...</option>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      type={valueType === 'number' ? 'number' : 'text'}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                      placeholder={`Enter ${valueType} value`}
                    />
                  )}
                </div>
                
                <div className="mt-6 p-3 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Preview:</h4>
                  <div className="text-sm text-gray-600">
                    {getValueSummary()}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
          Static Value
        </div>
        
        {value && (
          <div className="flex items-center gap-2 mt-2">
            <div className="text-xs text-gray-700 bg-white px-2 py-1 rounded border flex-1 truncate">
              {value}
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(valueType)}`}>
              {valueType}
            </span>
          </div>
        )}
        
        <div className="text-xs text-indigo-600 mt-1 font-medium">
          {getValueSummary()}
        </div>
      </div>
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-2 border-white hover:bg-blue-600"
        style={{ right: '-6px' }}
      />
    </div>
  );
};

export default StaticValueNode;
