
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitMerge, Plus, Trash2, Edit3 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { ScrollArea } from '../components/ui/scroll-area';
import { useNodeDataSync } from '../hooks/useNodeDataSync';

interface CoalesceRule {
  id: string;
  priority: number;
  label: string;
}

interface CoalesceTransformData {
  label: string;
  rules: CoalesceRule[];
  defaultValue: string;
}

const CoalesceTransformNode: React.FC<{ data: CoalesceTransformData; id: string }> = ({ data, id }) => {
  const [rules, setRules] = useState<CoalesceRule[]>(data.rules || []);
  const [defaultValue, setDefaultValue] = useState(data.defaultValue || '');

  // Sync local state changes back to React Flow
  useNodeDataSync(id, { rules, defaultValue }, [rules, defaultValue]);

  const addRule = () => {
    const newRule: CoalesceRule = {
      id: `rule-${Date.now()}`,
      priority: rules.length + 1,
      label: `Rule ${rules.length + 1}`
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (ruleId: string, updates: Partial<CoalesceRule>) => {
    const updatedRules = rules.map(rule => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    );
    setRules(updatedRules);
  };

  const deleteRule = (ruleId: string) => {
    const updatedRules = rules.filter(rule => rule.id !== ruleId)
      .map((rule, index) => ({ ...rule, priority: index + 1 }));
    setRules(updatedRules);
  };

  const moveRule = (ruleId: string, direction: 'up' | 'down') => {
    const ruleIndex = rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return;

    const newRules = [...rules];
    const targetIndex = direction === 'up' ? ruleIndex - 1 : ruleIndex + 1;

    if (targetIndex >= 0 && targetIndex < newRules.length) {
      [newRules[ruleIndex], newRules[targetIndex]] = [newRules[targetIndex], newRules[ruleIndex]];
      
      // Update priorities
      newRules.forEach((rule, index) => {
        rule.priority = index + 1;
      });
      
      setRules(newRules);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-64 max-w-none w-auto relative">
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
          <SheetContent className="w-[600px] sm:w-[600px] flex flex-col">
            <SheetHeader>
              <SheetTitle>Configure Coalesce Transform</SheetTitle>
            </SheetHeader>

            <div className="flex-1 flex flex-col gap-4">
              {/* Default Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Value (if no inputs have values):
                </label>
                <input
                  type="text"
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter default value..."
                />
              </div>

              {/* Rules Configuration */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Fallback Rules (in priority order):
                  </label>
                  <button
                    onClick={addRule}
                    className="flex items-center gap-1 px-2 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
                  >
                    <Plus className="w-3 h-3" />
                    Add Rule
                  </button>
                </div>

                <div className="flex-1 border rounded min-h-0">
                  <ScrollArea className="h-full max-h-96">
                    <div className="space-y-2 p-3">
                      {rules.map((rule, index) => (
                        <div key={rule.id} className="border rounded p-3 space-y-2 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600 w-8">
                              #{rule.priority}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => moveRule(rule.id, 'up')}
                                disabled={index === 0}
                                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => moveRule(rule.id, 'down')}
                                disabled={index === rules.length - 1}
                                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                              >
                                ↓
                              </button>
                            </div>
                            <button
                              onClick={() => deleteRule(rule.id)}
                              className="p-1 text-red-500 hover:text-red-700 ml-auto"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Rule Label:
                            </label>
                            <input
                              type="text"
                              value={rule.label}
                              onChange={(e) => updateRule(rule.id, { label: e.target.value })}
                              className="w-full border rounded px-2 py-1 text-sm"
                              placeholder="e.g., ATA, ETA, PTA"
                            />
                          </div>
                        </div>
                      ))}

                      {rules.length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No rules configured. Add a rule to get started.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="p-1">
        <div className="space-y-1">
          {rules.length > 0 ? (
            <div className="space-y-1">
              {rules.map((rule) => (
                <div key={rule.id} className="relative">
                  <div className="flex items-center gap-2 py-1 px-2 pl-8 hover:bg-gray-50 rounded text-sm group">
                    <span className="font-medium text-gray-900 flex-1 min-w-0 truncate">
                      #{rule.priority}: {rule.label || 'Unnamed rule'}
                    </span>
                    
                    <Handle
                      type="target"
                      position={Position.Left}
                      id={rule.id}
                      className="w-3 h-3 bg-orange-500 border-2 border-white group-hover:bg-orange-600 !absolute !left-1"
                      style={{
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic">No rules configured</div>
          )}
          
          {defaultValue && (
            <div className="text-xs text-gray-600 mt-2">
              Default: "{defaultValue}"
            </div>
          )}
        </div>
      </div>

      {/* Single Output Handle */}
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
