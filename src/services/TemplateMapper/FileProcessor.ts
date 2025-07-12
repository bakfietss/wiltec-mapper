
import { flattenJsonData, flattenXmlData, flattenCsvData } from '@/utils/flatten';

export async function loadAndFlatten(file: File): Promise<any[]> {
    const text = await file.text();
    
    if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        return flattenJsonData(data);
    }
    
    if (file.name.endsWith('.xml')) {
        return flattenXmlData(text);
    }
    
    if (file.name.endsWith('.csv')) {
        // Simple CSV parsing - convert to array of objects first
        const lines = text.split('\n').filter(line => line.trim());
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
    }

    throw new Error(`Unsupported file type: ${file.name}`);
}
