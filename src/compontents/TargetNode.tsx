
import React from 'react';
import { FileText } from 'lucide-react';
import { TargetNodeData } from './types/TargetNodeTypes';
import { countVisibleFields } from './utils/targetNodeUtils';
import { useTargetNode } from './hooks/useTargetNode';
import TargetField from './TargetField';

const TargetNode: React.FC<{ data: TargetNodeData; id?: string }> = ({ data, id }) => {
    const { expandedStates, handleExpandChange, nodeData } = useTargetNode(data, id);

    const visibleFieldCount = countVisibleFields(data.fields, expandedStates);
    const fieldHeight = 32;
    const headerHeight = 60;
    const padding = 8;
    const dynamicHeight = headerHeight + (visibleFieldCount * fieldHeight) + padding;

    return (
        <div 
            className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-64 max-w-80"
            style={{ height: `${dynamicHeight}px` }}
        >
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 bg-green-50">
                <FileText className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-gray-900">{data.label}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                    target
                </span>
            </div>

            <div className="p-2" style={{ height: `${dynamicHeight - headerHeight}px` }}>
                {data.fields.map((field) => (
                    <TargetField
                        key={field.id}
                        field={field}
                        level={0}
                        nodeData={nodeData}
                        expandedStates={expandedStates}
                        onExpandChange={handleExpandChange}
                    />
                ))}
            </div>
        </div>
    );
};

export default TargetNode;
