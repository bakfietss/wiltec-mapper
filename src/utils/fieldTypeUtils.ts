
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

export const getFieldType = (value: any): 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array' => {
    if (Array.isArray(value)) {
        return 'array';
    } else if (value && typeof value === 'object') {
        return 'object';
    } else if (typeof value === 'number') {
        return 'number';
    } else if (typeof value === 'boolean') {
        return 'boolean';
    } else {
        return 'string';
    }
};
