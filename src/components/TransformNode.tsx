
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Calculator, 
  Type, 
  Calendar, 
  Filter, 
  Shuffle, 
  Zap,
  Settings
} from 'lucide-react';

interface TransformNodeData {
  label: string;
  transformType: string;
  description?: string;
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

const TransformNode: React.FC<{ data: TransformNodeData }> = ({ data }) => {
  const { label, transformType, description } = data;
  
  return (
    <div className={`relative border-2 rounded-lg shadow-sm min-w-48 ${getTransformColor(transformType)}`}>
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
            {getTransformIcon(transformType)}
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">{label}</div>
            {description && (
              <div className="text-xs text-gray-600">{description}</div>
            )}
          </div>
        </div>
        
        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
          {transformType}
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

export default TransformNode;
