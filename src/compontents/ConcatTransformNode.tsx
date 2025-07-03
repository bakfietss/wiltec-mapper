
import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Link2, Edit3, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { useNodeDataSync } from '../hooks/useNodeDataSync';

interface ConcatRule {
  id: string;
  priority: number;
  sourceField: string;
  sourceHandle: string;
}

interface ConcatTransformNodeData {
  label: string;
  transformType: 'concat';
  rules: ConcatRule[];
  delimiter: string;
  outputType: 'value';
  inputValues: Record<string, any>;
}

const ConcatTransformNode: React.FC<{ data: ConcatTransformNodeData; id: string }> = ({ data, id }) => {
  const [rules, setRules] = useState<ConcatRule[]>(data.rules || []);
  const [delimiter, setDelimiter] = useState(data.delimiter || ',');
  
  // Ensure we always have at least one rule for connection
  useEffect(() => {
    if (rules.length === 0) {
      const defaultRule: ConcatRule = {
        id: `rule-${Date.now()}`,
        priority: 1,
        sourceField: 'Field 1',
        sourceHandle: `rule-${Date.now()}`
      };
      setRules([defaultRule]);
    }
  }, []);
  
  // Sync data changes with centralized system
  useNodeDataSync(id, { 
    rules, 
    delimiter, 
    transformType: 'concat',
    outputType: 'value',
    inputValues: data.inputValues || {}
  }, [rules, delimiter]);

  const addRule = useCallback(() => {
    const newRule: ConcatRule = {
      id: `rule-${Date.now()}`,
      priority: rules.length + 1,
      sourceField: `Field ${rules.length + 1}`,
      sourceHandle: `rule-${Date.now()}`
    };
    setRules(prev => [...prev, newRule]);
  }, [rules.length]);

  const updateRule = useCallback((ruleId: string, updates: Partial<ConcatRule>) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ));
  }, []);

  const removeRule = useCallback((ruleId: string) => {
    if (rules.length <= 1) return;
    
    setRules(prev => {
      const filtered = prev.filter(rule => rule.id !== ruleId);
      return filtered.map((rule, idx) => ({ ...rule, priority: idx + 1 }));
    });
  }, [rules.length]);

  const moveRule = useCallback((ruleId: string, direction: 'up' | 'down') => {
    setRules(prev => {
      const index = prev.findIndex(rule => rule.id === ruleId);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newRules = [...prev];
      [newRules[index], newRules[newIndex]] = [newRules[newIndex], newRules[index]];
      
      return newRules.map((rule, idx) => ({ ...rule, priority: idx + 1 }));
    });
  }, []);

  const getPreviewValue = () => {
    const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);
    const values = sortedRules
      .map(rule => data.inputValues?.[rule.id] || rule.sourceField || 'Field')
      .filter(val => val && val !== '');
    
    return values.length > 0 ? values.join(delimiter) : 'No concatenation';
  };

  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  return (
    <div className="relative border-2 rounded-lg shadow-sm min-w-64 max-w-80 border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-white rounded-lg shadow-sm border border-orange-200">
            <Link2 className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 text-sm">{data.label}</div>
            <div className="text-xs text-gray-600">Join {rules.length} field{rules.length !== 1 ? 's' : ''} with "{delimiter}"</div>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-1.5 hover:bg-white/60 rounded-md transition-colors">
                <Edit3 className="w-4 h-4 text-gray-600" />
              </button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Configure Concat Transform</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Delimiter:</label>
                  <input
                    type="text"
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Enter delimiter (e.g., ,)"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    This will be used to join the fields together
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">Fields to Concatenate:</label>
                    <button
                      onClick={addRule}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                    >
                      <Plus className="w-3 h-3" />
                      Add Field
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {sortedRules.map((rule, index) => (
                      <div key={rule.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded border">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveRule(rule.id, 'up')}
                            disabled={index === 0}
                            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 p-1"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveRule(rule.id, 'down')}
                            disabled={index === sortedRules.length - 1}
                            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 p-1"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                        
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 mb-1">Position {rule.priority}</div>
                          <input
                            type="text"
                            value={rule.sourceField}
                            onChange={(e) => updateRule(rule.id, { sourceField: e.target.value })}
                            className="w-full text-xs border rounded px-2 py-1"
                            placeholder="Field name"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            Value: {data.inputValues?.[rule.id] || 'Not connected'}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => removeRule(rule.id)}
                          disabled={rules.length <= 1}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-6 p-3 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Preview:</h4>
                  <div className="text-sm text-gray-600 font-mono bg-white p-2 rounded border">
                    {getPreviewValue()}
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <h4 className="font-medium mb-2 text-blue-800">How to use:</h4>
                  <ol className="text-xs text-blue-700 space-y-1">
                    <li>1. Connect source fields to the input handles on the left</li>
                    <li>2. Configure the delimiter (comma, space, etc.)</li>
                    <li>3. Arrange field order using the arrows</li>
                    <li>4. Connect the output to your target field</li>
                  </ol>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Show field rules in the node with handles */}
        <div className="space-y-1 mb-3">
          {sortedRules.map((rule, index) => (
            <div key={rule.id} className="relative flex items-center gap-2 text-xs">
              <Handle
                key={rule.id}
                id={rule.id}
                type="target"
                position={Position.Left}
                className="w-3 h-3 bg-orange-500 border-2 border-white hover:bg-orange-600 shadow-sm absolute"
                style={{ 
                  left: '-20px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
              />
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-gray-700 truncate flex-1">
                {index + 1}. {rule.sourceField}
              </span>
              <span className="text-gray-500 text-xs">
                {data.inputValues?.[rule.id] ? '✓' : '○'}
              </span>
            </div>
          ))}
        </div>
        
        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border mb-2">
          Join with: "{delimiter}"
        </div>
        
        <div className="text-xs text-orange-600 font-medium truncate bg-white px-2 py-1 rounded border">
          {getPreviewValue()}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500 border-2 border-white hover:bg-blue-600 shadow-sm"
        style={{ right: '-6px' }}
      />
    </div>
  );
};

export default ConcatTransformNode;
