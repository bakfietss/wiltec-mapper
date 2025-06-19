
import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ChevronDown, ChevronRight, Database, Edit3, Plus, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { ScrollArea } from '../components/ui/scroll-area';
import { useNodeDataSync } from '../hooks/useNodeDataSync';

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
    selectedFields: Set<string>;
    expandedFields: Set<string>;
}> = ({ path, value, level, onFieldToggle, selectedFields, expandedFields }) => {
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
                    onClick={() => onFieldToggle(path)}
                >
                    {isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-900 flex-1 min-w-0 truncate">
                        {fieldName}[]
                    </span>
                    <span className="text-xs text-gray-500">({value.length} items)</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor('array')}`}>
                        array
                    </span>
                    
                    <Handle
                        type="source"
                        position={Position.Right}
                        id={path}
                        className={`w-3 h-3 bg-blue-500 border-2 border-white group-hover:bg-blue-600 !absolute !right-1 ${
                            isSelected ? 'opacity-100' : 'opacity-30 group-hover:opacity-70'
                        }`}
                        style={{
                            top: '50%',
                            transform: 'translateY(-50%)',
                        }}
                    />
                </div>
                
                {isExpanded && value.map((item, index) => (
                    <DataField
                        key={`${path}[${index}]`}
                        path={`${path}[${index}]`}
                        value={item}
                        level={level + 1}
                        onFieldToggle={onFieldToggle}
                        selectedFields={selectedFields}
                        expandedFields={expandedFields}
                    />
                ))}
            </div>
        );
    }
    
    if (value && typeof value === 'object') {
        return (
            <div>
                <div 
                    className={`flex items-center gap-2 py-1 px-2 pr-8 hover:bg-gray-50 rounded text-sm group cursor-pointer relative ${
                        isSelected ? 'bg-blue-50' : ''
                    }`}
                    style={{ paddingLeft: `${8 + level * 12}px` }}
                    onClick={() => onFieldToggle(path)}
                >
                    {isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-900 flex-1 min-w-0 truncate">
                        {fieldName}
                    </span>
                    <span className="text-xs text-gray-500">
                        ({Object.keys(value).length} fields)
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor('object')}`}>
                        object
                    </span>
                    
                    <Handle
                        type="source"
                        position={Position.Right}
                        id={path}
                        className={`w-3 h-3 bg-blue-500 border-2 border-white group-hover:bg-blue-600 !absolute !right-1 ${
                            isSelected ? 'opacity-100' : 'opacity-30 group-hover:opacity-70'
                        }`}
                        style={{
                            top: '50%',
                            transform: 'translateY(-50%)',
                        }}
                    />
                </div>
                
                {isExpanded && Object.entries(value).map(([key, val]) => (
                    <DataField
                        key={`${path}.${key}`}
                        path={`${path}.${key}`}
                        value={val}
                        level={level + 1}
                        onFieldToggle={onFieldToggle}
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
            <span className="font-medium text-gray-900 flex-1 min-w-0 truncate">{fieldName}</span>
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
                    isSelected ? 'opacity-100' : 'opacity-30 group-hover:opacity-70'
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
    const [fields, setFields] = useState<SchemaField[]>(data.fields || []);
    const [nodeData, setNodeData] = useState<any[]>(data.data || []);
    const [jsonInput, setJsonInput] = useState('');
    const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
    const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

    // Sync local state changes back to React Flow
    useNodeDataSync(id, { fields, data: nodeData }, [fields, nodeData]);

    const { label } = data;

    // Check if we have data to show
    const hasData = nodeData.length > 0 && nodeData[0];

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
    };

    const handleJsonImport = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            const dataArray = Array.isArray(parsed) ? parsed : [parsed];
            setNodeData(dataArray);
            setJsonInput('');
            
            // Clear existing selections when new data is imported
            setSelectedFields(new Set());
            setExpandedFields(new Set());
            setFields([]);
        } catch (error) {
            console.error('Invalid JSON:', error);
            alert('Invalid JSON format');
        }
    };

    const handleFieldToggle = (path: string) => {
        const newSelected = new Set(selectedFields);
        const newExpanded = new Set(expandedFields);
        
        if (selectedFields.has(path)) {
            // Deselect
            newSelected.delete(path);
            setFields(prev => prev.filter(f => f.name !== path));
        } else {
            // Select
            newSelected.add(path);
            
            // Get value for type detection
            const value = getValueAtPath(nodeData[0], path);
            const fieldType = Array.isArray(value) ? 'array' :
                           value && typeof value === 'object' ? 'object' :
                           typeof value === 'number' ? 'number' :
                           typeof value === 'boolean' ? 'boolean' : 'string';
            
            const newField: SchemaField = {
                id: `field-${Date.now()}`,
                name: path,
                type: fieldType,
                exampleValue: fieldType === 'object' || fieldType === 'array' ? undefined : value
            };
            setFields(prev => [...prev, newField]);
        }
        
        // Toggle expansion for objects and arrays
        if (expandedFields.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        
        setSelectedFields(newSelected);
        setExpandedFields(newExpanded);
    };

    const getValueAtPath = (obj: any, path: string) => {
        try {
            const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
            const keys = normalizedPath.split('.');
            let value = obj;
            for (const key of keys) {
                if (value && typeof value === 'object') {
                    value = value[key];
                } else {
                    return undefined;
                }
            }
            return value;
        } catch (e) {
            return undefined;
        }
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
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-80 max-w-none w-auto">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 bg-blue-50">
                <Database className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-gray-900 flex-1">{data.label}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                    source
                </span>
                
                <Sheet>
                    <SheetTrigger asChild>
                        <button className="p-1 hover:bg-gray-200 rounded">
                            <Edit3 className="w-3 h-3 text-gray-600" />
                        </button>
                    </SheetTrigger>
                    <SheetContent className="w-[700px] sm:w-[700px] flex flex-col">
                        <SheetHeader>
                            <SheetTitle>Configure Source: {label}</SheetTitle>
                        </SheetHeader>

                        {/* JSON Data Import */}
                        <div className="flex-shrink-0">
                            <h4 className="font-medium mb-2">Import JSON Data:</h4>
                            <textarea
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                                className="w-full h-24 border border-gray-300 rounded-md p-2 text-sm font-mono resize-none"
                                placeholder='{"field1": "value1", "field2": 123}'
                            />
                            <button
                                onClick={handleJsonImport}
                                className="mt-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Import Data
                            </button>
                        </div>

                        {/* Current Data Preview */}
                        <div className="flex-shrink-0">
                            <h4 className="font-medium mb-2">Current Data ({nodeData.length} records):</h4>
                            <div className="h-32 border rounded p-2 bg-gray-50">
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

                        {/* Manual Field Configuration */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">Manual Schema Fields:</h4>
                                <button
                                    onClick={addField}
                                    className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                >
                                    <Plus className="w-3 h-3" />
                                    Add Field
                                </button>
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
                    </SheetContent>
                </Sheet>
            </div>

            <div className="p-1">
                {/* Data Structure Display */}
                {hasData ? (
                    <div className="space-y-1">
                        {Object.entries(nodeData[0]).map(([key, value]) => (
                            <DataField
                                key={key}
                                path={key}
                                value={value}
                                level={0}
                                onFieldToggle={handleFieldToggle}
                                selectedFields={selectedFields}
                                expandedFields={expandedFields}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-3 text-gray-500 text-xs">
                        No data available. Click edit to import JSON data.
                    </div>
                )}
            </div>
        </div>
    );
};

export default SourceNode;
