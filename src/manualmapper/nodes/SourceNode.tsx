import React, { useState, useEffect } from 'react';
import { Handle, Position, useStore, NodeResizer } from '@xyflow/react';
import { Database, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNodeDataSync } from '../../hooks/useNodeDataSync';
import NodeEditSheet from '../ui/NodeEditSheet';
import JsonImportDialog from '../components/JsonImportDialog';
import { FormatSelector } from '../components/FormatSelector';
import { FieldRenderer, SchemaField } from '../components/FieldRenderer';

interface SourceNodeData {
    label: string;
    fields?: SchemaField[];
    data?: any[];
    initialExpandedFields?: Set<string>;
}

const SourceNode: React.FC<{ id: string; data: SourceNodeData; selected?: boolean }> = ({ id, data, selected }) => {
    const [fields, setFields] = useState<SchemaField[]>(data.fields || []);
    const [nodeData, setNodeData] = useState<any[]>(data.data || []);
    const [jsonInput, setJsonInput] = useState('');
    const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
    const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
    const [showFormatSelector, setShowFormatSelector] = useState(false);

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

    // No auto-expand during rendering - only use initialExpandedFields from import

    // No auto-expand during rendering - fields only expand manually or from import

    // Use the sync hook for data persistence
    useNodeDataSync(id, { 
        label: data.label, 
        fields: fields,
        data: nodeData
    }, [fields, nodeData]); // Add explicit dependencies

    console.log(`SOURCE NODE ${id} - Current fields:`, fields.length, fields.map(f => ({ id: f.id, name: f.name })));

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
        
        const processObject = (obj: any, parentPath: string[] = []): SchemaField[] => {
            const processedFields: SchemaField[] = [];
            
            Object.entries(obj).forEach(([key, value]) => {
                const currentPath = [...parentPath, key];
                // Use the actual field path as the ID for proper data access
                const fieldId = currentPath.join('.');
                
                const field: SchemaField = {
                    id: fieldId,
                    name: key,
                    type: getFieldType(value),
                    path: currentPath
                };
                
                if (field.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
                    field.children = processObject(value, currentPath);
                } else if (field.type === 'array' && Array.isArray(value) && value.length > 0) {
                    if (typeof value[0] === 'object' && value[0] !== null) {
                        // For array items, include array notation in the schema
                        field.children = processObject(value[0], [...currentPath, '[0]']);
                    }
                }
                
                processedFields.push(field);
            });
            
            return processedFields;
        };
        
        return processObject(sampleObject);
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

    const handleFieldExpansionToggle = (fieldId: string) => {
        const newExpanded = new Set(expandedFields);
        
        if (expandedFields.has(fieldId)) {
            newExpanded.delete(fieldId);
        } else {
            newExpanded.add(fieldId);
        }
        
        setExpandedFields(newExpanded);
    };

    const addField = (parentId?: string) => {
        const newField: SchemaField = {
            id: `field-${Date.now()}`,
            name: 'New Field',
            type: 'string'
        };
        
        if (parentId) {
            // Add as child field
            const updatedFields = fields.map(field => {
                if (field.id === parentId) {
                    return {
                        ...field,
                        children: [...(field.children || []), newField]
                    };
                }
                return field;
            });
            setFields(updatedFields);
        } else {
            // Add as root field
            setFields([...fields, newField]);
        }
    };

    const updateField = (fieldId: string, updates: Partial<SchemaField>) => {
        const updateFieldRecursive = (fieldsArray: SchemaField[]): SchemaField[] => {
            return fieldsArray.map(field => {
                if (field.id === fieldId) {
                    const updatedField = { ...field, ...updates };
                    // If changing to object/array, ensure children array exists
                    if ((updates.type === 'object' || updates.type === 'array') && !updatedField.children) {
                        updatedField.children = [];
                    }
                    // If changing away from object/array, remove children
                    if (updates.type && updates.type !== 'object' && updates.type !== 'array') {
                        delete updatedField.children;
                    }
                    return updatedField;
                }
                if (field.children) {
                    return {
                        ...field,
                        children: updateFieldRecursive(field.children)
                    };
                }
                return field;
            });
        };
        
        setFields(updateFieldRecursive(fields));
    };

    const updateFieldValue = (fieldId: string, value: string) => {
        const updateFieldRecursive = (fieldsArray: SchemaField[]): SchemaField[] => {
            return fieldsArray.map(field => {
                if (field.id === fieldId) {
                    return { ...field, value };
                }
                if (field.children) {
                    return {
                        ...field,
                        children: updateFieldRecursive(field.children)
                    };
                }
                return field;
            });
        };
        
        setFields(updateFieldRecursive(fields));
    };

    const deleteField = (fieldId: string) => {
        const deleteFieldRecursive = (fieldsArray: SchemaField[]): SchemaField[] => {
            return fieldsArray.filter(field => {
                if (field.id === fieldId) {
                    return false;
                }
                if (field.children) {
                    field.children = deleteFieldRecursive(field.children);
                }
                return true;
            });
        };
        
        setFields(deleteFieldRecursive(fields));
    };

    const renderFieldEditor = (field: SchemaField, level = 0) => (
        <div key={field.id} className="border rounded p-3 space-y-2" style={{ marginLeft: `${level * 16}px` }}>
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
                {(field.type === 'object' || field.type === 'array') && (
                    <button
                        onClick={() => addField(field.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                        <Plus className="w-3 h-3" />
                        Add Child
                    </button>
                )}
                <button
                    onClick={() => deleteField(field.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
            
            {/* Manual value input - only for primitive types */}
            {field.type !== 'object' && field.type !== 'array' && (
                <div>
                    <label className="block text-xs font-medium mb-1">Value:</label>
                    {field.type === 'boolean' ? (
                        <select
                            value={field.value || ''}
                            onChange={(e) => updateField(field.id, { value: e.target.value })}
                            className="w-full border rounded px-2 py-1 text-sm"
                        >
                            <option value="">Select...</option>
                            <option value="true">true</option>
                            <option value="false">false</option>
                        </select>
                    ) : (
                        <input
                            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                            value={field.value || ''}
                            onChange={(e) => updateField(field.id, { value: e.target.value })}
                            className="w-full border rounded px-2 py-1 text-sm"
                            placeholder={`Enter ${field.type} value`}
                        />
                    )}
                </div>
            )}
            
            {field.children && field.children.map(childField => 
                renderFieldEditor(childField, level + 1)
            )}
        </div>
    );

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-[500px] max-w-[600px] relative">
            <NodeResizer minWidth={400} minHeight={200} />
            
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 bg-blue-50">
                <Database className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-gray-900 flex-1">{data.label}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                    source
                </span>
                
                <NodeEditSheet title={`Edit ${data.label} - Source Schema`}>
                    <div className="flex-1 flex flex-col space-y-6 mt-6 min-h-0">
                        {/* Current Data Preview */}
                        <div className="flex-shrink-0">
                            <h4 className="font-medium mb-2">Current Data ({nodeData.length} records):</h4>
                            <div className="h-64 border rounded p-2 bg-gray-50">
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
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium">Schema Fields:</h4>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowFormatSelector(true)}
                                        className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                    >
                                        Import Data
                                    </button>
                                    <JsonImportDialog
                                        jsonInput={jsonInput}
                                        setJsonInput={setJsonInput}
                                        onImport={handleJsonImport}
                                        triggerText="JSON Only"
                                        title="Import JSON Data"
                                    />
                                    <button
                                        onClick={() => addField()}
                                        className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Field
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 border rounded min-h-0 bg-gray-50">
                                <ScrollArea className="h-full">
                                    <div className="space-y-4 p-4">
                                        {fields.length > 0 ? (
                                            fields.map((field) => renderFieldEditor(field))
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                No fields defined. Click "Add Field" to create your first field.
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    </div>
                </NodeEditSheet>
            </div>

            <FormatSelector
                open={showFormatSelector}
                onOpenChange={setShowFormatSelector}
                onDataParsed={(parsedData) => {
                    setNodeData(parsedData);
                    if (parsedData.length > 0) {
                        const generatedFields = generateFieldsFromData(parsedData[0]);
                        setFields(generatedFields);
                    }
                }}
            />

            <div className="p-1">
                {hasFields ? (
                    fields.map((field) => (
                    <FieldRenderer
                        key={field.id}
                        field={field}
                        expandedFields={expandedFields}
                        onFieldExpansionToggle={handleFieldExpansionToggle}
                        selectedFields={selectedFields}
                        onFieldToggle={handleFieldToggle}
                        sampleData={nodeData}
                        handleType="source"
                        handlePosition={Position.Right}
                        nodeId={id}
                        onFieldValueUpdate={updateFieldValue}
                    />
                    ))
                ) : (
                    <div className="text-center py-3 text-gray-500 text-xs">
                        No schema fields defined. Import JSON or add fields manually.
                    </div>
                )}
            </div>
        </div>
    );
};

export default SourceNode;