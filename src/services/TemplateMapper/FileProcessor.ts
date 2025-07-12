
import { flattenJsonData, flattenXmlData, flattenCsvData } from '@/utils/flatten';

export async function loadAndFlatten(file: File): Promise<any[]> {
    const text = await file.text();
    
    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);
    
    if (file.name.endsWith('.json') || file.type === 'application/json') {
        try {
            const data = JSON.parse(text);
            console.log('Parsed JSON data:', data);
            return flattenJsonData(data);
        } catch (error) {
            console.error('JSON parsing error:', error);
            throw new Error(`Invalid JSON file: ${error}`);
        }
    }
    
    if (file.name.endsWith('.xml') || file.type === 'text/xml' || file.type === 'application/xml') {
        try {
            console.log('Processing XML file...');
            const result = flattenXmlData(text);
            console.log('Flattened XML result:', result);
            return result;
        } catch (error) {
            console.error('XML parsing error:', error);
            throw new Error(`Invalid XML file: ${error}`);
        }
    }
    
    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
        try {
            // Simple CSV parsing - convert to array of objects first
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
                throw new Error('Empty CSV file');
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
            
            console.log('Parsed CSV data:', csvData);
            return flattenCsvData(csvData);
        } catch (error) {
            console.error('CSV parsing error:', error);
            throw new Error(`Invalid CSV file: ${error}`);
        }
    }

    throw new Error(`Unsupported file type: ${file.name}. Supported formats: .json, .xml, .csv`);
}
