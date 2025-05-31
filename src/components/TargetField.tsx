
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TargetFieldProps } from './types/TargetNodeTypes';
import { getTypeColor } from './utils/targetNodeUtils';

const TargetField: React.FC<TargetFieldProps> = ({ 
    field, 
    level, 
    nodeData, 
    expandedStates, 
    onExpandChange 
}) => {
    const isExpanded = expandedStates.get(field.id) !== false;
    const hasChildren = field.children && field.children.length > 0;

    const handleToggle = () => {
        expandedStates.set(field.id, !isExpanded);
        if (onExpandChange) onExpandChange();
    };

    // Get the actual value from node data or fall back to example value
    const currentValue = nodeData.length > 0 && nodeData[0] && nodeData[0][field.id] !== undefined 
        ? nodeData[0][field.id] 
        : field.exampleValue;

    console.log('Target field:', field.name, 'Current value:', currentValue, 'Example value:', field.exampleValue, 'Node data:', nodeData);

    return (
        <div className="relative">
            <div
                className="flex items-center justify-between gap-2 py-1 px-2 hover:bg-gray-50 rounded text-sm group"
                style={{ marginLeft: `${level * 16}px` }}
            >
                {hasChildren ? (
                    <button onClick={handleToggle} className="p-0.5 hover:bg-gray-200 rounded">
                        {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
                    </button>
                ) : (
                    <div className="w-4" />
                )}

                <span className="font-medium text-gray-900 flex-1">{field.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(field.type)}`}>
                    {field.type}
                </span>
                
                {currentValue !== undefined && currentValue !== null && (
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded max-w-20 truncate" title={String(currentValue)}>
                        {String(currentValue)}
                    </span>
                )}

                {!hasChildren && (
                    <Handle
                        type="target"
                        position={Position.Left}
                        id={field.id}
                        className="w-3 h-3 bg-blue-500 border-2 border-white group-hover:bg-blue-600"
                        style={{
                            left: '-6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                        }}
                    />
                )}
            </div>

            {hasChildren && isExpanded && (
                <div>
                    {field.children?.map((child) => (
                        <TargetField 
                            key={child.id} 
                            field={child} 
                            level={level + 1} 
                            nodeData={nodeData}
                            expandedStates={expandedStates}
                            onExpandChange={onExpandChange} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default TargetField;
