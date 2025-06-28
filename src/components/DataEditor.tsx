
import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

interface DataRow {
  [key: string]: any;
}

interface DataEditorProps {
  data: DataRow[];
  fields: Array<{ id: string; name: string; type: string }>;
  onDataChange: (newData: DataRow[]) => void;
  title?: string;
}

const DataEditor: React.FC<DataEditorProps> = ({
  data,
  fields,
  onDataChange,
  title = "Data Editor"
}) => {
  const [newRowValues, setNewRowValues] = useState<Record<string, any>>({});

  const addNewRow = () => {
    const newRow: DataRow = {};
    fields.forEach(field => {
      newRow[field.name] = newRowValues[field.name] || getDefaultValue(field.type);
    });
    
    onDataChange([...data, newRow]);
    setNewRowValues({});
  };

  const updateRow = (rowIndex: number, fieldName: string, value: any) => {
    const updatedData = [...data];
    updatedData[rowIndex] = { ...updatedData[rowIndex], [fieldName]: value };
    onDataChange(updatedData);
  };

  const deleteRow = (rowIndex: number) => {
    const updatedData = data.filter((_, index) => index !== rowIndex);
    onDataChange(updatedData);
  };

  const getDefaultValue = (type: string) => {
    switch (type) {
      case 'number': return 0;
      case 'boolean': return false;
      case 'date': return new Date().toISOString().split('T')[0];
      default: return '';
    }
  };

  const formatValue = (value: any, type: string) => {
    if (type === 'boolean') return value ? 'true' : 'false';
    if (type === 'date' && value) return value.split('T')[0];
    return String(value || '');
  };

  const parseValue = (value: string, type: string) => {
    switch (type) {
      case 'number': return parseFloat(value) || 0;
      case 'boolean': return value === 'true' || value === '1';
      case 'date': return value;
      default: return value;
    }
  };

  if (fields.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No fields defined. Add schema fields first to manage data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{title}</h4>
        <span className="text-sm text-gray-500">{data.length} records</span>
      </div>

      {/* Add New Row Form */}
      <div className="border rounded-lg p-3 bg-gray-50">
        <h5 className="font-medium mb-3 text-sm">Add New Record</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
          {fields.map(field => (
            <div key={field.id} className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                {field.name} ({field.type})
              </label>
              <Input
                type={field.type === 'number' ? 'number' : 
                     field.type === 'date' ? 'date' : 'text'}
                value={formatValue(newRowValues[field.name] || '', field.type)}
                onChange={(e) => setNewRowValues(prev => ({
                  ...prev,
                  [field.name]: parseValue(e.target.value, field.type)
                }))}
                placeholder={`Enter ${field.name}`}
                className="text-sm"
              />
            </div>
          ))}
        </div>
        <Button onClick={addNewRow} size="sm" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Record
        </Button>
      </div>

      {/* Data Table */}
      <div className="border rounded-lg">
        <ScrollArea className="h-64">
          {data.length > 0 ? (
            <div className="space-y-2 p-3">
              {data.map((row, rowIndex) => (
                <div key={rowIndex} className="border rounded p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      Record #{rowIndex + 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteRow(rowIndex)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {fields.map(field => (
                      <div key={field.id} className="space-y-1">
                        <label className="text-xs text-gray-600">{field.name}</label>
                        <Input
                          type={field.type === 'number' ? 'number' : 
                               field.type === 'date' ? 'date' : 'text'}
                          value={formatValue(row[field.name], field.type)}
                          onChange={(e) => updateRow(
                            rowIndex, 
                            field.name, 
                            parseValue(e.target.value, field.type)
                          )}
                          className="text-sm h-8"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <p className="text-sm">No data records. Add your first record above.</p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default DataEditor;
