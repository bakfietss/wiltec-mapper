
import { flatten } from '@/utils/flatten';

export async function loadAndFlatten(file: File): Promise<any[]> {
    const text = await file.text();
    
    if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        const arrayData = Array.isArray(data) ? data : [data];
        return arrayData.map(item => flatten(item));
    }
    
    if (file.name.endsWith('.xml')) {
        // Basic XML parsing - you might want to use a proper XML parser
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        
        // Extract data from XML - this is a simplified approach
        const items = Array.from(xmlDoc.getElementsByTagName('*'))
            .filter(el => el.children.length === 0 && el.textContent?.trim())
            .reduce((acc, el) => {
                const tagName = el.tagName;
                const value = el.textContent?.trim();
                if (tagName && value) {
                    acc[tagName] = value;
                }
                return acc;
            }, {} as Record<string, string>);
        
        return [flatten(items)];
    }

    throw new Error(`Unsupported file type: ${file.name}`);
}
