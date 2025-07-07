import React, { useState, useEffect } from 'react';
import { NodeResizer, Position } from '@xyflow/react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useNodeDataSync } from '../../hooks/useNodeDataSync';
import NodeEditSheet from './NodeEditSheet';
import JsonImportDialog from './JsonImportDialog';
import { FieldRenderer, SchemaField } from './shared/FieldRenderer';

interface TargetNodeData {
    label: string;
    fields: SchemaField[];
    data?: any[];
    fieldValues?: Record<string, any>;
}

// Removed TargetField component - now using shared FieldRenderer

const TargetNode: React.FC<{ data: TargetNodeData; id: string }> = ({ data, id }) => {
    const [fields, setFields] = useState<SchemaField[]>(data.fields || []);
    const [nodeData, setNodeData] = useState<any[]>(data.data || []);
    const [jsonInput, setJsonInput] = useState('');
    const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
    
    // Use ONLY the centralized field values from data.fieldValues (set by the centralized system)
    const fieldValues = data.fieldValues || {};
    
    // Sync local state changes back to React Flow
    useNodeDataSync(id, { fields, data: nodeData }, [fields, nodeData]);
    
    // Auto-expand fields that have values or connections
    useEffect(() => {
        const shouldExpand = (field: SchemaField): boolean => {
            // Check if this field has a value
            if (fieldValues[field.id] !== undefined && fieldValues[field.id] !== null && fieldValues[field.id] !== '') {
                return true;
            }
            
            // Check if any child field has a value (recursive)
            if (field.children) {
                return field.children.some(child => shouldExpand(child));
            }
            
            return false;
        };
        
        const newExpanded = new Set(expandedFields);
        let hasChanges = false;
        
        const checkFieldRecursive = (fieldsArray: SchemaField[]) => {
            fieldsArray.forEach(field => {
                if ((field.type === 'object' || field.type === 'array') && shouldExpand(field)) {
                    if (!newExpanded.has(field.id)) {
                        newExpanded.add(field.id);
                        hasChanges = true;
                    }
                }
                if (field.children) {
                    checkFieldRecursive(field.children);
                }
            });
        };
        
        checkFieldRecursive(fields);
        
        if (hasChanges) {
            setExpandedFields(newExpanded);
        }
    }, [fieldValues, fields, expandedFields]);
    
    console.log('=== TARGET NODE RENDER ===');
    console.log('Node ID:', id);
    console.log('Field values from centralized system:', fieldValues);
    console.log('All fields:', fields?.map(f => ({ id: f.id, name: f.name, groupBy: f.groupBy })));

    const addField = (parentId?: string) => {
        const newField: SchemaField = {
            id: `field-${Date.now()}`,
            name: 'New Field',
            type: 'string',
            parent: parentId
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
                    // If changing away from object/array, remove children and groupBy
                    if (updates.type && updates.type !== 'object' && updates.type !== 'array') {
                        delete updatedField.children;
                        delete updatedField.groupBy;
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

    const handleFieldExpansionToggle = (fieldId: string) => {
        const newExpanded = new Set(expandedFields);
        if (expandedFields.has(fieldId)) {
            newExpanded.delete(fieldId);
        } else {
            newExpanded.add(fieldId);
        }
        setExpandedFields(newExpanded);
    };

    const handleJsonImport = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            const dataArray = Array.isArray(parsed) ? parsed : [parsed];
            setNodeData(dataArray);
            setJsonInput('');
            
            // Auto-generate fields from first object
            if (dataArray.length > 0 && typeof dataArray[0] === 'object') {
                const generateFieldsFromObject = (obj: any, parentPath = ''): SchemaField[] => {
                    return Object.keys(obj).map((key, index) => {
                        const value = obj[key];
                        const fieldId = `field-${Date.now()}-${parentPath}-${index}`;
                        
                        if (Array.isArray(value)) {
                            return {
                                id: fieldId,
                                name: key,
                                type: 'array',
                                children: value.length > 0 && typeof value[0] === 'object' 
                                    ? generateFieldsFromObject(value[0], `${fieldId}-item`)
                                    : []
                            };
                        } else if (value && typeof value === 'object') {
                            return {
                                id: fieldId,
                                name: key,
                                type: 'object',
                                children: generateFieldsFromObject(value, fieldId)
                            };
                        } else {
                            return {
                                id: fieldId,
                                name: key,
                                type: typeof value === 'number' ? 'number' : 
                                      typeof value === 'boolean' ? 'boolean' : 'string'
                            };
                        }
                    });
                };
                
                setFields(generateFieldsFromObject(dataArray[0]));
            }
        } catch (error) {
            console.error('Invalid JSON:', error);
            alert('Invalid JSON format');
        }
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
                {field.type === 'array' && (
                    <select
                        value={field.groupBy || ''}
                        onChange={(e) => updateField(field.id, { groupBy: e.target.value || undefined })}
                        className="border rounded px-2 py-1 text-sm bg-blue-50"
                    >
                        <option value="">No grouping</option>
                        {field.children?.map(child => (
                            <option key={child.id} value={child.name}>{child.name}</option>
                        ))}
                    </select>
                )}
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
            
            {field.children && field.children.map(childField => 
                renderFieldEditor(childField, level + 1)
            )}
        </div>
    );

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-[500px] max-w-[600px] relative">
            <NodeResizer minWidth={400} minHeight={200} />
            
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 bg-green-50">
                <FileText className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-gray-900 flex-1">{data.label}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                    target
                </span>
                
                <NodeEditSheet title={`Edit ${data.label} - Target Schema`}>
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
                                    <JsonImportDialog
                                        jsonInput={jsonInput}
                                        setJsonInput={setJsonInput}
                                        onImport={handleJsonImport}
                                        triggerText="Import JSON"
                                        title="Import Data & Generate Schema"
                                    />
                                    <button
                                        onClick={() => addField()}
                                        className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600"
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

            <div className="p-1">
                {fields.map((field) => (
                    <FieldRenderer
                        key={field.id}
                        field={field}
                        fieldValues={fieldValues}
                        expandedFields={expandedFields}
                        onFieldExpansionToggle={handleFieldExpansionToggle}
                        onFieldUpdate={updateField}
                        handleType="target"
                        handlePosition={Position.Left}
                        nodeId={id}
                    />
                ))}
                
                {fields.length === 0 && (
                    <div className="text-center py-3 text-gray-500 text-xs">
                        No fields defined. Click edit to add schema fields.
                    </div>
                )}
            </div>
        </div>
    );
};

export default TargetNode;
