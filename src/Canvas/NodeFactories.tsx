import { useCallback } from 'react';
import { Node } from '@xyflow/react';

export const useNodeFactories = (
    nodes: Node[],
    setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void
) => {
    const addSchemaNode = useCallback((type: 'source' | 'target') => {
        const newNode: Node = {
            id: `${type}-${Date.now()}`,
            type: type, // Use 'source' or 'target' instead of 'editableSchema'
            position: { x: type === 'source' ? 100 : 800, y: 100 + nodes.length * 50 },
            data: {
                label: type === 'source' ? 'Source Schema' : 'Target Schema',
                fields: [],
                data: [],
            },
        };

        setNodes((nds) => [...nds, newNode]);
    }, [nodes.length, setNodes]);

    const addTransformNode = useCallback((transformType: string) => {
        let nodeType = 'transform';
        let nodeIdPrefix = 'transform';
        let nodeData: any = {
            label: transformType,
            transformType: transformType,
            description: `Apply ${transformType} transformation`,
            config: {},
        };

        if (transformType === 'Text Splitter') {
            nodeType = 'splitterTransform';
            nodeIdPrefix = 'splitter';
        } else if (transformType === 'IF THEN') {
            nodeType = 'ifThen';
            nodeIdPrefix = 'ifThen';
            nodeData = {
                label: 'IF THEN Logic',
                condition: '',
                thenValue: '',
                elseValue: '',
            };
        } else if (transformType === 'Static Value') {
            nodeType = 'staticValue';
            nodeIdPrefix = 'static';
            nodeData = {
                label: 'Static Value',
                value: '',
                valueType: 'string',
            };
        } else if (transformType === 'Coalesce') {
            nodeType = 'transform';
            nodeIdPrefix = 'coalesce';
            nodeData = {
                label: 'Coalesce Transform',
                transformType: 'coalesce',
                rules: [],
                defaultValue: '',
            };
        }
        
        const nodeId = `${nodeIdPrefix}-${Date.now()}`;
        const newNode: Node = {
            id: nodeId,
            type: nodeType,
            position: { x: 400, y: 100 + nodes.length * 50 },
            data: nodeData,
        };

        setNodes((nds) => [...nds, newNode]);
    }, [nodes.length, setNodes]);

    const addMappingNode = useCallback(() => {
        const newNode: Node = {
            id: `mapping-${Date.now()}`,
            type: 'conversionMapping',
            position: { x: 400, y: 250 + nodes.length * 50 },
            data: {
                label: 'Field Mapping',
                mappings: [],
                isExpanded: false,
            },
        };

        setNodes((nds) => [...nds, newNode]);
    }, [nodes.length, setNodes]);

    return {
        addSchemaNode,
        addTransformNode,
        addMappingNode
    };
};
