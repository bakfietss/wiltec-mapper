
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

// Remove the xml2js import and use browser's DOMParser instead
const parseXML = (xmlString: string) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
  
  // Convert XML to JSON object
  const toJSON = (node: Element): any => {
    const obj: any = {};
    
    // Handle attributes
    Array.from(node.attributes).forEach(attr => {
      obj[`@${attr.name}`] = attr.value;
    });
    
    // Handle child nodes
    Array.from(node.children).forEach(child => {
      let childData = toJSON(child);
      
      if (child.children.length === 0 && !child.hasAttributes()) {
        // Text node
        childData = child.textContent;
      }
      
      if (obj[child.nodeName]) {
        if (!Array.isArray(obj[child.nodeName])) {
          obj[child.nodeName] = [obj[child.nodeName]];
        }
        obj[child.nodeName].push(childData);
      } else {
        obj[child.nodeName] = childData;
      }
    });
    
    return obj;
  };
  
  const rootElement = xmlDoc.documentElement;
  return toJSON(rootElement);
};

interface DataUploadZoneProps {
  onDataUpload: (data: any[]) => void;
  acceptedTypes: string[];
  title: string;
  description: string;
  optional?: boolean;
}

const DataUploadZone: React.FC<DataUploadZoneProps> = ({
  onDataUpload,
  acceptedTypes,
  title,
  description,
  optional = false
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true);
    
    try {
      const text = await file.text();
      let data: any[] = [];

      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        data = Array.isArray(parsed) ? parsed : [parsed];
      } else if (file.name.endsWith('.xml')) {
        try {
          const result = parseXML(text);
          data = Array.isArray(result) ? result : [result];
        } catch (xmlError) {
          console.error('XML parsing error:', xmlError);
          throw new Error('Failed to parse XML file');
        }
      } else if (file.name.endsWith('.csv')) {
        // Simple CSV parsing - you might want to use a proper CSV library
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = values[index] || '';
          });
          return obj;
        });
      } else if (file.name.endsWith('.xlsx')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheetName = workbook.SheetNames[0];
        data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      }

      if (data.length === 0) {
        throw new Error('No data found in file');
      }

      onDataUpload(data);
      toast.success(`Successfully loaded ${data.length} records`);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file. Please check the format.');
    } finally {
      setIsLoading(false);
    }
  }, [onDataUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: useCallback((acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        processFile(acceptedFiles[0]);
      }
    }, [processFile]),
    accept: {
      'application/json': ['.json'],
      'text/csv': ['.csv'],
      'application/xml': ['.xml'],  // Add XML support
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    disabled: isLoading
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      
      <div className="flex items-center justify-center gap-3">
        <div className="text-gray-400">
          {isLoading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
          ) : (
            <Upload className="h-6 w-6" />
          )}
        </div>
        
        <div className="text-sm">
          <span className="font-medium">{title}</span>
          {optional && <span className="text-xs text-gray-500 ml-2">(Optional)</span>}
          <div className="text-xs text-gray-400">
            Supported: {acceptedTypes.join(', ')}
          </div>
        </div>

        <Button variant="outline" size="sm" disabled={isLoading}>
          {isLoading ? 'Processing...' : 'Choose File'}
        </Button>
      </div>
    </div>
  );
};

export default DataUploadZone;
