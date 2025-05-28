
import { create } from 'zustand';

// TYPES
interface Field {
    name: string;
    value: string;
}

interface SchemaField {
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    children?: SchemaField[];
}

interface ConversionRule {
    from: string;
    to: string;
    transformation?: string;
}

// STORE
interface FieldState {
    // Input/Output Fields (legacy support)
    sourceFields: Field[];
    targetFields: Field[];

    // Schema-based fields (new approach)
    sourceSchema: SchemaField[];
    targetSchema: SchemaField[];
    sourceData: any[];
    targetData: any[];

    // Conversion Logic
    conversionMode: 'mapping' | 'transform';
    conversionMappings: ConversionRule[];
    conversionTransforms: string[];

    // Legacy field actions
    addSourceField: () => void;
    updateField: (index: number, key: keyof Field, value: string) => void;
    addTargetField: () => void;
    updateTargetField: (index: number, key: keyof Field, value: string) => void;
    setTargetFieldsFromArray: (fields: string[]) => void;

    // Schema-based actions
    setSourceSchema: (schema: SchemaField[]) => void;
    setTargetSchema: (schema: SchemaField[]) => void;
    setSourceData: (data: any[]) => void;
    updateTargetData: (fieldId: string, value: any) => void;

    // Conversion logic actions
    setConversionMode: (mode: 'mapping' | 'transform') => void;
    addConversionMapping: () => void;
    updateConversionMapping: (index: number, key: keyof ConversionRule, value: string) => void;
    toggleConversionTransform: (transform: string) => void;

    // Reset
    resetAll: () => void;
}

// STORE IMPLEMENTATION
export const useFieldStore = create<FieldState>((set, get) => ({
    // Legacy fields
    sourceFields: [],
    targetFields: [],

    // Schema-based fields
    sourceSchema: [],
    targetSchema: [],
    sourceData: [],
    targetData: [],

    conversionMode: 'mapping',
    conversionMappings: [{ from: '', to: '' }],
    conversionTransforms: [],

    // Legacy actions
    addSourceField: () =>
        set((state) => ({
            sourceFields: [...state.sourceFields, { name: '', value: '' }],
        })),

    updateField: (index, key, value) =>
        set((state) => {
            const updated = [...state.sourceFields];
            updated[index] = { ...updated[index], [key]: value };
            return { sourceFields: updated };
        }),

    addTargetField: () =>
        set((state) => ({
            targetFields: [...state.targetFields, { name: '', value: '' }],
        })),

    updateTargetField: (index, key, value) =>
        set((state) => {
            const updated = [...state.targetFields];
            if (updated[index]) {
                updated[index] = { ...updated[index], [key]: value };
            } else {
                // Create the field if it doesn't exist
                updated[index] = { name: '', value: '' };
                updated[index][key] = value;
            }
            console.log('Updated target field:', { index, key, value, updated });
            return { targetFields: updated };
        }),

    setTargetFieldsFromArray: (fields) =>
        set(() => ({
            targetFields: fields.map((name) => ({ name, value: '' })),
        })),

    // Schema-based actions
    setSourceSchema: (schema) => set({ sourceSchema: schema }),
    setTargetSchema: (schema) => set({ targetSchema: schema }),
    setSourceData: (data) => set({ sourceData: data }),
    
    updateTargetData: (fieldId, value) =>
        set((state) => {
            const newTargetData = [...state.targetData];
            if (newTargetData.length === 0) {
                newTargetData.push({});
            }
            newTargetData[0] = { ...newTargetData[0], [fieldId]: value };
            console.log('Updated target data:', { fieldId, value, newTargetData });
            return { targetData: newTargetData };
        }),

    // Conversion actions
    setConversionMode: (mode) => set({ conversionMode: mode }),

    addConversionMapping: () =>
        set((state) => ({
            conversionMappings: [...state.conversionMappings, { from: '', to: '' }],
        })),

    updateConversionMapping: (index, key, value) =>
        set((state) => {
            const updated = [...state.conversionMappings];
            updated[index] = { ...updated[index], [key]: value };
            return { conversionMappings: updated };
        }),

    toggleConversionTransform: (transform) =>
        set((state) => {
            const exists = state.conversionTransforms.includes(transform);
            return {
                conversionTransforms: exists
                    ? state.conversionTransforms.filter((t) => t !== transform)
                    : [...state.conversionTransforms, transform],
            };
        }),

    resetAll: () =>
        set({
            sourceFields: [],
            targetFields: [],
            sourceSchema: [],
            targetSchema: [],
            sourceData: [],
            targetData: [],
            conversionMode: 'mapping',
            conversionMappings: [{ from: '', to: '' }],
            conversionTransforms: [],
        }),
}));
