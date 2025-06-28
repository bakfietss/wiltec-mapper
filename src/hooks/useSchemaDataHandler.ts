
import { useState, useCallback } from 'react';
import { SchemaField } from '../components/common/GenericSchemaRenderer';

export interface SchemaDataHandler {
    fields: SchemaField[];
    data: any[];
    setFields: (fields: SchemaField[]) => void;
    setData: (data: any[]) => void;
    addField: (parentId?: string) => void;
    updateField: (fieldId: string, updates: Partial<SchemaField>) => void;
    deleteField: (fieldId: string) => void;
    generateFieldsFromObject: (obj: any, parentPath?: string) => SchemaField[];
    importJsonData: (jsonData: any[]) => void;
}

export const useSchemaDataHandler = (
    initialFields: SchemaField[] = [],
    initialData: any[] = []
): SchemaDataHandler => {
    const [fields, setFields] = useState<SchemaField[]>(initialFields);
    const [data, setData] = useState<any[]>(initialData);

    const addField = useCallback((parentId?: string) => {
        const newField: SchemaField = {
            id: `field-${Date.now()}`,
            name: 'New Field',
            type: 'string',
            parent: parentId
        };
        
        if (parentId) {
            const updatedFields = fields.map(field => {
                if (field.id === parentId) {
                    return {
                        ...field,
                        children: [...(field.children || []), newField]
                    };
                }
                return field;
            });
            setFields(updatedFields);
        } else {
            setFields([...fields, newField]);
        }
    }, [fields]);

    const updateField = useCallback((fieldId: string, updates: Partial<SchemaField>) => {
        const updateFieldRecursive = (fieldsArray: SchemaField[]): SchemaField[] => {
            return fieldsArray.map(field => {
                if (field.id === fieldId) {
                    const updatedField = { ...field, ...updates };
                    if ((updates.type === 'object' || updates.type === 'array') && !updatedField.children) {
                        updatedField.children = [];
                    }
                    if (updates.type && updates.type !== 'object' && updates.type !== 'array') {
                        delete updatedField.children;
                    }
                    return updatedField;
                }
                if (field.children) {
                    return {
                        ...field,
                        children: updateFieldRecursive(field.children)
                    };
                }
                return field;
            });
        };
        
        setFields(updateFieldRecursive(fields));
    }, [fields]);

    const deleteField = useCallback((fieldId: string) => {
        const deleteFieldRecursive = (fieldsArray: SchemaField[]): SchemaField[] => {
            return fieldsArray.filter(field => {
                if (field.id === fieldId) {
                    return false;
                }
                if (field.children) {
                    field.children = deleteFieldRecursive(field.children);
                }
                return true;
            });
        };
        
        setFields(deleteFieldRecursive(fields));
    }, [fields]);

    const generateFieldsFromObject = useCallback((obj: any, parentPath = ''): SchemaField[] => {
        return Object.keys(obj).map((key, index) => {
            const value = obj[key];
            const fieldId = `field-${Date.now()}-${parentPath}-${index}`;
            
            if (Array.isArray(value)) {
                return {
                    id: fieldId,
                    name: key,
                    type: 'array',
                    children: value.length > 0 && typeof value[0] === 'object' 
                        ? generateFieldsFromObject(value[0], `${fieldId}-item`)
                        : []
                };
            } else if (value && typeof value === 'object') {
                return {
                    id: fieldId,
                    name: key,
                    type: 'object',
                    children: generateFieldsFromObject(value, fieldId)
                };
            } else {
                return {
                    id: fieldId,
                    name: key,
                    type: typeof value === 'number' ? 'number' : 
                          typeof value === 'boolean' ? 'boolean' : 'string'
                };
            }
        });
    }, []);

    const importJsonData = useCallback((jsonData: any[]) => {
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        setData(dataArray);
        
        if (dataArray.length > 0 && typeof dataArray[0] === 'object') {
            const generatedFields = generateFieldsFromObject(dataArray[0]);
            setFields(generatedFields);
        }
    }, [generateFieldsFromObject]);

    return {
        fields,
        data,
        setFields,
        setData,
        addField,
        updateField,
        deleteField,
        generateFieldsFromObject,
        importJsonData
    };
};
