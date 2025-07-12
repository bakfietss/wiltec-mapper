
import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Zap, Edit3 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import CoalesceTransformNode from './CoalesceTransformNode';
import { useNodeDataSync } from '../../hooks/useNodeDataSync';

interface TransformConfig {
  operation?: string;
  value?: string;
  regex?: string;
  replacement?: string;
  stringOperation?: string;
  prefix?: string;
  suffix?: string;
  splitDelimiter?: string;
  joinDelimiter?: string;
  substringStart?: number;
  substringEnd?: number;
  dateFormat?: string;
  rules?: Array<{
    id: string;
    priority: number;
    outputValue: string;
  }>;
  defaultValue?: string;
}

interface TransformNodeData {
  label: string;
  transformType: string;
  description?: string;
  config?: TransformConfig;
  outputType?: string;
  inputValues?: Record<string, any>;
}

const TransformNode: React.FC<{ data: TransformNodeData; id: string }> = ({ data, id }) => {
  const [config, setConfig] = useState<TransformConfig>(data.config || {});
  const { label, transformType, description } = data;
  
  // If this is a coalesce transform, render the specialized component
  if (transformType === 'coalesce') {
    const coalesceData = {
      label: data.label,
      transformType: 'coalesce',
      config: {
        rules: data.config?.rules || [],
        defaultValue: data.config?.defaultValue || ''
      },
      inputValues: data.inputValues || {}
    };
    return <CoalesceTransformNode data={coalesceData} id={id} />;
  }
  
  // Sync config changes with centralized system
  useNodeDataSync(id, { config, transformType, label }, [config]);
  
  const updateConfig = (updates: Partial<TransformConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
  };
  
  const getConfigSummary = () => {
    if (transformType === 'String Transform') {
      const op = config.stringOperation;
      if (op === 'uppercase') return 'Convert to UPPERCASE';
      if (op === 'lowercase') return 'Convert to lowercase';
      if (op === 'trim') return 'Remove whitespace';
      if (op === 'prefix' && config.prefix) return `Add prefix: "${config.prefix}"`;
      if (op === 'suffix' && config.suffix) return `Add suffix: "${config.suffix}"`;
      if (op === 'substring' && config.substringStart !== undefined) 
        return `Substring from ${config.substringStart}${config.substringEnd !== undefined ? ` to ${config.substringEnd}` : ''}`;
      if (op === 'replace' && config.regex && config.replacement) 
        return `Replace "${config.regex}" → "${config.replacement}"`;
      if (op === 'dateFormat' && config.dateFormat) return `Format date as: ${config.dateFormat}`;
      return op || 'String Transform';
    }
    if (transformType === 'Date Format') {
      return config.dateFormat ? `Format date as: ${config.dateFormat}` : 'Date Format';
    }
    if (transformType === 'uppercase') return 'Convert to UPPERCASE';
    if (transformType === 'lowercase') return 'Convert to lowercase';
    if (transformType === 'trim') return 'Remove whitespace';
    if (transformType === 'replace' && config.regex && config.replacement) 
      return `Replace "${config.regex}" → "${config.replacement}"`;
    return transformType;
  };
  
  return (
    <div className="relative border-2 rounded-lg shadow-sm min-w-48 border-yellow-300 bg-yellow-50">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-400 border-2 border-white hover:bg-gray-600"
        style={{ left: '-6px' }}
      />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-white rounded-md shadow-sm">
            <Zap className="w-4 h-4 text-yellow-600" />
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
                <SheetTitle>Configure {transformType} Transform</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                {transformType === 'String Transform' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">String Operation:</label>
                      <select
                        value={config.stringOperation || ''}
                        onChange={(e) => updateConfig({ stringOperation: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Select operation</option>
                        <option value="uppercase">Convert to UPPERCASE</option>
                        <option value="lowercase">Convert to lowercase</option>
                        <option value="trim">Trim whitespace</option>
                        <option value="prefix">Add prefix</option>
                        <option value="suffix">Add suffix</option>
                        <option value="substring">Extract substring</option>
                        <option value="replace">Find and replace</option>
                        <option value="dateFormat">Format date</option>
                      </select>
                    </div>

                    {config.stringOperation === 'prefix' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Prefix text:</label>
                        <input
                          type="text"
                          value={config.prefix || ''}
                          onChange={(e) => updateConfig({ prefix: e.target.value })}
                          className="w-full border rounded px-3 py-2"
                          placeholder="Text to add at the beginning"
                        />
                      </div>
                    )}

                    {config.stringOperation === 'suffix' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Suffix text:</label>
                        <input
                          type="text"
                          value={config.suffix || ''}
                          onChange={(e) => updateConfig({ suffix: e.target.value })}
                          className="w-full border rounded px-3 py-2"
                          placeholder="Text to add at the end"
                        />
                      </div>
                    )}

                    {config.stringOperation === 'substring' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-2">Start position:</label>
                          <input
                            type="number"
                            value={config.substringStart || ''}
                            onChange={(e) => updateConfig({ substringStart: parseInt(e.target.value) })}
                            className="w-full border rounded px-3 py-2"
                            placeholder="Starting character position (0-based)"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">End position (optional):</label>
                          <input
                            type="number"
                            value={config.substringEnd || ''}
                            onChange={(e) => updateConfig({ substringEnd: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="w-full border rounded px-3 py-2"
                            placeholder="Ending character position (leave empty for end of string)"
                            min="0"
                          />
                        </div>
                      </>
                    )}

                    {config.stringOperation === 'replace' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-2">Find (regex):</label>
                          <input
                            type="text"
                            value={config.regex || ''}
                            onChange={(e) => updateConfig({ regex: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            placeholder="Enter regex pattern or text to find"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2">Replace with:</label>
                          <input
                            type="text"
                            value={config.replacement || ''}
                            onChange={(e) => updateConfig({ replacement: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            placeholder="Replacement text"
                          />
                        </div>
                      </>
                    )}

                    {config.stringOperation === 'dateFormat' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Date format:</label>
                        <select
                          value={config.dateFormat || ''}
                          onChange={(e) => updateConfig({ dateFormat: e.target.value })}
                          className="w-full border rounded px-3 py-2"
                        >
                          <option value="">Select format</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD (2024-01-01)</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY (01/01/2024)</option>
                          <option value="MM/DD/YYYY">MM/DD/YYYY (01/01/2024)</option>
                          <option value="DD-MM-YYYY">DD-MM-YYYY (01-01-2024)</option>
                          <option value="YYYY/MM/DD">YYYY/MM/DD (2024/01/01)</option>
                          <option value="ISO">ISO Format (2024-01-01T00:00:00.000Z)</option>
                        </select>
                      </div>
                    )}
                  </>
                )}

                {transformType === 'Date Format' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Date format:</label>
                    <select
                      value={config.dateFormat || ''}
                      onChange={(e) => updateConfig({ dateFormat: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select format</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2024-01-01)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (01/01/2024)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (01/01/2024)</option>
                      <option value="DD-MM-YYYY">DD-MM-YYYY (01-01-2024)</option>
                      <option value="YYYY/MM/DD">YYYY/MM/DD (2024/01/01)</option>
                      <option value="ISO">ISO Format (2024-01-01T00:00:00.000Z)</option>
                    </select>
                  </div>
                )}
                
                {transformType === 'replace' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Find (regex):</label>
                      <input
                        type="text"
                        value={config.regex || ''}
                        onChange={(e) => updateConfig({ regex: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Enter regex pattern"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Replace with:</label>
                      <input
                        type="text"
                        value={config.replacement || ''}
                        onChange={(e) => updateConfig({ replacement: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Replacement text"
                      />
                    </div>
                  </>
                )}
                
                {transformType === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Custom Operation:</label>
                    <textarea
                      value={config.operation || ''}
                      onChange={(e) => updateConfig({ operation: e.target.value })}
                      className="w-full border rounded px-3 py-2 h-24"
                      placeholder="Enter custom transformation logic"
                    />
                  </div>
                )}
                
                <div className="mt-6 p-3 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Preview:</h4>
                  <div className="text-sm text-gray-600">
                    {getConfigSummary()}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
          Transform
        </div>
        
        <div className="text-xs text-yellow-600 mt-1 font-medium">
          {getConfigSummary()}
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

export default TransformNode;
