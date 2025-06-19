
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitMerge, Plus, Trash2, Edit3 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { ScrollArea } from '../components/ui/scroll-area';
import { useNodeDataSync } from '../hooks/useNodeDataSync';

interface CoalesceRule {
  id: string;
  priority: number;
  fieldPath: string;
  outputLabel: string;
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
      fieldPath: '',
      outputLabel: ''
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
    const updatedRules = rules.filter(rule => rule.id !== ruleId);
    // Update priorities after deletion
    const reorderedRules = updatedRules.map((rule, index) => ({
      ...rule,
      priority: index + 1
    }));
    setRules(reorderedRules);
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
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-64 max-w-none w-auto">
      {/* Dynamic Input Handles for Rules */}
      {rules.map((rule, index) => (
        <Handle
          key={rule.id}
          type="target"
          position={Position.Left}
          id={`rule-${rule.id}`}
          className="w-3 h-3 bg-orange-500 border-2 border-white"
          style={{ 
            top: `${20 + (index * 25)}%`,
            opacity: rule.fieldPath ? 1 : 0.3
          }}
        />
      ))}

      {/* Default Value Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="default"
        className="w-3 h-3 bg-gray-400 border-2 border-white"
        style={{ 
          top: `${20 + (rules.length * 25)}%`,
          opacity: defaultValue ? 1 : 0.3
        }}
      />

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
                  Default Value (if no rules match):
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

                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                Field Path:
                              </label>
                              <input
                                type="text"
                                value={rule.fieldPath}
                                onChange={(e) => updateRule(rule.id, { fieldPath: e.target.value })}
                                className="w-full border rounded px-2 py-1 text-sm"
                                placeholder="e.g., user.profile.name"
                              />
                            </div>

                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                Output Label:
                              </label>
                              <input
                                type="text"
                                value={rule.outputLabel}
                                onChange={(e) => updateRule(rule.id, { outputLabel: e.target.value })}
                                className="w-full border rounded px-2 py-1 text-sm"
                                placeholder="e.g., Primary, Secondary, Fallback"
                              />
                            </div>
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

      <div className="p-3">
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-600">Rules:</div>
          {rules.length > 0 ? (
            <div className="space-y-1">
              {rules.map((rule) => (
                <div key={rule.id} className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded">
                  #{rule.priority}: {rule.fieldPath || 'No path'} → "{rule.outputLabel || 'No label'}"
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic">No rules configured</div>
          )}
          
          {defaultValue && (
            <div className="text-xs text-gray-600">
              Default: "{defaultValue}"
            </div>
          )}
        </div>

        {/* Connection dots labels on the left */}
        <div className="absolute left-4 text-xs text-gray-600">
          {rules.map((rule, index) => (
            <div 
              key={rule.id} 
              style={{ top: `${20 + (index * 25)}%` }} 
              className="absolute transform -translate-y-1/2"
            >
              #{rule.priority}
            </div>
          ))}
          <div 
            style={{ top: `${20 + (rules.length * 25)}%` }} 
            className="absolute transform -translate-y-1/2 text-gray-500"
          >
            def
          </div>
        </div>
      </div>

      {/* Two Fixed Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="value"
        className="w-3 h-3 bg-orange-500 border-2 border-white"
        style={{ top: '40%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="label"
        className="w-3 h-3 bg-orange-500 border-2 border-white"
        style={{ top: '60%' }}
      />
      
      {/* Output labels on the right */}
      <div className="absolute right-4 text-xs text-gray-600">
        <div style={{ top: '35%' }} className="absolute">value</div>
        <div style={{ top: '55%' }} className="absolute">label</div>
      </div>
    </div>
  );
};

export default CoalesceTransformNode;
