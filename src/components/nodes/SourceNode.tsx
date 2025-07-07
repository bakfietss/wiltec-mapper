
import React, { useState, useEffect } from 'react';
import { Handle, Position, useStore, NodeResizer } from '@xyflow/react';
import { ChevronDown, ChevronRight, Database, Plus, Trash2 } from 'lucide-react';
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
    fields: SchemaField[];
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
                        {fieldName}[]
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
                
                {isExpanded && value.map((item, index) => (
                    <DataField
                        key={`${path}[${index}]`}
                        path={`${path}[${index}]`}
                        value={item}
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
    
    // Primitive value
    const valueType = typeof value === 'number' ? 'number' : 
                     typeof value === 'boolean' ? 'boolean' : 'string';
    
    return (
        <div 
            className={`flex items-center gap-2 py-1 px-2 pr-8 hover:bg-gray-50 rounded text-sm group cursor-pointer relative ${
                isSelected ? 'bg-blue-50' : ''
            }`}
            style={{ paddingLeft: `${8 + level * 12}px` }}
            onClick={() => onFieldToggle(path)}
        >
            <div className="w-3 h-3" />
            <span className="font-medium text-gray-900 flex-1 min-w-0 truncate text-left">{fieldName}</span>
            <div className="text-xs min-w-[80px] text-center">
                {value !== undefined && value !== null && value !== '' ? (
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {String(value)}
                    </span>
                ) : (
                    <span className="text-gray-400 italic">no value</span>
                )}
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(valueType)}`}>
                {valueType}
            </span>
            
            <Handle
                type="source"
                position={Position.Right}
                id={path}
                className={`w-3 h-3 bg-blue-500 border-2 border-white group-hover:bg-blue-600 !absolute !right-1 ${
                    isSelected ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                }`}
                style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                }}
            />
        </div>
    );
};

const ManualField: React.FC<{
    field: SchemaField;
    onFieldToggle: (fieldId: string) => void;
    selectedFields: Set<string>;
}> = ({ field, onFieldToggle, selectedFields }) => {
    const isSelected = selectedFields.has(field.id);
    
    return (
        <div 
            className={`flex items-center gap-2 py-1 px-2 pr-8 hover:bg-gray-50 rounded text-sm group cursor-pointer relative ${
                isSelected ? 'bg-blue-50' : ''
            }`}
            onClick={() => onFieldToggle(field.id)}
        >
            <div className="w-3 h-3" />
            <span className="font-medium text-gray-900 flex-1 min-w-0 truncate text-left">{field.name}</span>
            <div className="text-xs min-w-[80px] text-center">
                {field.exampleValue !== undefined && field.exampleValue !== null && field.exampleValue !== '' ? (
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {String(field.exampleValue)}
                    </span>
                ) : (
                    <span className="text-gray-400 italic">no value</span>
                )}
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(field.type)}`}>
                {field.type}
            </span>
            
            <Handle
                type="source"
                position={Position.Right}
                id={field.id}
                className={`w-3 h-3 bg-blue-500 border-2 border-white group-hover:bg-blue-600 !absolute !right-1 ${
                    isSelected ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                }`}
                style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                }}
            />
        </div>
    );
};

const SourceNode: React.FC<{ data: SourceNodeData; id: string }> = ({ data, id }) => {
    console.log('SourceNode rendering with data:', data);
    const [fields, setFields] = useState<SchemaField[]>(data.fields || []);
    const [nodeData, setNodeData] = useState<any[]>(data.data || []);
    const [jsonInput, setJsonInput] = useState('');
    const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
    const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

    const allEdges = useStore((store) => store.edges);

    // Sync incoming data changes from React Flow to local state
    useEffect(() => {
        if (data.fields && JSON.stringify(data.fields) !== JSON.stringify(fields)) {
            // Check if fields are in legacy format and migrate them
            const migratedFields = data.fields.map((field: any, index: number) => {
                // If field has 'value' property, it's legacy format
                if (field.value !== undefined && !field.id) {
                    return {
                        id: field.id || `migrated-field-${Date.now()}-${index}`,
                        name: field.name,
                        type: field.type || 'string',
                        exampleValue: field.value
                    } as SchemaField;
                }
                // Already in new format
                return field as SchemaField;
            });
            setFields(migratedFields);
        }
        if (data.data && JSON.stringify(data.data) !== JSON.stringify(nodeData)) {
            setNodeData(data.data);
        }
    }, [data.fields, data.data]);

    useEffect(() => {
        const connectedPaths = new Set<string>();

        allEdges.forEach((edge) => {
            if (edge.source === id && edge.sourceHandle) {
                console.log(`Found connected handle: ${edge.sourceHandle}`);
                const segments = edge.sourceHandle.split('.');
                for (let i = 1; i <= segments.length; i++) {
                    const path = segments.slice(0, i).join('.');
                    connectedPaths.add(path);
                    console.log(`Auto-expanding path: ${path}`);
                }
            }
        });

        console.log(`Total auto-expanded paths for ${id}:`, Array.from(connectedPaths));
        setExpandedFields(connectedPaths);
    }, [allEdges, id]);

    useNodeDataSync(id, { fields, data: nodeData }, [fields, nodeData]);

    const { label } = data;
    const hasData = nodeData.length > 0 && nodeData[0];

    // Schema fields are the single source of truth - no need to check sample data separately
    const getAvailableFields = () => {
        const fieldSet = new Set<string>();
        
        // Add schema field names and IDs  
        fields.forEach(field => {
            fieldSet.add(field.name); // Add by name for backward compatibility
            fieldSet.add(field.id);   // Add by ID for proper handle creation
        });
        
        console.log(`Available fields for source node ${id}:`, Array.from(fieldSet));
        return Array.from(fieldSet);
    };

    const addField = () => {
        const newField: SchemaField = {
            id: `field-${Date.now()}`,
            name: 'New Field',
            type: 'string',
            exampleValue: ''
        };
        setFields([...fields, newField]);
    };

    const updateField = (fieldId: string, updates: Partial<SchemaField>) => {
        const updatedFields = fields.map(field => 
            field.id === fieldId ? { ...field, ...updates } : field
        );
        setFields(updatedFields);
    };

    const deleteField = (fieldId: string) => {
        const updatedFields = fields.filter(field => field.id !== fieldId);
        setFields(updatedFields);
        
        const newSelected = new Set(selectedFields);
        newSelected.delete(fieldId);
        setSelectedFields(newSelected);
    };

    // Helper function to generate schema fields from data
    const generateSchemaFieldsFromData = (obj: any, prefix = ''): SchemaField[] => {
        const fields: SchemaField[] = [];
        
        Object.entries(obj).forEach(([key, value]) => {
            const fieldId = prefix ? `${prefix}.${key}` : key;
            
            if (Array.isArray(value)) {
                const field: SchemaField = {
                    id: fieldId,
                    name: key,
                    type: 'array',
                    exampleValue: value
                };
                
                // If array contains objects, add children
                if (value.length > 0 && typeof value[0] === 'object') {
                    field.children = generateSchemaFieldsFromData(value[0], `${fieldId}[0]`);
                }
                
                fields.push(field);
            } else if (value && typeof value === 'object') {
                const field: SchemaField = {
                    id: fieldId,
                    name: key,
                    type: 'object',
                    exampleValue: value,
                    children: generateSchemaFieldsFromData(value, fieldId)
                };
                fields.push(field);
            } else {
                const field: SchemaField = {
                    id: fieldId,
                    name: key,
                    type: typeof value === 'number' ? 'number' : 
                          typeof value === 'boolean' ? 'boolean' : 
                          value instanceof Date ? 'date' : 'string',
                    exampleValue: value
                };
                fields.push(field);
            }
        });
        
        return fields;
    };

    const handleJsonImport = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            const dataArray = Array.isArray(parsed) ? parsed : [parsed];
            setNodeData(dataArray);
            
            // Generate fields from imported data and merge with existing manual fields
            const importedFields = generateSchemaFieldsFromData(dataArray[0] || {});
            
            // Merge imported fields with existing manual fields, avoiding duplicates
            const mergedFields = [...fields];
            importedFields.forEach(importedField => {
                const existingField = fields.find(f => f.name === importedField.name);
                if (!existingField) {
                    mergedFields.push(importedField);
                }
            });
            
            setFields(mergedFields);
            setJsonInput('');
            setSelectedFields(new Set());
        } catch (error) {
            console.error('Invalid JSON:', error);
            alert('Invalid JSON format');
        }
    };

    const handleFieldToggle = (fieldId: string) => {
        const newSelected = new Set(selectedFields);
        
        if (selectedFields.has(fieldId)) {
            newSelected.delete(fieldId);
        } else {
            newSelected.add(fieldId);
        }
        
        setSelectedFields(newSelected);
    };

    const handleDataFieldToggle = (path: string) => {
        const newSelected = new Set(selectedFields);
        
        if (selectedFields.has(path)) {
            newSelected.delete(path);
        } else {
            newSelected.add(path);
        }
        
        setSelectedFields(newSelected);
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

    const getExampleValueInput = (field: SchemaField) => {
        switch (field.type) {
            case 'number':
                return (
                    <input
                        type="number"
                        value={field.exampleValue || ''}
                        onChange={(e) => updateField(field.id, { exampleValue: parseFloat(e.target.value) || '' })}
                        className="flex-1 border rounded px-2 py-1 text-sm"
                        placeholder="123"
                    />
                );
            case 'boolean':
                return (
                    <select
                        value={field.exampleValue?.toString() || ''}
                        onChange={(e) => updateField(field.id, { exampleValue: e.target.value === 'true' })}
                        className="flex-1 border rounded px-2 py-1 text-sm"
                    >
                        <option value="">Select...</option>
                        <option value="true">true</option>
                        <option value="false">false</option>
                    </select>
                );
            case 'date':
                return (
                    <input
                        type="date"
                        value={field.exampleValue || ''}
                        onChange={(e) => updateField(field.id, { exampleValue: e.target.value })}
                        className="flex-1 border rounded px-2 py-1 text-sm"
                    />
                );
            default:
                return (
                    <input
                        type="text"
                        value={field.exampleValue || ''}
                        onChange={(e) => updateField(field.id, { exampleValue: e.target.value })}
                        className="flex-1 border rounded px-2 py-1 text-sm"
                        placeholder="Example value"
                    />
                );
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-80 max-w-none w-auto relative">
            <NodeResizer minWidth={300} minHeight={200} />
            
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 bg-blue-50">
                <Database className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-gray-900 flex-1">{data.label}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                    source
                </span>
                
                <NodeEditSheet title={`Configure Source: ${label}`}>
                    <div className="flex-1 flex flex-col space-y-4 mt-6">
                        {/* Current Data Preview */}
                        <div className="flex-shrink-0">
                            <h4 className="font-medium mb-2">Current Data ({nodeData.length} records):</h4>
                            <div className="h-80 border rounded p-2 bg-gray-50">
                                <ScrollArea className="h-full">
                                    {nodeData.length > 0 ? (
                                        <pre className="text-xs">
                                            {JSON.stringify(nodeData.slice(0, 3), null, 2)}
                                            {nodeData.length > 3 && '\n... and more'}
                                        </pre>
                                    ) : (
                                        <p className="text-gray-500 text-sm">No data available</p>
                                    )}
                                </ScrollArea>
                            </div>
                        </div>

                        {/* Schema Field Configuration */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">Schema Fields:</h4>
                                <div className="flex gap-2">
                                    <JsonImportDialog
                                        jsonInput={jsonInput}
                                        setJsonInput={setJsonInput}
                                        onImport={handleJsonImport}
                                    />
                                    
                                    <button
                                        onClick={addField}
                                        className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Add Field
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 border rounded min-h-0">
                                <ScrollArea className="h-full max-h-96">
                                    <div className="space-y-4 p-4">
                                        {fields.map((field) => (
                                            <div key={field.id} className="border rounded p-3 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={field.name}
                                                        onChange={(e) => updateField(field.id, { name: e.target.value })}
                                                        className="flex-1 border rounded px-2 py-1 text-sm"
                                                        placeholder="Field name"
                                                    />
                                                    <select
                                                        value={field.type}
                                                        onChange={(e) => updateField(field.id, { type: e.target.value as any })}
                                                        className="border rounded px-2 py-1 text-sm"
                                                    >
                                                        <option value="string">String</option>
                                                        <option value="number">Number</option>
                                                        <option value="boolean">Boolean</option>
                                                        <option value="date">Date</option>
                                                        <option value="object">Object</option>
                                                        <option value="array">Array</option>
                                                    </select>
                                                    <button
                                                        onClick={() => deleteField(field.id)}
                                                        className="p-1 text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    <label className="text-sm text-gray-600 w-20">Example:</label>
                                                    {getExampleValueInput(field)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    </div>
                </NodeEditSheet>
            </div>

            {/* Unified Schema Fields - Single Source of Truth */}
            {fields.length > 0 ? (
                <div className="space-y-1 mb-2">
                    <div className="text-xs font-medium text-gray-500 px-2 py-1">Schema Fields:</div>
                    {fields.map((field) => (
                        <ManualField
                            key={field.id}
                            field={field}
                            onFieldToggle={handleFieldToggle}
                            selectedFields={selectedFields}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-3 text-gray-500 text-xs">
                    No schema defined. Click edit to import JSON data or add manual fields.
                </div>
            )}
        </div>
    );
};

export default SourceNode;
