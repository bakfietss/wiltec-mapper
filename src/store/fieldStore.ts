// src/store/fieldStore.ts
import { create } from 'zustand';

// TYPES
interface Field {
    name: string;
    value: string;
}

interface ConversionRule {
    from: string;
    to: string;
    transformation?: string;
}

// STORE
interface FieldState {
    // Input/Output Fields
    sourceFields: Field[];
    targetFields: Field[];

    // Conversion Logic
    conversionMode: 'mapping' | 'transform';
    conversionMappings: ConversionRule[];
    conversionTransforms: string[];

    // Input/Output field actions
    addSourceField: () => void;
    updateField: (index: number, key: keyof Field, value: string) => void;

    addTargetField: () => void;
    updateTargetField: (index: number, key: keyof Field, value: string) => void;
    setTargetFieldsFromArray: (fields: string[]) => void;

    // Conversion logic actions
    setConversionMode: (mode: 'mapping' | 'transform') => void;
    addConversionMapping: () => void;
    updateConversionMapping: (index: number, key: keyof ConversionRule, value: string) => void;
    toggleConversionTransform: (transform: string) => void;

    // Reset
    resetAll: () => void;
}

// STORE IMPLEMENTATION
export const useFieldStore = create<FieldState>((set) => ({
    sourceFields: [],
    targetFields: [],

    conversionMode: 'mapping',
    conversionMappings: [{ from: '', to: '' }],
    conversionTransforms: [],

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
            updated[index] = { ...updated[index], [key]: value };
            return { targetFields: updated };
        }),

    setTargetFieldsFromArray: (fields) =>
        set(() => ({
            targetFields: fields.map((name) => ({ name, value: '' })),
        })),

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
            conversionMode: 'mapping',
            conversionMappings: [{ from: '', to: '' }],
            conversionTransforms: [],
        }),
}));
