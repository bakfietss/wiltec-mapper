import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, FileSpreadsheet, FileCode, FileType, Upload } from 'lucide-react';
import Papa from 'papaparse';
import { XMLParser } from 'fast-xml-parser';
import { supabase } from '@/integrations/supabase/client';

interface FormatSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataParsed: (jsonData: any[]) => void;
}

type DataFormat = 'json' | 'csv' | 'xml' | 'edi' | 'text';

const formatOptions = [
  {
    type: 'json' as DataFormat,
    name: 'JSON',
    description: 'JavaScript Object Notation',
    icon: FileCode,
    color: 'bg-blue-500'
  },
  {
    type: 'csv' as DataFormat,
    name: 'CSV',
    description: 'Comma Separated Values',
    icon: FileSpreadsheet,
    color: 'bg-green-500'
  },
  {
    type: 'xml' as DataFormat,
    name: 'XML',
    description: 'eXtensible Markup Language',
    icon: FileText,
    color: 'bg-orange-500'
  },
  {
    type: 'edi' as DataFormat,
    name: 'EDI',
    description: 'Electronic Data Interchange (X12/EDIFACT)',
    icon: FileType,
    color: 'bg-purple-500'
  },
  {
    type: 'text' as DataFormat,
    name: 'TEXT',
    description: 'Fixed-width or delimited text',
    icon: FileText,
    color: 'bg-gray-500'
  }
];

export function FormatSelector({ open, onOpenChange, onDataParsed }: FormatSelectorProps) {
  const [selectedFormat, setSelectedFormat] = useState<DataFormat | null>(null);
  const [inputData, setInputData] = useState('');
  const [csvDelimiter, setCsvDelimiter] = useState(',');
  const [textDelimiter, setTextDelimiter] = useState('\t');
  const [parseError, setParseError] = useState<string | null>(null);

  const parseCSV = (data: string): any[] => {
    try {
      const result = Papa.parse(data, {
        header: true,
        delimiter: csvDelimiter,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
      });
      
      if (result.errors.length > 0) {
        throw new Error(result.errors[0].message);
      }
      
      return result.data;
    } catch (error) {
      throw new Error(`CSV Parse Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const parseXML = (data: string): any[] => {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        parseAttributeValue: true
      });
      
      const parsed = parser.parse(data);
      
      // Try to find array-like structures in the XML
      const findArrays = (obj: any): any[] => {
        if (Array.isArray(obj)) return obj;
        
        for (const key in obj) {
          if (Array.isArray(obj[key])) {
            return obj[key];
          }
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            const nested = findArrays(obj[key]);
            if (nested.length > 0) return nested;
          }
        }
        
        // If no arrays found, wrap the object in an array
        return [obj];
      };
      
      return findArrays(parsed);
    } catch (error) {
      throw new Error(`XML Parse Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const parseEDI = async (data: string): Promise<any[]> => {
    try {
      const { data: response, error } = await supabase.functions.invoke('parse-edi', {
        body: { ediData: data }
      });

      if (error) {
        throw new Error(`EDI Parse Error: ${error.message}`);
      }

      if (!response.success) {
        throw new Error(`EDI Parse Error: ${response.error}`);
      }

      // Convert the semantic JSON to an array format suitable for our JSON editor
      const semanticJson = response.parsedData;
      return [semanticJson];
    } catch (error) {
      throw new Error(`EDI Parse Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const parseText = (data: string): any[] => {
    try {
      const lines = data.split('\n').filter(line => line.trim());
      if (lines.length === 0) throw new Error('No data found');
      
      // Try to detect if first line is headers
      const firstLine = lines[0];
      const hasHeaders = !firstLine.split(textDelimiter).every(cell => !isNaN(Number(cell.trim())));
      
      const headers = hasHeaders 
        ? firstLine.split(textDelimiter).map(h => h.trim())
        : lines[0].split(textDelimiter).map((_, i) => `column_${i + 1}`);
      
      const dataLines = hasHeaders ? lines.slice(1) : lines;
      
      return dataLines.map(line => {
        const values = line.split(textDelimiter);
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim() || '';
        });
        return row;
      });
    } catch (error) {
      throw new Error(`Text Parse Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const parseJSON = (data: string): any[] => {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      throw new Error(`JSON Parse Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleParse = async () => {
    if (!selectedFormat || !inputData.trim()) return;
    
    setParseError(null);
    
    try {
      let parsed: any[] = [];
      
      switch (selectedFormat) {
        case 'json':
          parsed = parseJSON(inputData);
          break;
        case 'csv':
          parsed = parseCSV(inputData);
          break;
        case 'xml':
          parsed = parseXML(inputData);
          break;
        case 'edi':
          parsed = await parseEDI(inputData);
          break;
        case 'text':
          parsed = parseText(inputData);
          break;
      }
      
      onDataParsed(parsed);
      onOpenChange(false);
      setSelectedFormat(null);
      setInputData('');
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Unknown parsing error');
    }
  };

  const getFormatSpecificOptions = () => {
    switch (selectedFormat) {
      case 'csv':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">Delimiter:</label>
            <select 
              value={csvDelimiter} 
              onChange={(e) => setCsvDelimiter(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value=",">Comma (,)</option>
              <option value=";">Semicolon (;)</option>
              <option value="\t">Tab</option>
              <option value="|">Pipe (|)</option>
            </select>
          </div>
        );
      case 'text':
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">Delimiter:</label>
            <select 
              value={textDelimiter} 
              onChange={(e) => setTextDelimiter(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="\t">Tab</option>
              <option value=",">Comma (,)</option>
              <option value="|">Pipe (|)</option>
              <option value=" ">Space</option>
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  const getPlaceholder = () => {
    switch (selectedFormat) {
      case 'json':
        return '[{"name": "John", "age": 30}, {"name": "Jane", "age": 25}]';
      case 'csv':
        return 'name,age,city\nJohn,30,New York\nJane,25,Los Angeles';
      case 'xml':
        return '<employees><employee><name>John</name><age>30</age></employee></employees>';
      case 'edi':
        return `UNB+UNOC:3+8712423005846:14+8719333019055:14+250703:0913+1++ORDERS+++
UNH+1+ORDERS:D:03B:UN:EAN008
BGM+220+IOR25-009527+9
DTM+137:20250703:102
LIN+1++4901792012430:EN
PIA+5+27.71310G:L
IMD+++SHOWA 310 GROEN L
QTY+21:360:PCE
UNT+8+1
UNZ+1+1`;
      case 'text':
        return 'John\t30\tNew York\nJane\t25\tLos Angeles';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Data Format</DialogTitle>
        </DialogHeader>
        
        {!selectedFormat ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose the format of your source data. We'll parse it and convert it to JSON for mapping.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {formatOptions.map((format) => {
                const Icon = format.icon;
                return (
                  <Button
                    key={format.type}
                    variant="outline"
                    className="h-24 flex-col space-y-2 hover:bg-accent"
                    onClick={() => setSelectedFormat(format.type)}
                  >
                    <div className={`p-2 rounded ${format.color} text-white`}>
                      <Icon size={24} />
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{format.name}</div>
                      <div className="text-xs text-muted-foreground">{format.description}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {formatOptions.find(f => f.type === selectedFormat)?.name}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFormat(null);
                  setInputData('');
                  setParseError(null);
                }}
              >
                Change Format
              </Button>
            </div>
            
            {getFormatSpecificOptions()}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Paste your {selectedFormat.toUpperCase()} data:</label>
              <Textarea
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                placeholder={getPlaceholder()}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
            
            {parseError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                {parseError}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button onClick={handleParse} disabled={!inputData.trim()}>
                <Upload className="w-4 h-4 mr-2" />
                Parse & Continue
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}