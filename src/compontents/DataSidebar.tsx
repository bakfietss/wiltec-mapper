
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Upload, Download, Database } from 'lucide-react';

interface DataSidebarProps {
  side: 'left' | 'right';
  title: string;
  data: any[];
  onDataChange: (data: any[]) => void;
}

const DataSidebar: React.FC<DataSidebarProps> = ({ side, title, data, onDataChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');

  const handleJsonImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const dataArray = Array.isArray(parsed) ? parsed : [parsed];
      onDataChange(dataArray);
      setJsonInput('');
    } catch (error) {
      console.error('Invalid JSON:', error);
      alert('Invalid JSON format');
    }
  };

  const sidebarClasses = `
    fixed top-0 ${side === 'left' ? 'left-0' : 'right-0'} h-full w-80 bg-white border-${side === 'left' ? 'r' : 'l'} border-gray-200 shadow-lg 
    transform transition-transform duration-300 z-20
    ${isOpen ? 'translate-x-0' : side === 'left' ? '-translate-x-full' : 'translate-x-full'}
  `;

  const toggleClasses = `
    absolute top-1/2 ${side === 'left' ? '-right-8' : '-left-8'} w-8 h-16 bg-white border border-gray-200 
    rounded-${side === 'left' ? 'r' : 'l'}-md cursor-pointer flex items-center justify-center hover:bg-gray-50
  `;

  return (
    <>
      <div className={sidebarClasses}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>

          {/* JSON Input */}
          <div className="p-4 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Import JSON Data:
            </label>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full h-20 border border-gray-300 rounded-md p-2 text-sm"
              placeholder='{"key": "value", ...}'
            />
            <button
              onClick={handleJsonImport}
              className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <Upload className="w-4 h-4" />
              Import JSON
            </button>
          </div>

          {/* Data Display */}
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-2">
              {data.length > 0 ? (
                data.map((item, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded border">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
                    </pre>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-sm text-center py-8">
                  No data available. Import some JSON data to get started.
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => onDataChange([])}
              className="w-full px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear Data
            </button>
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <div 
        className={toggleClasses}
        onClick={() => setIsOpen(!isOpen)}
      >
        {side === 'left' ? (
          isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
        ) : (
          isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
        )}
      </div>
    </>
  );
};

export default DataSidebar;
