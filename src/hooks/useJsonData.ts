
import { useState, useCallback } from 'react';

export const useJsonData = (initialData: any[] = []) => {
    const [nodeData, setNodeData] = useState<any[]>(initialData);
    const [jsonInput, setJsonInput] = useState('');

    const handleJsonImport = useCallback((onFieldsGenerated?: (fields: any[]) => void) => {
        try {
            const parsed = JSON.parse(jsonInput);
            const dataArray = Array.isArray(parsed) ? parsed : [parsed];
            setNodeData(dataArray);
            setJsonInput('');
            
            // If callback provided, generate fields from first object
            if (onFieldsGenerated && dataArray.length > 0 && typeof dataArray[0] === 'object') {
                onFieldsGenerated(dataArray);
            }
        } catch (error) {
            console.error('Invalid JSON:', error);
            alert('Invalid JSON format');
        }
    }, [jsonInput]);

    return {
        nodeData,
        setNodeData,
        jsonInput,
        setJsonInput,
        handleJsonImport
    };
};
