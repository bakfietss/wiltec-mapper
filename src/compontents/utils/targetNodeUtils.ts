
import { SchemaField } from '../types/TargetNodeTypes';

export const getTypeColor = (type: string) => {
    switch (type) {
        case 'string': return 'text-green-600 bg-green-50';
        case 'number': return 'text-blue-600 bg-blue-50';
        case 'boolean': return 'text-purple-600 bg-purple-50';
        case 'date': return 'text-orange-600 bg-orange-50';
        case 'object': return 'text-gray-600 bg-gray-50';
        case 'array': return 'text-red-600 bg-red-50';
        default: return 'text-gray-600 bg-gray-50';
    }
};

export const countVisibleFields = (fields: SchemaField[], expandedStates: Map<string, boolean>): number => {
    let count = 0;
    for (const field of fields) {
        count += 1;
        if (field.children && field.children.length > 0) {
            const isExpanded = expandedStates.get(field.id) !== false;
            if (isExpanded) {
                count += countVisibleFields(field.children, expandedStates);
            }
        }
    }
    return count;
};

export const getFieldValue = (field: SchemaField, nodeData: any[]) => {
    // Always show example value if it exists, just like the source node
    return field.exampleValue;
};
