
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

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
        // Import flatten utility for XML processing
        const { flattenXmlData } = await import('../utils/flatten');
        data = flattenXmlData(text);
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
      'application/xml': ['.xml'],
      'text/xml': ['.xml'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    disabled: isLoading
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      
      <div className="space-y-4">
        <div className="mx-auto w-12 h-12 text-gray-400">
          {isLoading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          ) : (
            <Upload className="w-full h-full" />
          )}
        </div>
        
        <div>
          <div className="text-lg font-medium text-gray-900">
            {title}
            {optional && <span className="text-sm text-gray-500 ml-2">(Optional)</span>}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {description}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            Supported: {acceptedTypes.join(', ')}
          </div>
        </div>

        <Button variant="outline" size="sm" disabled={isLoading}>
          <File className="h-4 w-4 mr-2" />
          {isLoading ? 'Processing...' : 'Choose File'}
        </Button>
      </div>
    </div>
  );
};

export default DataUploadZone;
