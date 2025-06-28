
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SchemaField {
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    children?: SchemaField[];
    parent?: string;
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

interface SchemaFieldRendererProps {
    field: SchemaField;
    fieldValues?: Record<string, any>;
    level?: number;
    expandedFields: Set<string>;
    onFieldExpansionToggle: (fieldId: string) => void;
    handleType: 'source' | 'target';
    handlePosition: Position;
}

const SchemaFieldRenderer: React.FC<SchemaFieldRendererProps> = ({ 
    field, 
    fieldValues = {}, 
    level = 0, 
    expandedFields, 
    onFieldExpansionToggle,
    handleType,
    handlePosition
}) => {
    const fieldValue = fieldValues[field.id];
    const isExpanded = expandedFields.has(field.id);
    const hasChildren = field.children && field.children.length > 0;
    
    if (field.type === 'array') {
        return (
            <div>
                <div 
                    className={`flex items-center gap-2 py-1 px-2 pr-8 hover:bg-gray-50 rounded text-sm group cursor-pointer relative`}
                    style={{ paddingLeft: `${8 + level * 12}px` }}
                    onClick={() => onFieldExpansionToggle(field.id)}
                >
                    <div className="cursor-pointer p-1 -m-1">
                        {isExpanded ? (
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        ) : (
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                        )}
                    </div>
                    <span className="font-medium text-gray-900 flex-1 min-w-0 truncate">
                        {field.name}[]
                    </span>
                    {hasChildren && (
                        <span className="text-xs text-gray-500">({field.children!.length} items)</span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor('array')}`}>
                        array
                    </span>
                    
                    <Handle
                        type={handleType}
                        position={handlePosition}
                        id={field.id}
                        className={`w-3 h-3 ${handleType === 'source' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'} border-2 border-white !absolute !left-1`}
                        style={{
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 10
                        }}
                    />
                </div>
                
                {isExpanded && hasChildren && field.children!.map((childField) => (
                    <SchemaFieldRenderer
                        key={childField.id}
                        field={childField}
                        fieldValues={fieldValues}
                        level={level + 1}
                        expandedFields={expandedFields}
                        onFieldExpansionToggle={onFieldExpansionToggle}
                        handleType={handleType}
                        handlePosition={handlePosition}
                    />
                ))}
            </div>
        );
    }
    
    if (field.type === 'object') {
        return (
            <div>
                <div 
                    className={`flex items-center gap-2 py-1 px-2 pr-8 hover:bg-gray-50 rounded text-sm group cursor-pointer relative`}
                    style={{ paddingLeft: `${8 + level * 12}px` }}
                    onClick={() => onFieldExpansionToggle(field.id)}
                >
                    <div className="cursor-pointer p-1 -m-1">
                        {isExpanded ? (
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        ) : (
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                        )}
                    </div>
                    <span className="font-medium text-gray-900 flex-1 min-w-0 truncate">
                        {field.name}
                    </span>
                    {hasChildren && (
                        <span className="text-xs text-gray-500">
                            ({field.children!.length} fields)
                        </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor('object')}`}>
                        object
                    </span>
                    
                    <Handle
                        type={handleType}
                        position={handlePosition}
                        id={field.id}
                        className={`w-3 h-3 ${handleType === 'source' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'} border-2 border-white !absolute !left-1`}
                        style={{
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 10
                        }}
                    />
                </div>
                
                {isExpanded && hasChildren && field.children!.map((childField) => (
                    <SchemaFieldRenderer
                        key={childField.id}
                        field={childField}
                        fieldValues={fieldValues}
                        level={level + 1}
                        expandedFields={expandedFields}
                        onFieldExpansionToggle={onFieldExpansionToggle}
                        handleType={handleType}
                        handlePosition={handlePosition}
                    />
                ))}
            </div>
        );
    }
    
    // Primitive field
    return (
        <div 
            className={`flex items-center gap-2 py-1 px-2 pr-8 hover:bg-gray-50 rounded text-sm group cursor-pointer relative`}
            style={{ paddingLeft: `${8 + level * 12}px` }}
        >
            <div className="w-3 h-3" />
            <span className="font-medium text-gray-900 flex-1 min-w-0 truncate">{field.name}</span>
            {handleType === 'target' && (
                <div className="text-xs min-w-[80px] text-center">
                    {fieldValue !== undefined && fieldValue !== null && fieldValue !== '' ? (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                            {String(fieldValue)}
                        </span>
                    ) : (
                        <span className="text-gray-400 italic">no value</span>
                    )}
                </div>
            )}
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(field.type)}`}>
                {field.type}
            </span>
            
            <Handle
                type={handleType}
                position={handlePosition}
                id={field.id}
                className={`w-3 h-3 ${handleType === 'source' ? 'bg-orange-500 group-hover:bg-orange-600' : 'bg-blue-500 group-hover:bg-blue-600'} border-2 border-white !absolute ${handlePosition === Position.Right ? '!right-1' : '!left-1'}`}
                style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                }}
            />
        </div>
    );
};

interface GenericSchemaRendererProps {
    fields: SchemaField[];
    fieldValues?: Record<string, any>;
    handleType: 'source' | 'target';
    handlePosition: Position;
    emptyMessage?: string;
}

const GenericSchemaRenderer: React.FC<GenericSchemaRendererProps> = ({
    fields,
    fieldValues,
    handleType,
    handlePosition,
    emptyMessage = "No fields defined."
}) => {
    const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

    const handleFieldExpansionToggle = (fieldId: string) => {
        const newExpanded = new Set(expandedFields);
        if (expandedFields.has(fieldId)) {
            newExpanded.delete(fieldId);
        } else {
            newExpanded.add(fieldId);
        }
        setExpandedFields(newExpanded);
    };

    return (
        <div className="p-1">
            {fields.map((field) => (
                <SchemaFieldRenderer
                    key={field.id}
                    field={field}
                    fieldValues={fieldValues}
                    expandedFields={expandedFields}
                    onFieldExpansionToggle={handleFieldExpansionToggle}
                    handleType={handleType}
                    handlePosition={handlePosition}
                />
            ))}
            
            {fields.length === 0 && (
                <div className="text-center py-3 text-gray-500 text-xs">
                    {emptyMessage}
                </div>
            )}
        </div>
    );
};

export default GenericSchemaRenderer;
export { type SchemaField };
