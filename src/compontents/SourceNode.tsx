
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ChevronDown, ChevronRight, Database } from 'lucide-react';

interface SchemaField {
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    children?: SchemaField[];
}

interface SourceNodeData {
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

const SourceField: React.FC<{
    field: SchemaField;
    level: number;
    expandedStates: Map<string, boolean>;
    onExpandChange?: () => void;
}> = ({ field, level, expandedStates, onExpandChange }) => {
    const isExpanded = expandedStates.get(field.id) !== false; // Default to true
    const hasChildren = field.children && field.children.length > 0;

    const handleToggle = () => {
        expandedStates.set(field.id, !isExpanded);
        if (onExpandChange) onExpandChange();
    };

    return (
        <div className="relative">
            <div
                className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded text-sm group"
                style={{ marginLeft: `${level * 16}px` }}
            >
                {hasChildren && (
                    <button
                        onClick={handleToggle}
                        className="p-0.5 hover:bg-gray-200 rounded"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-3 h-3 text-gray-500" />
                        ) : (
                            <ChevronRight className="w-3 h-3 text-gray-500" />
                        )}
                    </button>
                )}
                {!hasChildren && <div className="w-4" />}

                <span className="font-medium text-gray-900 flex-1">{field.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(field.type)}`}>
                    {field.type}
                </span>

                {!hasChildren && (
                    <Handle
                        type="source"
                        position={Position.Right}
                        id={field.id}
                        className="w-3 h-3 bg-blue-500 border-2 border-white group-hover:bg-blue-600"
                        style={{
                            right: '-6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                        }}
                    />
                )}
            </div>

            {hasChildren && isExpanded && (
                <div>
                    {field.children?.map((child) => (
                        <SourceField
                            key={child.id}
                            field={child}
                            level={level + 1}
                            expandedStates={expandedStates}
                            onExpandChange={onExpandChange}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Helper function to count actually visible fields
const countVisibleFields = (fields: SchemaField[], expandedStates: Map<string, boolean>): number => {
    let count = 0;
    for (const field of fields) {
        count += 1;
        if (field.children && field.children.length > 0) {
            const isExpanded = expandedStates.get(field.id) !== false;
            if (isExpanded) {
                count += countVisibleFields(field.children, expandedStates);
            }
        }
    }
    return count;
};

const SourceNode: React.FC<{ data: SourceNodeData }> = ({ data }) => {
    const { label, fields } = data;
    const [expandedStates] = useState(() => new Map<string, boolean>());
    const [, forceUpdate] = useState({});

    const handleExpandChange = () => {
        forceUpdate({});
    };

    // Calculate actual visible field count
    const visibleFieldCount = countVisibleFields(fields, expandedStates);
    const fieldHeight = 32;
    const headerHeight = 60;
    const padding = 8; // Small padding for borders
    const dynamicHeight = headerHeight + (visibleFieldCount * fieldHeight) + padding;

    return (
        <div 
            className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-64 max-w-80"
            style={{ height: `${dynamicHeight}px` }}
        >
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 bg-blue-50">
                <Database className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-gray-900">{label}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                    source
                </span>
            </div>

            <div className="p-2" style={{ height: `${dynamicHeight - headerHeight}px` }}>
                {fields.map((field) => (
                    <SourceField
                        key={field.id}
                        field={field}
                        level={0}
                        expandedStates={expandedStates}
                        onExpandChange={handleExpandChange}
                    />
                ))}
            </div>
        </div>
    );
};

export default SourceNode;
