import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitMerge, Plus, Trash2, Edit3 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { ScrollArea } from '../components/ui/scroll-area';
import { useNodeDataSync } from '../hooks/useNodeDataSync';

interface CoalesceRule {
  id: string;
  priority: number;
  outputValue: string;
}

interface CoalesceTransformData {
  label: string;
  transformType?: string;
  rules: CoalesceRule[];
  defaultValue: string;
  outputType?: string;
  inputValues?: Record<string, any>;
}

const CoalesceTransformNode: React.FC<{ data: CoalesceTransformData; id: string }> = ({ data, id }) => {
  // Debug - should show your saved rules
  console.log('🚨 Coalesce node data on load:', data);

  const [rules, setRules] = useState<CoalesceRule[]>(data.rules || []);
  const [defaultValue, setDefaultValue] = useState(data.defaultValue || '');
  const inputValues = data.inputValues || {};
  const outputType = data.outputType || 'value';

  // Hydrate state if data.rules arrives after initial mount
  useEffect(() => {
    if (data.rules?.length && rules.length === 0) {
      setRules(data.rules);
    }
  }, [data.rules]);

  // Sync back into the node
  useNodeDataSync(id, { rules, defaultValue, outputType, inputValues }, [rules, defaultValue, outputType, inputValues]);

  const addRule = () => {
    const newRule: CoalesceRule = {
      id: `rule-${Date.now()}`,
      priority: rules.length + 1,
      outputValue: `Value ${rules.length + 1}`
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (ruleId: string, updates: Partial<CoalesceRule>) => {
    setRules(rules.map(r => r.id === ruleId ? { ...r, ...updates } : r));
  };

  const deleteRule = (ruleId: string) => {
    const updated = rules.filter(r => r.id !== ruleId).map((r, i) => ({ ...r, priority: i + 1 }));
    setRules(updated);
  };

  const moveRule = (ruleId: string, direction: 'up' | 'down') => {
    const idx = rules.findIndex(r => r.id === ruleId);
    if (idx < 0) return;
    const copy = [...rules];
    const swap = direction === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= copy.length) return;
    [copy[idx], copy[swap]] = [copy[swap], copy[idx]];
    copy.forEach((r, i) => (r.priority = i + 1));
    setRules(copy);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-64 w-auto relative">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 bg-orange-50">
        <GitMerge className="w-4 h-4 text-orange-600" />
        <span className="font-semibold text-gray-900 flex-1">{data.label}</span>
        <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">
          coalesce
        </span>
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-1 hover:bg-gray-200 rounded">
              <Edit3 className="w-3 h-3 text-gray-600" />
            </button>
          </SheetTrigger>
          <SheetContent className="w-[600px] flex flex-col">
            <SheetHeader>
              <SheetTitle>Configure Coalesce Transform</SheetTitle>
            </SheetHeader>
            <div className="flex-1 flex flex-col gap-4">
              {/* Default Value */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Default Value (if no inputs have values):
                </label>
                <input
                  type="text"
                  value={defaultValue}
                  onChange={e => setDefaultValue(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter default value..."
                />
              </div>
              {/* Rules */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Fallback Rules:</label>
                  <button
                    onClick={addRule}
                    className="flex items-center gap-1 px-2 py-1 bg-orange-500 text-white rounded text-sm"
                  >
                    <Plus className="w-3 h-3" /> Add Rule
                  </button>
                </div>
                <ScrollArea className="h-full max-h-96 border rounded p-3">
                  {rules.length ? rules.map((rule, idx) => (
                    <div key={rule.id} className="border rounded p-3 mb-2 bg-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{rule.priority}</span>
                        <div className="flex gap-1 ml-2">
                          <button onClick={() => moveRule(rule.id, 'up')} disabled={idx === 0}>↑</button>
                          <button onClick={() => moveRule(rule.id, 'down')} disabled={idx === rules.length-1}>↓</button>
                        </div>
                        <button onClick={() => deleteRule(rule.id)} className="ml-auto text-red-500">✕</button>
                      </div>
                      <input
                        type="text"
                        value={rule.outputValue}
                        onChange={e => updateRule(rule.id, { outputValue: e.target.value })}
                        className="w-full border rounded px-2 py-1 mt-2"
                        placeholder="Output Value"
                      />
                    </div>
                  )) : (
                    <div className="text-gray-400 italic">No rules configured.</div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="p-2">
        {rules.map(rule => {
          const val = inputValues[rule.id];
          const has = val !== undefined && val !== null && val !== '';
          return (
            <div key={rule.id} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded text-sm relative">
              <div className="flex-1">
                <div className="font-medium truncate">#{rule.priority}: {rule.outputValue}</div>
                <div className={`text-xs truncate ${has ? 'text-green-600' : 'text-gray-400'}`}>
                  {has ? `Input: ${val}` : 'No input'}
                </div>
              </div>
              <Handle
                type="target"
                position={Position.Left}
                id={rule.id}
                className="w-3 h-3 bg-orange-500 border-2 border-white absolute left-[-6px]"
              />
            </div>
          );
        })}
        {defaultValue && <div className="text-xs text-gray-600 mt-2">Default: "{defaultValue}"</div>}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 bg-orange-500 border-2 border-white"
        style={{ top: '50%' }}
      />
    </div>
  );
};

export default CoalesceTransformNode;
