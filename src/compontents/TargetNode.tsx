
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ChevronDown, ChevronRight, FileText, ChevronUp } from 'lucide-react';
import { useTargetNodeValues } from '../hooks/useTargetNodeValues';

interface SchemaField {
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    children?: SchemaField[];
}

interface TargetNodeData {
    label: string;
    fields: SchemaField[];
    data?: any[]; // Contains processed output data
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

const TargetNode: React.FC<{ data: TargetNodeData; id: string }> = ({ data, id }) => {
    const [showAllFields, setShowAllFields] = useState(false);
    
    // Use the centralized hook for value resolution
    const handleValueMap = useTargetNodeValues(id, data.fields, data.data || []);

    console.log('Target node data:', data.data?.[0]);
    console.log('Handle value map:', handleValueMap);

    const MAX_VISIBLE_FIELDS = 8;
    const visibleFields = showAllFields ? data.fields : data.fields.slice(0, MAX_VISIBLE_FIELDS);
    const hasMoreFields = data.fields.length > MAX_VISIBLE_FIELDS;

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-64 max-w-80">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 bg-green-50">
                <FileText className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-gray-900">{data.label}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                    target
                </span>
            </div>

            <div className="p-2">
                {visibleFields.map((field) => (
                    <TargetField
                        key={field.id}
                        field={field}
                        level={0}
                        value={handleValueMap[field.id]}
                    />
                ))}
                
                {hasMoreFields && (
                    <button
                        onClick={() => setShowAllFields(!showAllFields)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2 px-2 py-1 rounded hover:bg-blue-50 w-full justify-center"
                    >
                        {showAllFields ? (
                            <>
                                <ChevronUp className="w-3 h-3" />
                                Show Less ({data.fields.length - MAX_VISIBLE_FIELDS} hidden)
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-3 h-3" />
                                Show More ({data.fields.length - MAX_VISIBLE_FIELDS} more fields)
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default TargetNode;
