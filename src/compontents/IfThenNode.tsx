
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch, Edit3 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { useNodeDataSync } from '../hooks/useNodeDataSync';

interface IfThenNodeData {
  label: string;
  operator: string;
  compareValue: string;
  thenValue: string;
  elseValue: string;
}

const IfThenNode: React.FC<{ data: IfThenNodeData; id: string }> = ({ data, id }) => {
  const [operator, setOperator] = useState(data.operator || '=');
  const [compareValue, setCompareValue] = useState(data.compareValue || '');
  const [thenValue, setThenValue] = useState(data.thenValue || '');
  const [elseValue, setElseValue] = useState(data.elseValue || '');

  // Auto-sync state changes with React Flow's central state
  useNodeDataSync(id, { operator, compareValue, thenValue, elseValue }, [operator, compareValue, thenValue, elseValue]);

  const getConditionSummary = () => {
    if (!operator || !compareValue) return 'Configure condition';
    return `IF input ${operator} "${compareValue}"`;
  };

  return (
    <div className="relative border-2 rounded-lg shadow-sm min-w-48 border-purple-300 bg-purple-50">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-400 border-2 border-white hover:bg-gray-600"
        style={{ left: '-6px' }}
      />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-white rounded-md shadow-sm">
            <GitBranch className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 text-sm">{data.label}</div>
            <div className="text-xs text-gray-600">Conditional Logic</div>
          </div>
          
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-1 hover:bg-white/50 rounded">
                <Edit3 className="w-3 h-3 text-gray-600" />
              </button>
            </SheetTrigger>
            <SheetContent className="w-[400px]">
              <SheetHeader>
                <SheetTitle>Configure IF THEN Logic</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Condition:</label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-3 py-2 bg-gray-100 rounded text-sm">Input</span>
                    <select
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      className="border rounded px-3 py-2 text-sm"
                    >
                      <option value="=">=</option>
                      <option value="!=">!=</option>
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                      <option value=">=">&gt;=</option>
                      <option value="<=">&lt;=</option>
                    </select>
                    <input
                      type="text"
                      value={compareValue}
                      onChange={(e) => setCompareValue(e.target.value)}
                      className="flex-1 border rounded px-3 py-2 text-sm"
                      placeholder="Compare value"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">THEN (if true):</label>
                  <input
                    type="text"
                    value={thenValue}
                    onChange={(e) => setThenValue(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Value when condition is true"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">ELSE (if false):</label>
                  <input
                    type="text"
                    value={elseValue}
                    onChange={(e) => setElseValue(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Value when condition is false"
                  />
                </div>
                
                <div className="mt-6 p-3 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Preview:</h4>
                  <div className="text-sm text-gray-600">
                    {getConditionSummary()}
                    <br />
                    THEN: "{thenValue || 'not set'}"
                    <br />
                    ELSE: "{elseValue || 'not set'}"
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
          Conditional Logic
        </div>
        
        <div className="text-xs text-purple-600 mt-1 font-medium">
          {getConditionSummary()}
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

export default IfThenNode;
