import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitMerge, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '../components/ui/scroll-area';
import NodeEditSheet from './NodeEditSheet';
import { useNodeDataSync } from '../hooks/useNodeDataSync';

interface CoalesceRule {
  id: string;
  priority: number;
  outputValue: string;
}

interface CoalesceTransformData {
  label: string;
  transformType: string;
  config: {
    rules: CoalesceRule[];
    defaultValue: string;
  };
  inputValues?: Record<string, any>;
}

const CoalesceTransformNode: React.FC<{ data: CoalesceTransformData; id: string }> = ({ data, id }) => {
  const [rules, setRules] = useState<CoalesceRule[]>(() => {
    // Initialize rules from config.rules
    const initialRules = data.config?.rules || [];
    console.log('=== COALESCE NODE INITIALIZATION ===');
    console.log('Node ID:', id);
    console.log('Initial rules from data:', initialRules);
    return initialRules;
  });
  
  const [defaultValue, setDefaultValue] = useState(() => {
    const initial = data.config?.defaultValue || '';
    console.log('Initial default value:', initial);
    return initial;
  });
  
  const inputValues = data.inputValues || {};

  console.log('=== COALESCE NODE RENDER ===');
  console.log('Node ID:', id);
  console.log('Current rules:', rules);
  console.log('Current default value:', defaultValue);
  console.log('Input values:', inputValues);

  // Sync changes back to React Flow - update both config and direct properties
  useNodeDataSync(id, { 
    config: {
      rules, 
      defaultValue
    },
    rules, // Also set direct rules property for backward compatibility
    defaultValue, // Also set direct defaultValue property
    transformType: 'coalesce',
    label: data.label
  }, [rules, defaultValue]);

  const addRule = () => {
    const newRule: CoalesceRule = {
      id: `rule-${Date.now()}`,
      priority: rules.length + 1,
      outputValue: `Value ${rules.length + 1}`
    };
    console.log('Adding new rule:', newRule);
    const updatedRules = [...rules, newRule];
    setRules(updatedRules);
  };

  const updateRule = (ruleId: string, updates: Partial<CoalesceRule>) => {
    const updatedRules = rules.map(rule => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    );
    console.log('Updating rule:', ruleId, updates);
    setRules(updatedRules);
  };

  const deleteRule = (ruleId: string) => {
    const updatedRules = rules.filter(rule => rule.id !== ruleId)
      .map((rule, index) => ({ ...rule, priority: index + 1 }));
    console.log('Deleting rule:', ruleId);
    setRules(updatedRules);
  };

  const moveRule = (ruleId: string, direction: 'up' | 'down') => {
    const ruleIndex = rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return;

    const newRules = [...rules];
    const targetIndex = direction === 'up' ? ruleIndex - 1 : ruleIndex + 1;

    if (targetIndex >= 0 && targetIndex < newRules.length) {
      [newRules[ruleIndex], newRules[targetIndex]] = [newRules[targetIndex], newRules[ruleIndex]];
      
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

        <NodeEditSheet title="Configure Coalesce Transform">
          <div className="flex-1 flex flex-col gap-4">
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
                            Output Value (returned if this input has data):
                          </label>
                          <input
                            type="text"
                            value={rule.outputValue}
                            onChange={(e) => updateRule(rule.id, { outputValue: e.target.value })}
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
        </NodeEditSheet>
      </div>

      <div className="p-1">
        <div className="space-y-1">
          {rules.length > 0 ? (
            <div className="space-y-1">
              {rules.map((rule) => {
                const inputValue = inputValues[rule.id];
                const hasValue = inputValue !== undefined && inputValue !== null && inputValue !== '';
                
                return (
                  <div key={rule.id} className="relative">
                    <div className="flex items-center gap-2 py-1 px-2 pl-8 hover:bg-gray-50 rounded text-sm group">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          #{rule.priority}: {rule.outputValue || 'No output value'}
                        </div>
                        <div className={`text-xs truncate ${hasValue ? 'text-green-600' : 'text-gray-400'}`}>
                          {hasValue ? `Input: ${inputValue}` : 'No input data'}
                        </div>
                      </div>
                      
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
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic px-2 py-2">No rules configured</div>
          )}
          
          {defaultValue && (
            <div className="text-xs text-gray-600 mt-2 px-2">
              Default: "{defaultValue}"
            </div>
          )}
        </div>
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
