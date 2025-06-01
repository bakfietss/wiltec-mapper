

import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';

interface SchemaField {
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    children?: SchemaField[];
}

interface TargetNodeData {
    label: string;
    fields: SchemaField[];
    data?: any[];
}

const getTypeColor = (type: string) => {
    switch (type) {
        case 'string': return 'text-green-600 bg-green-50';
        case 'number': return 'text-blue-600 bg-blue-50';
        case 'boolean': return 'text-purple-600 bg-purple-50';
        case 'date': return 'text-orange-600 bg-orange-50';
        case 'object': return 'text-gray-600 bg-gray-50';
        case 'array': return 'text-red-600 bg-red-50';
        default: return 'text-gray-600 bg-gray-50';
    }
};

const TargetField: React.FC<{
    field: SchemaField;
    level: number;
    value: string | number | boolean | undefined;
}> = ({ field, level, value }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = field.children && field.children.length > 0;

    return (
        <div className="relative">
            <div
                className="flex items-center justify-between gap-2 py-1 px-2 hover:bg-gray-50 rounded text-sm group"
                style={{ marginLeft: `${level * 16}px` }}
            >
                {hasChildren ? (
                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-0.5 hover:bg-gray-200 rounded">
                        {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
                    </button>
                ) : (
                    <div className="w-4" />
                )}

                <span className="font-medium text-gray-900 flex-1">{field.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(field.type)}`}>
                    {field.type}
                </span>
                <span className="text-xs text-gray-500 truncate max-w-[120px]">{String(value ?? '')}</span>

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
                        <TargetField key={child.id} field={child} level={level + 1} value={undefined} />
                    ))}
                </div>
            )}
        </div>
    );
};

// Helper function to count visible fields recursively
const countVisibleFields = (fields: SchemaField[]): number => {
    let count = 0;
    for (const field of fields) {
        count += 1; // Count the field itself
        if (field.children && field.children.length > 0) {
            count += countVisibleFields(field.children); // Count expanded children
        }
    }
    return count;
};

const TargetNode: React.FC<{ data: TargetNodeData }> = ({ data }) => {
    const { getEdges } = useReactFlow();
    const edges = getEdges();

    // Build a map of targetHandle → value from the data
    const firstRecord = data.data?.[0] ?? {};
    const handleValueMap: Record<string, any> = {};

    for (const edge of edges) {
        const targetHandle = edge.targetHandle;
        const sourceHandle = edge.sourceHandle;
        if (targetHandle && sourceHandle) {
            handleValueMap[targetHandle] = firstRecord[sourceHandle];
        }
    }

    // Calculate dynamic height based on actual visible fields
    const visibleFieldCount = countVisibleFields(data.fields);
    const fieldHeight = 32; // Height per field
    const headerHeight = 60;
    const containerPadding = 8; // Just 4px top + 4px bottom
    const dynamicHeight = headerHeight + (visibleFieldCount * fieldHeight) + containerPadding;

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

            <div className="py-1 px-2 overflow-y-auto" style={{ height: `${dynamicHeight - headerHeight}px` }}>
                {data.fields.map((field) => (
                    <TargetField
                        key={field.id}
                        field={field}
                        level={0}
                        value={handleValueMap[field.id]}
                    />
                ))}
            </div>
        </div>
    );
};

export default TargetNode;

