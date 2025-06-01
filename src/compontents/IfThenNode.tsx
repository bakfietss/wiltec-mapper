
import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { GitBranch, Edit3 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';

interface IfThenNodeData {
  label: string;
  condition: string;
  thenValue: string;
  elseValue: string;
}

const IfThenNode: React.FC<{ data: IfThenNodeData; id: string }> = ({ data, id }) => {
  const [condition, setCondition] = useState(data.condition || '');
  const [thenValue, setThenValue] = useState(data.thenValue || '');
  const [elseValue, setElseValue] = useState(data.elseValue || '');
  const { setNodes } = useReactFlow();

  const updateNodeData = (updates: Partial<IfThenNodeData>) => {
    setNodes(nodes => 
      nodes.map(node => 
        node.id === id 
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
  };

  const handleSave = () => {
    updateNodeData({ condition, thenValue, elseValue });
  };

  return (
    <div className="bg-white border-2 border-purple-300 rounded-lg shadow-sm min-w-48 bg-purple-50">
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
              <button className="p-1 hover:bg-gray-200 rounded">
                <Edit3 className="w-3 h-3 text-gray-600" />
              </button>
            </SheetTrigger>
            <SheetContent className="w-[400px]">
              <SheetHeader>
                <SheetTitle>Configure IF THEN Node</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Condition:</label>
                  <input
                    type="text"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    placeholder="e.g., value > 100"
                  />
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
          {condition ? `IF: ${condition}` : 'Configure condition'}
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

export default IfThenNode;
