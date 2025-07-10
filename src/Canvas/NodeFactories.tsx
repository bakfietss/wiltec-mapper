
import { useCallback } from 'react';
import { Node } from '@xyflow/react';
import SourceNode from '../components/nodes/SourceNode';
import TargetNode from '../components/nodes/TargetNode';
import XmlTargetNode from '../components/nodes/XmlTargetNode';
import TransformNode from '../components/nodes/TransformNode';
import SplitterTransformNode from '../components/nodes/SplitterTransformNode';
import IfThenNode from '../components/nodes/IfThenNode';
import StaticValueNode from '../components/nodes/StaticValueNode';
import ConversionMappingNode from '../components/nodes/ConversionMappingNode';
import CoalesceTransformNode from '../components/nodes/CoalesceTransformNode';
import ConcatTransformNode from '../components/nodes/ConcatTransformNode';

export const nodeTypes = {
  source: SourceNode,
  target: TargetNode,
  xmlTarget: XmlTargetNode,
  transform: TransformNode,
  splitterTransform: SplitterTransformNode,
  ifThen: IfThenNode,
  staticValue: StaticValueNode,
  conversionMapping: ConversionMappingNode,
  coalesceTransform: CoalesceTransformNode,
  concatTransform: ConcatTransformNode,
};

export const useNodeFactories = (
    nodes: Node[],
    setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void
) => {
    const addSchemaNode = useCallback((type: 'source' | 'target' | 'xmlTarget') => {
        let nodeType = type;
        let nodeData: any = {
            label: type === 'source' ? 'Source Schema' : 
                   type === 'xmlTarget' ? 'XML Target Schema' : 'Target Schema',
            fields: [],
            data: [],
        };

        // Add XML-specific properties for XML target
        if (type === 'xmlTarget') {
            nodeData.outputFormat = 'xml';
        }

        const newNode: Node = {
            id: `${type}-${Date.now()}`,
            type: nodeType,
            position: { x: type === 'source' ? 100 : 800, y: 100 + nodes.length * 50 },
            data: nodeData,
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
        } else if (transformType === 'Concat') {
            // Use the new concatTransform node type exclusively
            nodeType = 'concatTransform';
            nodeIdPrefix = 'concat';
            nodeData = {
                label: 'Concat Transform',
                transformType: 'concat',
                rules: [],
                delimiter: ',',
                outputType: 'value',
                inputValues: {},
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
