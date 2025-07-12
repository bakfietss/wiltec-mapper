

import { flattenJsonData, flattenXmlData, flattenCsvData } from '@/utils/flatten';

export async function loadAndFlatten(file: File): Promise<any[]> {
    const text = await file.text();
    
    if (file.name.endsWith('.json')) {
        try {
            const data = JSON.parse(text);
            return flattenJsonData(data);
        } catch (error) {
            throw new Error(`Failed to parse JSON file: ${error}`);
        }
    }
    
    if (file.name.endsWith('.xml')) {
        try {
            return flattenXmlData(text);
        } catch (error) {
            throw new Error(`Failed to parse XML file: ${error}`);
        }
    }
    
    if (file.name.endsWith('.csv')) {
        try {
            // Simple CSV parsing - convert to array of objects first
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
                throw new Error('CSV file is empty');
            }
            
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const csvData = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
                const obj: any = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index] || '';
                });
                return obj;
            });
            return flattenCsvData(csvData);
        } catch (error) {
            throw new Error(`Failed to parse CSV file: ${error}`);
        }
    }

    throw new Error(`Unsupported file type: ${file.name}. Supported formats: .json, .xml, .csv`);
}

