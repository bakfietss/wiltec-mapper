
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

const SourceField: React.FC<{
    field: SchemaField;
    level: number;
    nodeData?: any[];
}> = ({ field, level, nodeData }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = field.children && field.children.length > 0;

    // Get the actual value for this field from node data
    const getFieldValue = () => {
        if (nodeData && nodeData.length > 0 && nodeData[0][field.name] !== undefined) {
            return nodeData[0][field.name];
        }
        return field.exampleValue;
    };

    const fieldValue = getFieldValue();

    return (
        <div className="relative">
            <div
                className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded text-sm group"
                style={{ marginLeft: `${level * 16}px` }}
            >
                {hasChildren && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
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
                {fieldValue && (
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded max-w-20 truncate">
                        {String(fieldValue)}
                    </span>
                )}
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(field.type)}`}>
                    {field.type}
                </span>

                {/* Source handles on the right */}
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
                            nodeData={nodeData}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const SourceNode: React.FC<{ data: SourceNodeData; id: string }> = ({ data, id }) => {
    const [fields, setFields] = useState<SchemaField[]>(data.fields || []);
    const [nodeData, setNodeData] = useState<any[]>(data.data || []);
    const [jsonInput, setJsonInput] = useState('');

    // Sync local state changes back to React Flow
    useNodeDataSync(id, { fields, data: nodeData }, [fields, nodeData]);

    const { label } = data;

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
            
            // Auto-generate fields from first object
            if (dataArray.length > 0 && typeof dataArray[0] === 'object') {
                const generatedFields: SchemaField[] = Object.keys(dataArray[0]).map((key, index) => ({
                    id: `field-${Date.now()}-${index}`,
                    name: key,
                    type: typeof dataArray[0][key] === 'number' ? 'number' : 
                          typeof dataArray[0][key] === 'boolean' ? 'boolean' : 'string',
                    exampleValue: dataArray[0][key]
                }));
                setFields(generatedFields);
            }
        } catch (error) {
            console.error('Invalid JSON:', error);
            alert('Invalid JSON format');
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
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-64 max-w-80">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 bg-blue-50">
                <Database className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-gray-900 flex-1">{label}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                    source
                </span>
                
                <Sheet>
                    <SheetTrigger asChild>
                        <button className="p-1 hover:bg-gray-200 rounded">
                            <Edit3 className="w-3 h-3 text-gray-600" />
                        </button>
                    </SheetTrigger>
                    <SheetContent className="w-[600px] sm:w-[600px] flex flex-col">
                        <SheetHeader>
                            <SheetTitle>Edit {label} - Source Schema</SheetTitle>
                        </SheetHeader>
                        
                        <div className="flex-1 flex flex-col space-y-4 mt-6">
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

                            {/* Schema Fields */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-medium">Schema Fields:</h4>
                                    <button
                                        onClick={addField}
                                        className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Add Field
                                    </button>
                                </div>
                                
                                <ScrollArea className="flex-1">
                                    <div className="space-y-4 pr-4">
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

            <div className="p-2 max-h-96 overflow-y-auto">
                {fields.map((field) => (
                    <SourceField
                        key={field.id}
                        field={field}
                        level={0}
                        nodeData={nodeData}
                    />
                ))}
                
                {fields.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                        No fields defined. Click edit to add schema fields.
                    </div>
                )}
            </div>
        </div>
    );
};

export default SourceNode;
