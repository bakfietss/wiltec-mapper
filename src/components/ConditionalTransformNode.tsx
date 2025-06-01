
import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { GitBranch, Edit3 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';

interface ConditionalConfig {
  condition?: string; // e.g., "input.value < 100"
  thenValue?: string | number;
  elseValue?: string | number;
  operator?: '<' | '>' | '==' | '!=' | '<=' | '>=';
  compareValue?: string | number;
}

interface ConditionalTransformNodeData {
  label: string;
  transformType: string;
  description?: string;
  config?: ConditionalConfig;
}

const ConditionalTransformNode: React.FC<{ data: ConditionalTransformNodeData; id: string }> = ({ data, id }) => {
  const { setNodes } = useReactFlow();
  const [config, setConfig] = useState<ConditionalConfig>(data.config || { 
    operator: '<', 
    compareValue: 100, 
    thenValue: 'True', 
    elseValue: 'False' 
  });
  const { label, description } = data;
  
  const updateNodeData = useCallback((newConfig: ConditionalConfig) => {
    console.log('Updating conditional node config:', newConfig);
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
  
  const updateConfig = (updates: Partial<ConditionalConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    updateNodeData(newConfig);
  };
  
  return (
    <div className="relative border-2 rounded-lg shadow-sm min-w-48 border-pink-300 bg-pink-50">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-400 border-2 border-white hover:bg-gray-600"
        style={{ left: '-6px' }}
      />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-white rounded-md shadow-sm">
            <GitBranch className="w-4 h-4" />
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
                <SheetTitle>Configure IF-THEN Logic</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Condition:</label>
                  <div className="flex gap-2">
                    <span className="flex items-center text-sm">input.value</span>
                    <select
                      value={config.operator || '<'}
                      onChange={(e) => updateConfig({ operator: e.target.value as any })}
                      className="border rounded px-2 py-1"
                    >
                      <option value="<">{'<'}</option>
                      <option value=">">{'>'}</option>
                      <option value="==">==</option>
                      <option value="!=">!=</option>
                      <option value="<=">{'<='}</option>
                      <option value=">=">{'>='}</option>
                    </select>
                    <input
                      type="text"
                      value={config.compareValue?.toString() || ''}
                      onChange={(e) => updateConfig({ compareValue: isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value) })}
                      className="flex-1 border rounded px-2 py-1"
                      placeholder="Compare value"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">THEN (if true):</label>
                  <input
                    type="text"
                    value={config.thenValue?.toString() || ''}
                    onChange={(e) => updateConfig({ thenValue: isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Value when condition is true"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">ELSE (if false):</label>
                  <input
                    type="text"
                    value={config.elseValue?.toString() || ''}
                    onChange={(e) => updateConfig({ elseValue: isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Value when condition is false"
                  />
                </div>
                
                <div className="mt-6 p-3 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Preview:</h4>
                  <div className="text-sm text-gray-600">
                    IF input.value {config.operator} {config.compareValue}<br/>
                    THEN: {config.thenValue}<br/>
                    ELSE: {config.elseValue}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
          IF-THEN
        </div>
        
        <div className="text-xs text-pink-600 mt-1 font-medium">
          IF input {config.operator} {config.compareValue}
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

export default ConditionalTransformNode;
