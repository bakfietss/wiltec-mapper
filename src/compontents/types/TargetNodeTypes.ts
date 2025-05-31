
export interface SchemaField {
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    children?: SchemaField[];
    exampleValue?: any;
}

export interface TargetNodeData {
    label: string;
    fields: SchemaField[];
    data?: any[];
}

export interface TargetFieldProps {
    field: SchemaField;
    level: number;
    nodeData: any[];
    expandedStates: Map<string, boolean>;
    onExpandChange?: () => void;
}
