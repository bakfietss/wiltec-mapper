
import React, { useState, useEffect } from 'react';
import { NodeResizer, Position } from '@xyflow/react';
import { Database, Plus } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useNodeDataSync } from '../../hooks/useNodeDataSync';
import NodeEditSheet from '../NodeEditSheet';
import JsonImportDialog from '../JsonImportDialog';
import DataEditor from '../DataEditor';
import GenericSchemaRenderer, { SchemaField } from '../common/GenericSchemaRenderer';
import { useSchemaDataHandler } from '../../hooks/useSchemaDataHandler';
import { Separator } from '../ui/separator';

interface SourceNodeData {
    label: string;
    fields: SchemaField[];
    data?: any[];
}

const SourceNode: React.FC<{ data: SourceNodeData; id: string }> = ({ data, id }) => {
    const [jsonInput, setJsonInput] = useState('');
    
    const schemaHandler = useSchemaDataHandler(data.fields || [], data.data || []);
    
    // Sync local state changes back to React Flow
    useNodeDataSync(id, { fields: schemaHandler.fields, data: schemaHandler.data }, [schemaHandler.fields, schemaHandler.data]);
    
    console.log('=== SOURCE NODE RENDER ===');
    console.log('Node ID:', id);
    console.log('Initial fields:', data.fields?.length || 0);
    console.log('Initial data:', data.data?.length || 0);
    console.log('Generated fields:', schemaHandler.fields?.length || 0);
    console.log('All fields:', schemaHandler.fields?.map(f => ({ id: f.id, name: f.name })));

    const handleJsonImport = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            schemaHandler.importJsonData(parsed);
            setJsonInput('');
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
                    onChange={(e) => schemaHandler.updateField(field.id, { name: e.target.value })}
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    placeholder="Field name"
                />
                <select
                    value={field.type}
                    onChange={(e) => schemaHandler.updateField(field.id, { type: e.target.value as any })}
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
                        onClick={() => schemaHandler.addField(field.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                        <Plus className="w-3 h-3" />
                        Add Child
                    </button>
                )}
                <button
                    onClick={() => schemaHandler.deleteField(field.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                >
                    <Plus className="w-3 h-3 rotate-45" />
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
            
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 bg-blue-50">
                <Database className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-gray-900 flex-1">{data.label}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                    source
                </span>
                
                <NodeEditSheet title={`Edit ${data.label} - Source Schema & Data`}>
                    <div className="flex-1 flex flex-col space-y-6 mt-6 min-h-0">
                        {/* Schema Fields Management */}
                        <div className="flex-shrink-0">
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
                                        onClick={() => schemaHandler.addField()}
                                        className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Field
                                    </button>
                                </div>
                            </div>
                            
                            <div className="h-48 border rounded bg-gray-50">
                                <ScrollArea className="h-full">
                                    <div className="space-y-4 p-4">
                                        {schemaHandler.fields.length > 0 ? (
                                            schemaHandler.fields.map((field) => renderFieldEditor(field))
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                No fields defined. Click "Add Field" to create your first field.
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>

                        <Separator />

                        {/* Data Management */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <DataEditor
                                data={schemaHandler.data}
                                fields={schemaHandler.fields.filter(f => f.type !== 'object' && f.type !== 'array')}
                                onDataChange={schemaHandler.setData}
                                title="Source Data Management"
                            />
                        </div>
                    </div>
                </NodeEditSheet>
            </div>

            {/* Only show output handles for source nodes - NO INPUT HANDLES */}
            <GenericSchemaRenderer
                fields={schemaHandler.fields}
                handleType="source"
                handlePosition={Position.Right}
                emptyMessage="No fields defined. Click edit to add schema fields."
            />
        </div>
    );
};

export default SourceNode;
