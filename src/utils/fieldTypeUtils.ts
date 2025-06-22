
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

export const getExampleValueInput = (field: any, updateField: (id: string, updates: any) => void) => {
    switch (field.type) {
        case 'number':
            return (
                <input
                    type="number"
                    value={field.exampleValue || ''}
                    onChange={(e) => updateField(field.id, { exampleValue: parseFloat(e.target.value) || '' })}
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    placeholder="123"
                />
            );
        case 'boolean':
            return (
                <select
                    value={field.exampleValue?.toString() || ''}
                    onChange={(e) => updateField(field.id, { exampleValue: e.target.value === 'true' })}
                    className="flex-1 border rounded px-2 py-1 text-sm"
                >
                    <option value="">Select...</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>
            );
        case 'date':
            return (
                <input
                    type="date"
                    value={field.exampleValue || ''}
                    onChange={(e) => updateField(field.id, { exampleValue: e.target.value })}
                    className="flex-1 border rounded px-2 py-1 text-sm"
                />
            );
        default:
            return (
                <input
                    type="text"
                    value={field.exampleValue || ''}
                    onChange={(e) => updateField(field.id, { exampleValue: e.target.value })}
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    placeholder="Example value"
                />
            );
    }
};
