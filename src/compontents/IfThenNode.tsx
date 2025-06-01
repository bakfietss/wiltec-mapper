
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch, Edit3 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
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

  const handleSave = () => {
    // State is already synced via useNodeDataSync, just close the sheet
    console.log('IF THEN node saved:', { operator, compareValue, thenValue, elseValue });
  };

  return (
    <div className="relative border-2 border-purple-300 bg-purple-50 rounded-lg shadow-sm min-w-48">
      {/* Input Handle */}
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
                <SheetTitle>Configure IF THEN Node</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Operator:</label>
                  <Select value={operator} onValueChange={setOperator}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select operator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="=">=</SelectItem>
                      <SelectItem value="!=">!=</SelectItem>
                      <SelectItem value=">">&gt;</SelectItem>
                      <SelectItem value="<">&lt;</SelectItem>
                      <SelectItem value=">=">&gt;=</SelectItem>
                      <SelectItem value="<=">&lt;=</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Compare Value:</label>
                  <input
                    type="text"
                    value={compareValue}
                    onChange={(e) => setCompareValue(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Value to compare against input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Input value will be compared with this value using the operator above
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Then Value:</label>
                  <input
                    type="text"
                    value={thenValue}
                    onChange={(e) => setThenValue(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Value if condition is true"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Else Value:</label>
                  <input
                    type="text"
                    value={elseValue}
                    onChange={(e) => setElseValue(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="Value if condition is false"
                  />
                </div>
                
                <button
                  onClick={handleSave}
                  className="w-full bg-purple-500 text-white py-2 rounded hover:bg-purple-600"
                >
                  Save Configuration
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
          IF THEN Logic
        </div>
        
        {operator && compareValue && (
          <div className="text-xs text-purple-600 mt-1 font-medium">
            IF input {operator} {compareValue}
          </div>
        )}
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

export default IfThenNode;
