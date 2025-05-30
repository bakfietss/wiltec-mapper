
import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { 
  Calculator, 
  Type, 
  Calendar, 
  Filter, 
  Shuffle, 
  Zap,
  Settings,
  Edit3
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';

interface TransformConfig {
  operation?: string;
  parameters?: Record<string, any>;
  expression?: string;
}

interface EditableTransformNodeData {
  label: string;
  transformType: string;
  description?: string;
  config?: TransformConfig;
}

const getTransformIcon = (type: string) => {
  switch (type) {
    case 'String Transform': return <Type className="w-4 h-4" />;
    case 'Math Operation': return <Calculator className="w-4 h-4" />;
    case 'Date Format': return <Calendar className="w-4 h-4" />;
    case 'Filter': return <Filter className="w-4 h-4" />;
    case 'Sort': return <Shuffle className="w-4 h-4" />;
    case 'Aggregate': return <Zap className="w-4 h-4" />;
    default: return <Settings className="w-4 h-4" />;
  }
};

const getTransformColor = (type: string) => {
  switch (type) {
    case 'String Transform': return 'border-green-300 bg-green-50';
    case 'Math Operation': return 'border-blue-300 bg-blue-50';
    case 'Date Format': return 'border-orange-300 bg-orange-50';
    case 'Filter': return 'border-purple-300 bg-purple-50';
    case 'Sort': return 'border-red-300 bg-red-50';
    case 'Aggregate': return 'border-yellow-300 bg-yellow-50';
    default: return 'border-gray-300 bg-gray-50';
  }
};

const EditableTransformNode: React.FC<{ data: EditableTransformNodeData; id: string }> = ({ data, id }) => {
  const { setNodes } = useReactFlow();
  const [config, setConfig] = useState<TransformConfig>(data.config || {});
  const { label, transformType, description } = data;
  
  const updateNodeData = useCallback((newConfig: TransformConfig) => {
    console.log('Updating transform node config:', newConfig);
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
  
  const updateConfig = (updates: Partial<TransformConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    updateNodeData(newConfig);
  };

  const renderConfigEditor = () => {
    switch (transformType) {
      case 'String Transform':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Operation:</label>
              <select
                value={config.operation || 'uppercase'}
                onChange={(e) => updateConfig({ operation: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="uppercase">Uppercase</option>
                <option value="lowercase">Lowercase</option>
                <option value="trim">Trim</option>
                <option value="substring">Substring</option>
                <option value="replace">Replace</option>
                <option value="concatenate">Concatenate</option>
              </select>
            </div>
            {config.operation === 'substring' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Start:</label>
                  <input
                    type="number"
                    value={config.parameters?.start || 0}
                    onChange={(e) => updateConfig({ 
                      parameters: { ...config.parameters, start: parseInt(e.target.value) }
                    })}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Length:</label>
                  <input
                    type="number"
                    value={config.parameters?.length || 10}
                    onChange={(e) => updateConfig({ 
                      parameters: { ...config.parameters, length: parseInt(e.target.value) }
                    })}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
              </div>
            )}
            {config.operation === 'replace' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Find:</label>
                  <input
                    type="text"
                    value={config.parameters?.find || ''}
                    onChange={(e) => updateConfig({ 
                      parameters: { ...config.parameters, find: e.target.value }
                    })}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Replace:</label>
                  <input
                    type="text"
                    value={config.parameters?.replace || ''}
                    onChange={(e) => updateConfig({ 
                      parameters: { ...config.parameters, replace: e.target.value }
                    })}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
              </div>
            )}
          </div>
        );
      
      case 'Math Operation':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Operation:</label>
              <select
                value={config.operation || 'add'}
                onChange={(e) => updateConfig({ operation: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="add">Add (+)</option>
                <option value="subtract">Subtract (-)</option>
                <option value="multiply">Multiply (*)</option>
                <option value="divide">Divide (/)</option>
                <option value="round">Round</option>
                <option value="abs">Absolute</option>
              </select>
            </div>
            {['add', 'subtract', 'multiply', 'divide'].includes(config.operation || '') && (
              <div>
                <label className="block text-sm font-medium mb-2">Value:</label>
                <input
                  type="number"
                  value={config.parameters?.value || 0}
                  onChange={(e) => updateConfig({ 
                    parameters: { ...config.parameters, value: parseFloat(e.target.value) }
                  })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            )}
          </div>
        );
      
      case 'Date Format':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Input Format:</label>
              <input
                type="text"
                value={config.parameters?.inputFormat || 'YYYY-MM-DD'}
                onChange={(e) => updateConfig({ 
                  parameters: { ...config.parameters, inputFormat: e.target.value }
                })}
                className="w-full border rounded px-3 py-2"
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Output Format:</label>
              <input
                type="text"
                value={config.parameters?.outputFormat || 'DD/MM/YYYY'}
                onChange={(e) => updateConfig({ 
                  parameters: { ...config.parameters, outputFormat: e.target.value }
                })}
                className="w-full border rounded px-3 py-2"
                placeholder="DD/MM/YYYY"
              />
            </div>
          </div>
        );
      
      default:
        return (
          <div>
            <label className="block text-sm font-medium mb-2">Custom Expression:</label>
            <textarea
              value={config.expression || ''}
              onChange={(e) => updateConfig({ expression: e.target.value })}
              className="w-full border rounded px-3 py-2 h-20"
              placeholder="Enter custom transformation logic..."
            />
          </div>
        );
    }
  };
  
  return (
    <div className={`relative border-2 rounded-lg shadow-sm min-w-48 ${getTransformColor(transformType)}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-400 border-2 border-white hover:bg-gray-600"
        style={{ left: '-6px' }}
      />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-white rounded-md shadow-sm">
            {getTransformIcon(transformType)}
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
                <SheetTitle>Configure {transformType}</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6">
                {renderConfigEditor()}
                
                <div className="mt-6 p-3 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Preview:</h4>
                  <div className="text-sm text-gray-600">
                    Configuration: {JSON.stringify(config, null, 2)}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
          {transformType}
        </div>
        
        {config.operation && (
          <div className="text-xs text-blue-600 mt-1 font-medium">
            {config.operation}
          </div>
        )}
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

export default EditableTransformNode;
