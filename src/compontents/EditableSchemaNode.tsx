
import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ChevronDown, ChevronRight, Database, FileText, Edit3, Plus, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';

interface SchemaField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  value?: any;
  exampleValue?: any;
  children?: SchemaField[];
}

interface EditableSchemaNodeData {
  label: string;
  schemaType: 'source' | 'target';
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

const SchemaField: React.FC<{ 
  field: SchemaField; 
  schemaType: 'source' | 'target'; 
  level: number;
  onEdit?: (field: SchemaField) => void;
  nodeData?: any[];
}> = ({ field, schemaType, level, onEdit, nodeData }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = field.children && field.children.length > 0;
  
  // Get the actual value for this field from node data
  const getFieldValue = () => {
    if (schemaType === 'source') {
      return nodeData?.[0]?.[field.name] || field.exampleValue;
    } else {
      // For target nodes, show the mapped value from data
      return nodeData?.[0]?.[field.name] || '';
    }
  };

  const fieldValue = getFieldValue();

  return (
    <div className="relative">
      <div 
        className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded text-sm group cursor-pointer"
        style={{ marginLeft: `${level * 16}px` }}
        onClick={() => onEdit?.(field)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
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
        
        {!hasChildren && (
          <Handle
            type={schemaType === 'source' ? 'source' : 'target'}
            position={schemaType === 'source' ? Position.Right : Position.Left}
            id={field.id}
            className="w-3 h-3 bg-blue-500 border-2 border-white group-hover:bg-blue-600"
            style={{
              right: schemaType === 'source' ? '-6px' : 'auto',
              left: schemaType === 'target' ? '-6px' : 'auto',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
        )}
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {field.children?.map((child) => (
            <SchemaField
              key={child.id}
              field={child}
              schemaType={schemaType}
              level={level + 1}
              onEdit={onEdit}
              nodeData={nodeData}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const EditableSchemaNode: React.FC<{ data: EditableSchemaNodeData; id: string }> = ({ data, id }) => {
  const [fields, setFields] = useState<SchemaField[]>(data.fields || []);
  const [nodeData, setNodeData] = useState<any[]>(data.data || []);
  const [editingField, setEditingField] = useState<SchemaField | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const { setNodes } = useReactFlow();
  
  const { label, schemaType } = data;

  // Update local state when data prop changes (for target nodes receiving mapped data)
  React.useEffect(() => {
    if (data.data !== nodeData) {
      setNodeData(data.data || []);
    }
  }, [data.data]);

  const handleFieldEdit = (field: SchemaField) => {
    setEditingField(field);
  };

  const addField = () => {
    const newField: SchemaField = {
      id: `field-${Date.now()}`,
      name: 'New Field',
      type: 'string',
      value: '',
      exampleValue: ''
    };
    const updatedFields = [...fields, newField];
    setFields(updatedFields);
    updateNodeInCanvas(updatedFields, nodeData);
  };

  const updateField = (fieldId: string, updates: Partial<SchemaField>) => {
    const updatedFields = fields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    );
    setFields(updatedFields);
    updateNodeInCanvas(updatedFields, nodeData);
  };

  const deleteField = (fieldId: string) => {
    const updatedFields = fields.filter(field => field.id !== fieldId);
    setFields(updatedFields);
    updateNodeInCanvas(updatedFields, nodeData);
  };

  const updateNodeInCanvas = (newFields: SchemaField[], newData: any[]) => {
    setNodes(nodes => 
      nodes.map(node => 
        node.id === id 
          ? { ...node, data: { ...node.data, fields: newFields, data: newData } }
          : node
      )
    );
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
          value: dataArray[0][key],
          exampleValue: dataArray[0][key]
        }));
        setFields(generatedFields);
        updateNodeInCanvas(generatedFields, dataArray);
      } else {
        updateNodeInCanvas(fields, dataArray);
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
      <div className={`px-4 py-3 border-b border-gray-200 flex items-center gap-2 ${
        schemaType === 'source' ? 'bg-blue-50' : 'bg-green-50'
      }`}>
        {schemaType === 'source' ? (
          <Database className="w-4 h-4 text-blue-600" />
        ) : (
          <FileText className="w-4 h-4 text-green-600" />
        )}
        <span className="font-semibold text-gray-900 flex-1">{label}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${
          schemaType === 'source' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
        }`}>
          {schemaType}
        </span>
        
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-1 hover:bg-gray-200 rounded">
              <Edit3 className="w-3 h-3 text-gray-600" />
            </button>
          </SheetTrigger>
          <SheetContent className="w-[600px] sm:w-[600px]">
            <SheetHeader>
              <SheetTitle>Edit {label} - {schemaType}</SheetTitle>
            </SheetHeader>
            
            <div className="mt-6 space-y-6">
              {/* JSON Data Import */}
              <div>
                <h4 className="font-medium mb-2">Import JSON Data:</h4>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="w-full h-32 border border-gray-300 rounded-md p-2 text-sm font-mono"
                  placeholder='{"field1": "value1", "field2": 123}'
                />
                <button
                  onClick={handleJsonImport}
                  className="mt-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Import Data
                </button>
              </div>

              {/* Current Data Preview - ALWAYS SHOW */}
              <div>
                <h4 className="font-medium mb-2">Current Data ({nodeData.length} records):</h4>
                <div className="max-h-40 overflow-auto border rounded p-2 bg-gray-50">
                  {nodeData.length > 0 ? (
                    <pre className="text-xs">
                      {JSON.stringify(nodeData.slice(0, 3), null, 2)}
                      {nodeData.length > 3 && '\n... and more'}
                    </pre>
                  ) : (
                    <p className="text-gray-500 text-sm">No data available</p>
                  )}
                </div>
              </div>

              {/* Schema Fields */}
              <div>
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
                
                <div className="space-y-4 max-h-60 overflow-auto">
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
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      
      <div className="p-2 max-h-96 overflow-y-auto">
        {fields.map((field) => (
          <SchemaField
            key={field.id}
            field={field}
            schemaType={schemaType}
            level={0}
            onEdit={handleFieldEdit}
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

export default EditableSchemaNode;
