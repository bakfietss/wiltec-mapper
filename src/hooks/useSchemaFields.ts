
import { useState, useCallback } from 'react';

export interface SchemaField {
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    // NOTE: Removed exampleValue - using sampleData as single source of truth
    children?: SchemaField[];
    parent?: string;
}

export const useSchemaFields = (initialFields: SchemaField[] = []) => {
    const [fields, setFields] = useState<SchemaField[]>(initialFields);

    const addField = useCallback((parentId?: string) => {
        const newField: SchemaField = {
            id: `field-${Date.now()}`,
            name: 'New Field',
            type: 'string',
            parent: parentId
        };
        
        if (parentId) {
            // Add as child field
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
            // Add as root field
            setFields([...fields, newField]);
        }
    }, [fields]);

    const updateField = useCallback((fieldId: string, updates: Partial<SchemaField>) => {
        const updateFieldRecursive = (fieldsArray: SchemaField[]): SchemaField[] => {
            return fieldsArray.map(field => {
                if (field.id === fieldId) {
                    const updatedField = { ...field, ...updates };
                    // If changing to object/array, ensure children array exists
                    if ((updates.type === 'object' || updates.type === 'array') && !updatedField.children) {
                        updatedField.children = [];
                    }
                    // If changing away from object/array, remove children
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

    return {
        fields,
        setFields,
        addField,
        updateField,
        deleteField,
        generateFieldsFromObject
    };
};
