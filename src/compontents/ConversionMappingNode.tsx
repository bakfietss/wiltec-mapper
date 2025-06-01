import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ChevronDown, ChevronRight, Plus, Upload, Edit3 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';

interface MappingRule {
  id: string;
  from: string;
  to: string;
}

interface ConversionMappingNodeData {
  label: string;
  mappings: MappingRule[];
  isExpanded: boolean;
  headers?: { from: string; to: string };
}

const ConversionMappingNode: React.FC<{ data: ConversionMappingNodeData; id: string }> = ({ data, id }) => {
  const { setNodes } = useReactFlow();
  const [isExpanded, setIsExpanded] = useState(data.isExpanded || false);
  const [mappings, setMappings] = useState<MappingRule[]>(data.mappings || []);
  const [headers, setHeaders] = useState<{ from: string; to: string } | undefined>(data.headers);

  // Update node data whenever mappings change
  useEffect(() => {
    console.log('Updating node data with mappings:', mappings);
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                mappings: mappings,
                headers: headers,
              },
            }
          : node
      )
    );
  }, [mappings, headers, id, setNodes]);

  const addMapping = () => {
    const newMapping: MappingRule = {
      id: `mapping-${Date.now()}`,
      from: '',
      to: '',
    };
    setMappings([...mappings, newMapping]);
  };

  const updateMapping = (index: number, field: keyof MappingRule, value: string) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], [field]: value };
    setMappings(updated);
  };

  const deleteMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      alert('Please select an Excel (.xlsx) file');
      event.target.value = '';
      return;
    }

    try {
      const XLSX = await import('xlsx');
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const jsonData: string[][] = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            defval: '' 
          });
          
          if (jsonData.length === 0) {
            alert('Empty Excel file');
            return;
          }
          
          const headerRow = jsonData[0] || [];
          if (headerRow.length >= 2) {
            setHeaders({
              from: headerRow[0]?.toString() || 'From',
              to: headerRow[1]?.toString() || 'To'
            });
          }
          
          const dataRows = jsonData.slice(1).filter(row => 
            row.some(cell => cell && cell.toString().trim())
          );
          
          const importedMappings: MappingRule[] = dataRows.map((row, index) => {
            const from = row[0]?.toString().trim() || '';
            const to = row[1]?.toString().trim() || '';
            
            return {
              id: `imported-${Date.now()}-${index}`,
              from,
              to,
            };
          }).filter(mapping => mapping.from && mapping.to);
          
          setMappings([...mappings, ...importedMappings]);
          console.log(`Imported ${importedMappings.length} mappings from ${file.name}`);
          
        } catch (error) {
          console.error('Error parsing Excel file:', error);
          alert('Error reading Excel file. Please check the format.');
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error importing Excel file:', error);
      alert('Error importing Excel file');
    }
    
    event.target.value = '';
  };

  return (
    <div className="bg-white border-2 border-purple-300 rounded-lg shadow-sm min-w-64 max-w-80 relative">
      {/* Input handle for receiving data from source nodes */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 bg-purple-500 border-2 border-white hover:bg-purple-600"
        style={{ left: '-6px' }}
      />

      <div className="px-4 py-3 border-b border-purple-200 bg-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-purple-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-purple-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-purple-600" />
              )}
            </button>
            <span className="font-semibold text-purple-900">{data.label}</span>
          </div>
          <div className="flex items-center gap-1">
            <Sheet>
              <SheetTrigger asChild>
                <button className="p-1 hover:bg-purple-200 rounded">
                  <Edit3 className="w-3 h-3 text-purple-600" />
                </button>
              </SheetTrigger>
              <SheetContent className="w-[500px] sm:w-[500px]">
                <SheetHeader>
                  <SheetTitle>Edit Mapping Rules - {data.label}</SheetTitle>
                </SheetHeader>
                
                <div className="mt-6 space-y-4">
                  {headers && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="text-sm font-medium text-blue-900 mb-2">Excel Headers:</div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="bg-blue-100 px-2 py-1 rounded">{headers.from}</span>
                        <span className="text-blue-600">→</span>
                        <span className="bg-blue-100 px-2 py-1 rounded">{headers.to}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={addMapping}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      <Plus className="w-4 h-4" />
                      Add Rule
                    </button>
                    
                    <label className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      Import Excel
                      <input
                        type="file"
                        accept=".xlsx"
                        onChange={handleFileImport}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="text-xs text-gray-600 mb-4">
                    💡 Import tip: First row will be treated as header. Only Excel (.xlsx) files are supported.
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 font-medium text-sm border-b">
                      <div className="grid grid-cols-3 gap-4">
                        <span>{headers?.from || 'From Value'}</span>
                        <span>{headers?.to || 'To Value'}</span>
                        <span>Actions</span>
                      </div>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                      {mappings.map((mapping, index) => (
                        <div key={mapping.id} className="px-4 py-2 border-b hover:bg-gray-50">
                          <div className="grid grid-cols-3 gap-4 items-center">
                            <input
                              type="text"
                              value={mapping.from}
                              onChange={(e) => updateMapping(index, 'from', e.target.value)}
                              className="border rounded px-2 py-1 text-sm w-full"
                              placeholder="Source value"
                            />
                            <input
                              type="text"
                              value={mapping.to}
                              onChange={(e) => updateMapping(index, 'to', e.target.value)}
                              className="border rounded px-2 py-1 text-sm w-full"
                              placeholder="Target value"
                            />
                            <button
                              onClick={() => deleteMapping(index)}
                              className="text-red-500 hover:text-red-700 text-sm px-2 py-1"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {mappings.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No mapping rules yet. Add some rules or import from Excel file.
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            
            <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
              {mappings.length} rules
            </span>
          </div>
        </div>
        
        {headers && !isExpanded && (
          <div className="mt-2 text-xs text-purple-700 text-center">
            <span className="font-medium">{headers.from}</span> → <span className="font-medium">{headers.to}</span>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="p-3 max-h-48 overflow-y-auto">
          {headers && (
            <div className="mb-3 p-2 bg-blue-50 rounded text-xs text-center">
              <div className="font-medium text-blue-900 mb-1">Headers:</div>
              <div className="flex items-center justify-center gap-2">
                <span className="bg-blue-100 px-2 py-1 rounded">{headers.from}</span>
                <span className="text-blue-600">→</span>
                <span className="bg-blue-100 px-2 py-1 rounded">{headers.to}</span>
              </div>
            </div>
          )}
          
          {mappings.length > 0 ? (
            <div className="space-y-1">
              {mappings.slice(0, 8).map((mapping, index) => (
                <div key={mapping.id} className="text-xs bg-gray-50 p-2 rounded text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-medium text-gray-700 truncate max-w-16" title={mapping.from}>
                      {mapping.from}
                    </span>
                    <span className="text-gray-500">→</span>
                    <span className="font-medium text-gray-900 truncate max-w-16" title={mapping.to}>
                      {mapping.to}
                    </span>
                  </div>
                </div>
              ))}
              {mappings.length > 8 && (
                <div className="text-xs text-gray-500 text-center">
                  ... and {mappings.length - 8} more rules
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-500 text-center py-4">
              No mapping rules defined. Click edit to add some.
            </div>
          )}
        </div>
      )}

      {/* Output handle for sending data to target nodes */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 bg-purple-500 border-2 border-white hover:bg-purple-600"
        style={{ right: '-6px' }}
      />
    </div>
  );
};

export default ConversionMappingNode;
