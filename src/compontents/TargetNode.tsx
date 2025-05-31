
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
    expandedStates: Map<string, boolean>;
    onExpandChange?: () => void;
}> = ({ field, level, value, expandedStates, onExpandChange }) => {
    const isExpanded = expandedStates.get(field.id) !== false; // Default to true
    const hasChildren = field.children && field.children.length > 0;

    const handleToggle = () => {
        expandedStates.set(field.id, !isExpanded);
        if (onExpandChange) onExpandChange();
    };

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
                        <TargetField 
                            key={child.id} 
                            field={child} 
                            level={level + 1} 
                            value={undefined} 
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

const TargetNode: React.FC<{ data: TargetNodeData }> = ({ data }) => {
    const { getEdges } = useReactFlow();
    const edges = getEdges();
    const [expandedStates] = useState(() => new Map<string, boolean>());
    const [, forceUpdate] = useState({});

    const handleExpandChange = () => {
        forceUpdate({});
    };

    // Build a map of targetHandle → value from edges AND target node's own data
    const firstRecord = data.data?.[0] ?? {};
    const handleValueMap: Record<string, any> = {};

    // First, populate with target node's own data
    for (const field of data.fields) {
        if (firstRecord[field.id] !== undefined) {
            handleValueMap[field.id] = firstRecord[field.id];
        }
    }

    // Then, override with edge-connected values
    for (const edge of edges) {
        const targetHandle = edge.targetHandle;
        const sourceHandle = edge.sourceHandle;
        if (targetHandle && sourceHandle) {
            // Find source node data
            const sourceNode = edges.find(e => e.source)?.source;
            if (sourceNode) {
                handleValueMap[targetHandle] = firstRecord[sourceHandle];
            }
        }
    }

    // Calculate actual visible field count
    const visibleFieldCount = countVisibleFields(data.fields, expandedStates);
    const fieldHeight = 32;
    const headerHeight = 60;
    const padding = 8; // Small padding for borders
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
                        value={handleValueMap[field.id]}
                        expandedStates={expandedStates}
                        onExpandChange={handleExpandChange}
                    />
                ))}
            </div>
        </div>
    );
};

export default TargetNode;
