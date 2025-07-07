import React, { useState, useEffect } from 'react';
import { Handle, Position, useStore, NodeResizer } from '@xyflow/react';
import { ChevronDown, ChevronRight, Database, Settings } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useNodeDataSync } from '../../hooks/useNodeDataSync';
import NodeEditSheet from './NodeEditSheet';
import JsonImportDialog from './JsonImportDialog';

interface SchemaField {
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    exampleValue?: any;
    children?: SchemaField[];
}

interface SourceNodeData {
    label: string;
    fields?: SchemaField[];  // Manual fields like TargetNode
    data?: any[];
    initialExpandedFields?: Set<string>;
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

const DataField: React.FC<{
    path: string;
    value: any;
    level: number;
    onFieldToggle: (path: string) => void;
    onFieldExpansionToggle: (path: string) => void;
    selectedFields: Set<string>;
    expandedFields: Set<string>;
}> = ({ path, value, level, onFieldToggle, onFieldExpansionToggle, selectedFields, expandedFields }) => {
    const fieldName = path.split('.').pop() || path;
    const isExpanded = expandedFields.has(path);
    const isSelected = selectedFields.has(path);
    
    if (Array.isArray(value)) {
        return (
            <div>
                <div 
                    className={`flex items-center gap-2 py-1 px-2 pr-8 hover:bg-gray-50 rounded text-sm group cursor-pointer relative ${
                        isSelected ? 'bg-blue-50' : ''
                    }`}
                    style={{ paddingLeft: `${8 + level * 12}px` }}
                >
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            onFieldExpansionToggle(path);
                        }}
                        className="cursor-pointer p-1 -m-1"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        ) : (
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                        )}
                    </div>
                    <span 
                        className="font-medium text-gray-900 flex-1 min-w-0 truncate cursor-pointer text-left"
                        onClick={(e) => {
                            e.stopPropagation();
                            onFieldToggle(path);
                        }}
                    >
                        {fieldName}
                    </span>
                    <span className="text-xs text-gray-500">({value.length} items)</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor('array')}`}>
                        array
                    </span>
                </div>
                
                <Handle
                    type="source"
                    position={Position.Right}
                    id={path}
                    className={`w-3 h-3 bg-blue-500 border-2 border-white hover:bg-blue-600 !absolute !right-1 ${
                        isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                        top: `${(level * 20) + 10}px`,
                        transform: 'translateY(-50%)',
                        zIndex: 10
                    }}
                />
                
                {/* Show structure of array elements with [0] notation */}
                {isExpanded && value.length > 0 && value[0] && typeof value[0] === 'object' && (
                    Object.entries(value[0]).map(([key, val]) => (
                        <DataField
                            key={`${path}[0].${key}`}
                            path={`${path}[0].${key}`}
                            value={val}
                            level={level + 1}
                            onFieldToggle={onFieldToggle}
                            onFieldExpansionToggle={onFieldExpansionToggle}
                            selectedFields={selectedFields}
                            expandedFields={expandedFields}
                        />
                    ))
                )}
            </div>
        );
    }
    
    if (value && typeof value === 'object') {
        // If this is the root object (path is empty), render each field individually
        if (path === '') {
            return (
                <div>
                    {Object.entries(value).map(([key, val]) => (
                        <DataField
                            key={key}
                            path={key}
                            value={val}
                            level={level}
                            onFieldToggle={onFieldToggle}
                            onFieldExpansionToggle={onFieldExpansionToggle}
                            selectedFields={selectedFields}
                            expandedFields={expandedFields}
                        />
                    ))}
                </div>
            );
        }
        
        // Regular object field rendering
        return (
            <div>
                <div 
                    className={`flex items-center gap-2 py-1 px-2 pr-8 hover:bg-gray-50 rounded text-sm group cursor-pointer relative ${
                        isSelected ? 'bg-blue-50' : ''
                    }`}
                    style={{ paddingLeft: `${8 + level * 12}px` }}
                >
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            onFieldExpansionToggle(path);
                        }}
                        className="cursor-pointer p-1 -m-1"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        ) : (
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                        )}
                    </div>
                    <span 
                        className="font-medium text-gray-900 flex-1 min-w-0 truncate cursor-pointer text-left"
                        onClick={(e) => {
                            e.stopPropagation();
                            onFieldToggle(path);
                        }}
                    >
                        {fieldName}
                    </span>
                    <span className="text-xs text-gray-500">
                        ({Object.keys(value).length} fields)
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor('object')}`}>
                        object
                    </span>
                </div>
                
                <Handle
                    type="source"
                    position={Position.Right}
                    id={path}
                    className={`w-3 h-3 bg-blue-500 border-2 border-white hover:bg-blue-600 !absolute !right-1 ${
                        isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                        top: `${(level * 20) + 10}px`,
                        transform: 'translateY(-50%)',
                        zIndex: 10
                    }}
                />
                
                {isExpanded && Object.entries(value).map(([key, val]) => (
                    <DataField
                        key={`${path}.${key}`}
                        path={`${path}.${key}`}
                        value={val}
                        level={level + 1}
                        onFieldToggle={onFieldToggle}
                        onFieldExpansionToggle={onFieldExpansionToggle}
                        selectedFields={selectedFields}
                        expandedFields={expandedFields}
                    />
                ))}
            </div>
        );
    }
    
    // Primitive values (string, number, boolean, null)
    const getValueType = (val: any): string => {
        if (val === null) return 'null';
        if (typeof val === 'boolean') return 'boolean';
        if (typeof val === 'number') return 'number';
        if (typeof val === 'string') {
            // Check if it looks like a date
            if (val.match(/^\d{4}-\d{2}-\d{2}/) || val.includes('T') && val.includes('Z')) {
                return 'date';
            }
            return 'string';
        }
        return 'unknown';
    };
    
    const valueType = getValueType(value);
    const displayValue = value === null ? 'null' : 
                        typeof value === 'string' ? `"${value.length > 30 ? value.substring(0, 30) + '...' : value}"` :
                        String(value);
    
    return (
        <div 
            className={`flex items-center gap-2 py-1 px-2 pr-8 hover:bg-gray-50 rounded text-sm group cursor-pointer relative ${
                isSelected ? 'bg-blue-50' : ''
            }`}
            style={{ paddingLeft: `${8 + level * 12}px` }}
            onClick={(e) => {
                e.stopPropagation();
                onFieldToggle(path);
            }}
        >
            <span className="font-medium text-gray-900 flex-1 min-w-0 truncate">
                {fieldName}
            </span>
            <span className="text-xs text-gray-500 max-w-24 truncate">
                {displayValue}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(valueType)}`}>
                {valueType}
            </span>
            
            <Handle
                type="source"
                position={Position.Right}
                id={path}
                className={`w-3 h-3 bg-blue-500 border-2 border-white hover:bg-blue-600 !absolute !right-1 ${
                    isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10
                }}
            />
        </div>
    );
};

const SourceNode: React.FC<{ id: string; data: SourceNodeData; selected?: boolean }> = ({ id, data, selected }) => {
    const [fields, setFields] = useState<SchemaField[]>(data.fields || []);
    const [nodeData, setNodeData] = useState<any[]>(data.data || []);
    const [jsonInput, setJsonInput] = useState('');
    const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
    const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

    const allEdges = useStore((store) => store.edges);

    // Sync data changes
    useEffect(() => {
        if (data.fields && JSON.stringify(data.fields) !== JSON.stringify(fields)) {
            setFields(data.fields);
        }
        if (data.data && JSON.stringify(data.data) !== JSON.stringify(nodeData)) {
            setNodeData(data.data);
        }
        
        // Auto-expand based on initialExpandedFields from imported mapping
        if (data.initialExpandedFields && data.initialExpandedFields.size > 0) {
            console.log('Setting initial expanded fields from import:', Array.from(data.initialExpandedFields));
            setExpandedFields(prev => {
                const combined = new Set([...prev, ...data.initialExpandedFields]);
                return combined;
            });
        }
    }, [data.fields, data.data, data.initialExpandedFields]);

    // Auto-expand connected fields
    useEffect(() => {
        const connectedPaths = new Set<string>();

        allEdges.forEach((edge) => {
            if (edge.source === id && edge.sourceHandle) {
                const path = edge.sourceHandle;
                
                // Build parent paths for expansion
                const parts = path.split('.');
                for (let i = 0; i < parts.length; i++) {
                    let parentPath = parts.slice(0, i + 1).join('.');
                    // Clean array indices for expansion
                    parentPath = parentPath.replace(/\[.*?\]/g, '');
                    if (parentPath) {
                        connectedPaths.add(parentPath);
                    }
                }
            }
        });

        if (connectedPaths.size > 0) {
            setExpandedFields(prev => {
                const merged = new Set([...prev, ...connectedPaths]);
                return merged;
            });
        }
    }, [allEdges, id]);

    // Use the sync hook for data persistence
    useNodeDataSync(id, { 
        label: data.label, 
        fields: fields,
        data: nodeData
    });

    const hasData = nodeData && nodeData.length > 0;
    const hasFields = fields && fields.length > 0;

    const handleJsonImport = () => {
        try {
            const importedData = JSON.parse(jsonInput);
            const dataArray = Array.isArray(importedData) ? importedData : [importedData];
            setNodeData(dataArray);
            
            // Auto-generate fields from data if no manual fields exist
            if (!hasFields && dataArray.length > 0) {
                const generatedFields = generateFieldsFromData(dataArray[0]);
                setFields(generatedFields);
            }
            
            setJsonInput('');
        } catch (error) {
            console.error('Failed to parse JSON:', error);
        }
    };

    const generateFieldsFromData = (sampleObject: any): SchemaField[] => {
        const fields: SchemaField[] = [];
        
        Object.entries(sampleObject).forEach(([key, value]) => {
            const field: SchemaField = {
                id: `field-${Date.now()}-${key}`,
                name: key,
                type: getFieldType(value),
                exampleValue: value
            };
            
            if (field.type === 'object' && value && typeof value === 'object') {
                field.children = generateFieldsFromData(value);
            } else if (field.type === 'array' && Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                field.children = generateFieldsFromData(value[0]);
            }
            
            fields.push(field);
        });
        
        return fields;
    };

    const getFieldType = (value: any): SchemaField['type'] => {
        if (value === null) return 'string';
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'object') return 'object';
        if (typeof value === 'boolean') return 'boolean';
        if (typeof value === 'number') return 'number';
        if (typeof value === 'string') {
            if (value.match(/^\d{4}-\d{2}-\d{2}/) || (value.includes('T') && value.includes('Z'))) {
                return 'date';
            }
            return 'string';
        }
        return 'string';
    };

    const renderSchemaField = (field: SchemaField, level: number): React.ReactNode => {
        const fieldPath = field.name;
        const isExpanded = expandedFields.has(fieldPath);
        const isSelected = selectedFields.has(fieldPath);
        const canExpand = (field.children && field.children.length > 0) || (field.type === 'array' || field.type === 'object');
        
        return (
            <div key={field.id}>
                <div 
                    className={`flex items-center gap-2 py-1 px-2 pr-8 hover:bg-gray-50 rounded text-sm group cursor-pointer relative ${
                        isSelected ? 'bg-blue-50' : ''
                    }`}
                    style={{ paddingLeft: `${8 + level * 12}px` }}
                >
                    {/* Consistent chevron spacing like TargetNode */}
                    {canExpand ? (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                handleFieldExpansionToggle(fieldPath);
                            }}
                            className="cursor-pointer p-1 -m-1"
                        >
                            {isExpanded ? (
                                <ChevronDown className="w-3 h-3 text-gray-400" />
                            ) : (
                                <ChevronRight className="w-3 h-3 text-gray-400" />
                            )}
                        </div>
                    ) : (
                        <div className="w-3 h-3" />
                    )}
                    
                    <span 
                        className="font-medium text-gray-900 flex-1 min-w-0 truncate cursor-pointer text-left"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleFieldToggle(fieldPath);
                        }}
                    >
                        {field.name}{field.type === 'array' ? '[]' : ''}
                    </span>
                    
                    {/* Field value display like TargetNode */}
                    <div className="text-xs min-w-[80px] text-center">
                        {field.exampleValue ? (
                            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                                {String(field.exampleValue).length > 20 ? 
                                    String(field.exampleValue).substring(0, 20) + '...' : 
                                    String(field.exampleValue)}
                            </span>
                        ) : field.children && field.children.length > 0 ? (
                            <span className="text-xs text-gray-500">({field.children.length} fields)</span>
                        ) : (
                            <span className="text-gray-400 italic text-xs">no data</span>
                        )}
                    </div>
                    
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(field.type)}`}>
                        {field.type}
                    </span>
                    
                    <Handle
                        type="source"
                        position={Position.Right}
                        id={fieldPath}
                        className={`w-3 h-3 bg-blue-500 border-2 border-white hover:bg-blue-600 !absolute !right-1 ${
                            isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 10
                        }}
                    />
                </div>
                
                {/* For arrays and objects with sample data, show nested structure from data */}
                {isExpanded && (field.type === 'array' || field.type === 'object') && hasData && (
                    <div>
                        {field.type === 'array' && nodeData[0]?.[field.name] && Array.isArray(nodeData[0][field.name]) && nodeData[0][field.name].length > 0 && (
                            Object.entries(nodeData[0][field.name][0] || {}).map(([key, value]) => (
                                <div key={`${fieldPath}[0].${key}`}>
                                    <div 
                                        className={`flex items-center gap-2 py-1 px-2 pr-8 hover:bg-gray-50 rounded text-sm group cursor-pointer relative ${
                                            selectedFields.has(`${fieldPath}[0].${key}`) ? 'bg-blue-50' : ''
                                        }`}
                                        style={{ paddingLeft: `${20 + (level + 1) * 12}px` }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleFieldToggle(`${fieldPath}[0].${key}`);
                                        }}
                                    >
                                        <div className="w-3 h-3" />
                                        <span className="font-medium text-gray-900 flex-1 min-w-0 truncate">
                                            {key}
                                        </span>
                                        <div className="text-xs min-w-[80px] text-center">
                                            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                                                {typeof value === 'string' ? 
                                                    (value.length > 15 ? value.substring(0, 15) + '...' : value) : 
                                                    String(value)}
                                            </span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(Array.isArray(value) ? 'array' : typeof value)}`}>
                                            {Array.isArray(value) ? 'array' : typeof value}
                                        </span>
                                        
                                        <Handle
                                            type="source"
                                            position={Position.Right}
                                            id={`${fieldPath}[0].${key}`}
                                            className={`w-3 h-3 bg-blue-500 border-2 border-white hover:bg-blue-600 !absolute !right-1 ${
                                                selectedFields.has(`${fieldPath}[0].${key}`) ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                                            }`}
                                            style={{
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                zIndex: 10
                                            }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                        
                        {field.type === 'object' && nodeData[0]?.[field.name] && (
                            Object.entries(nodeData[0][field.name] || {}).map(([key, value]) => (
                                <div key={`${fieldPath}.${key}`}>
                                    <div 
                                        className={`flex items-center gap-2 py-1 px-2 pr-8 hover:bg-gray-50 rounded text-sm group cursor-pointer relative ${
                                            selectedFields.has(`${fieldPath}.${key}`) ? 'bg-blue-50' : ''
                                        }`}
                                        style={{ paddingLeft: `${20 + (level + 1) * 12}px` }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleFieldToggle(`${fieldPath}.${key}`);
                                        }}
                                    >
                                        <div className="w-3 h-3" />
                                        <span className="font-medium text-gray-900 flex-1 min-w-0 truncate">
                                            {key}
                                        </span>
                                        <div className="text-xs min-w-[80px] text-center">
                                            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                                                {typeof value === 'string' ? 
                                                    (value.length > 15 ? value.substring(0, 15) + '...' : value) : 
                                                    String(value)}
                                            </span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(Array.isArray(value) ? 'array' : typeof value)}`}>
                                            {Array.isArray(value) ? 'array' : typeof value}
                                        </span>
                                        
                                        <Handle
                                            type="source"
                                            position={Position.Right}
                                            id={`${fieldPath}.${key}`}
                                            className={`w-3 h-3 bg-blue-500 border-2 border-white hover:bg-blue-600 !absolute !right-1 ${
                                                selectedFields.has(`${fieldPath}.${key}`) ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                                            }`}
                                            style={{
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                zIndex: 10
                                            }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
                
                {/* Render manual children if they exist */}
                {isExpanded && field.children && field.children.map((childField) => 
                    renderSchemaField({
                        ...childField,
                        name: `${fieldPath}${field.type === 'array' ? '[0]' : ''}.${childField.name}`
                    }, level + 1)
                )}
            </div>
        );
    };

    const handleFieldToggle = (path: string) => {
        setSelectedFields(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(path)) {
                newSelected.delete(path);
            } else {
                newSelected.add(path);
            }
            return newSelected;
        });
    };

    const handleFieldExpansionToggle = (path: string) => {
        const newExpanded = new Set(expandedFields);
        
        if (expandedFields.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        
        setExpandedFields(newExpanded);
    };

    return (
        <div className="bg-white border-2 border-gray-200 rounded-lg shadow-lg min-w-80 max-w-96">
            <NodeResizer
                color="#ff0071"
                isVisible={selected}
                minWidth={320}
                maxWidth={600}
                minHeight={250}
                maxHeight={800}
            />
            
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-blue-50 border-b">
                <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-900">{data.label}</span>
                    {hasData && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                            {nodeData.length} records
                        </span>
                    )}
                </div>
                <NodeEditSheet
                    title="Edit Source Node"
                    triggerClassName="p-1 text-gray-500 hover:text-gray-700 hover:bg-white rounded"
                >
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Import JSON Data:</label>
                            <JsonImportDialog
                                jsonInput={jsonInput}
                                setJsonInput={setJsonInput}
                                onImport={handleJsonImport}
                            />
                            {hasData && (
                                <div className="mt-2 text-xs text-gray-500">
                                    Current data: {nodeData.length} records
                                </div>
                            )}
                        </div>
                    </div>
                </NodeEditSheet>
            </div>

            {/* Fields Display */}
            <ScrollArea className="flex-1" style={{ maxHeight: 'calc(100% - 60px)' }}>
                <div className="p-2">
                    {hasFields ? (
                        <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 px-2 py-1">
                                Source Fields ({fields.length}):
                            </div>
                            {fields.map((field) => renderSchemaField(field, 0))}
                        </div>
                    ) : hasData ? (
                        <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 px-2 py-1">
                                Auto-generated Fields ({Object.keys(nodeData[0] || {}).length}):
                            </div>
                            <DataField
                                path=""
                                value={nodeData[0] || {}}
                                level={0}
                                onFieldToggle={handleFieldToggle}
                                onFieldExpansionToggle={handleFieldExpansionToggle}
                                selectedFields={selectedFields}
                                expandedFields={expandedFields}
                            />
                        </div>
                    ) : (
                        <div className="text-center py-6 text-gray-500 text-sm">
                            No data available.<br />
                            Click the settings icon to import JSON data.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default SourceNode;