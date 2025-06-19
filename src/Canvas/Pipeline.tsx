import React, {
    useRef,
    useState,
    useCallback,
    useEffect,
} from 'react';
import ReactFlow, {
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    Node,
    Edge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    getConnectedEdges,
} from '@xyflow/react';

import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react';

import { Handle, Position } from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import './index.css';

// We need to import the node types we want to use
import { SourceNode } from '../compontents/SourceNode';
import { TargetNode } from '../compontents/TargetNode';
import { TransformNode } from '../compontents/TransformNode';
import { SplitterTransformNode } from '../compontents/SplitterTransformNode';
import { IfThenNode } from '../compontents/IfThenNode';
import { StaticValueNode } from '../compontents/StaticValueNode';
import { MappingNode } from '../compontents/MappingNode';
import { CoalesceTransformNode } from '../compontents/CoalesceTransformNode';

// Import custom components
import MappingToolbar from '../compontents/MappingToolbar';

// Import Node Factories
import { useNodeFactories } from '../Canvas/NodeFactories';

// Import Edge Handlers
// import { useEdgeHandlers } from '../Canvas/EdgeHandlers';

const nodeTypes = {
    source: SourceNode,
    target: TargetNode,
    transform: TransformNode,
    splitterTransform: SplitterTransformNode,
    ifThen: IfThenNode,
    staticValue: StaticValueNode,
    conversionMapping: MappingNode,
    coalesceTransform: CoalesceTransformNode,
};

const initialNodes: Node[] = [];

const initialEdges: Edge[] = [];

const Pipeline = () => {
    const reactFlowWrapper = useRef(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [isToolbarExpanded, setIsToolbarExpanded] = useState(true);

    const { addSchemaNode, addTransformNode, addMappingNode } = useNodeFactories(nodes, setNodes);
    // const { onConnect, handleEdgesChange } = useEdgeHandlers();

    const onConnect: OnConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const onEdgesChange: OnEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [setEdges]
    );

    const onNodesDelete = useCallback(
        (deletedNodes) => {
            setEdges((eds) => {
                deletedNodes.forEach((node) => {
                    eds = eds.filter((e) => e.source !== node.id && e.target !== node.id);
                });
                return eds;
            });
        },
        [setEdges]
    );

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();

            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
            const type = event.dataTransfer.getData('application/reactflow');

            // check if the dropped element is valid
            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = reactFlowInstance.project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });
            const newNode = {
                id: `${type}-${Date.now()}`,
                type,
                position,
                data: { label: `${type} node` },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const nodeOutputs = new Map();

    const getValueFromSource = (sourceNodeId: string, sourceHandle: string) => {
        return nodeOutputs.get(`${sourceNodeId}-${sourceHandle}`);
    };

    useEffect(() => {
        // This is where the main transformation logic happens
        const newNodes = nodes.map((node) => {
            if (node.type === 'target') {
                // For each target node, find the incoming edges
                const incomingEdges = edges.filter((edge) => edge.target === node.id);

                // Map the incoming edges to their source values
                const values = incomingEdges.map((edge) => {
                    return getValueFromSource(edge.source, edge.sourceHandle);
                });

                // Update the target node's data with the incoming values
                nodeOutputs.set(node.id, values);
                setNodes((nds) =>
                    nds.map((n) => {
                        if (n.id === node.id) {
                            n.data = {
                                ...n.data,
                                values: values,
                            };
                        }
                        return n;
                    })
                );
            }
            return node;
        });

        setNodes(newNodes);

        // Transformation Logic
        nodes.forEach((targetNode) => {
            switch (targetNode.type) {
                case 'transform':
                    // Find the incoming edge to the transform node
                    const incomingEdge = edges.find((edge) => edge.target === targetNode.id);

                    if (incomingEdge) {
                        // Get the value from the source node
                        const sourceValue = getValueFromSource(incomingEdge.source, incomingEdge.sourceHandle);

                        // Apply the transformation logic based on the transform type
                        let transformedValue;
                        if (targetNode.data.transformType === 'String Transform') {
                            transformedValue = String(sourceValue).toUpperCase();
                        } else if (targetNode.data.transformType === 'Math Operation') {
                            // Example math operation (add 10)
                            transformedValue = Number(sourceValue) + 10;
                        } else if (targetNode.data.transformType === 'Date Format') {
                            // Example date formatting (assumes sourceValue is a Date object)
                            transformedValue = new Date(String(sourceValue)).toLocaleDateString();
                        } else {
                            transformedValue = `Unknown transform: ${targetNode.data.transformType}`;
                        }

                        // Store the transformed value for downstream nodes
                        nodeOutputs.set(targetNode.id, transformedValue);
                    }
                    break;

                case 'splitterTransform':
                    const splitterEdge = edges.find((edge) => edge.target === targetNode.id);

                    if (splitterEdge) {
                        // Get the value from the source node
                        const sourceValue = getValueFromSource(splitterEdge.source, splitterEdge.sourceHandle);
                        let transformedValue;

                        if (targetNode.data.transformType === 'Text Splitter') {
                            transformedValue = String(sourceValue).split(" ");
                        } else {
                            transformedValue = `Unknown transform: ${targetNode.data.transformType}`;
                        }

                        // Store the transformed value for downstream nodes
                        nodeOutputs.set(targetNode.id, transformedValue);
                    }
                    break;

                case 'ifThen':
                    const ifThenEdge = edges.find((edge) => edge.target === targetNode.id);

                    if (ifThenEdge) {
                        // Get the value from the source node
                        const sourceValue = getValueFromSource(ifThenEdge.source, ifThenEdge.sourceHandle);
                        let transformedValue;

                        // check if sourceValue is a boolean
                        const condition = targetNode.data.condition;
                        const thenValue = targetNode.data.thenValue;
                        const elseValue = targetNode.data.elseValue;

                        if (sourceValue) {
                            transformedValue = thenValue;
                        } else {
                            transformedValue = elseValue
                        }

                        // Store the transformed value for downstream nodes
                        nodeOutputs.set(targetNode.id, transformedValue);
                    }
                    break;

                case 'staticValue':
                    const staticValueEdge = edges.find((edge) => edge.target === targetNode.id);
                    let transformedValue;

                    if (staticValueEdge) {
                        // Get the value from the source node
                        const sourceValue = getValueFromSource(staticValueEdge.source, staticValueEdge.sourceHandle);

                        transformedValue = sourceValue;
                    } else {
                        transformedValue = targetNode.data.value;
                    }

                    nodeOutputs.set(targetNode.id, transformedValue);
                    break;

                case 'conversionMapping':
                    const mappingEdges = edges.filter((edge) => edge.target === targetNode.id);
                    const mappings = targetNode.data.mappings;
                  
                    let mappedValues = {};
                  
                    if (mappingEdges && mappings) {
                      mappingEdges.forEach((edge) => {
                        const sourceValue = getValueFromSource(edge.source, edge.sourceHandle);
                        const targetField = mappings.find(mapping => mapping.targetField === edge.targetHandle);
                  
                        if (targetField) {
                          mappedValues[targetField.targetField] = sourceValue;
                        }
                      });
                    }
                  
                    nodeOutputs.set(targetNode.id, mappedValues);
                    break;

                case 'coalesceTransform': {
                    console.log('Processing coalesce transform:', targetNode.data);
                    
                    const rules = targetNode.data.rules || [];
                    const defaultValue = targetNode.data.defaultValue || '';
                    
                    // Process rules in priority order
                    let resultValue = null;
                    let resultLabel = '';
                    
                    for (const rule of rules) {
                        // Find edge connected to this rule
                        const ruleEdge = edges.find(e => 
                            e.target === targetNode.id && 
                            e.targetHandle === `rule-${rule.id}`
                        );
                        
                        if (ruleEdge) {
                            const sourceValue = getValueFromSource(ruleEdge.source, ruleEdge.sourceHandle);
                            
                            // If we found a non-null/non-empty value, use it
                            if (sourceValue !== null && sourceValue !== undefined && sourceValue !== '') {
                                resultValue = sourceValue;
                                resultLabel = rule.outputLabel;
                                break; // Stop at first match (priority order)
                            }
                        }
                    }
                    
                    // If no rule matched, check for default value
                    if (resultValue === null) {
                        const defaultEdge = edges.find(e => 
                            e.target === targetNode.id && 
                            e.targetHandle === 'default'
                        );
                        
                        if (defaultEdge) {
                            resultValue = getValueFromSource(defaultEdge.source, defaultEdge.sourceHandle);
                        } else if (defaultValue) {
                            resultValue = defaultValue;
                        }
                        
                        resultLabel = ''; // No label for default value
                    }
                    
                    console.log('Coalesce result:', { value: resultValue, label: resultLabel });
                    
                    // Store both outputs for this node
                    nodeOutputs.set(`${targetNode.id}-value`, resultValue);
                    nodeOutputs.set(`${targetNode.id}-label`, resultLabel);
                    
                    break;
                }
            }
        });
    }, [nodes, edges, setNodes]);

    return (
        <div className="wrapper" ref={reactFlowWrapper}>
            <MappingToolbar
                onAddSchemaNode={addSchemaNode}
                onAddTransform={addTransformNode}
                onAddMappingNode={addMappingNode}
                isExpanded={isToolbarExpanded}
                onToggleExpanded={setIsToolbarExpanded}
            />

            <div className="reactflow-container">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    nodeTypes={nodeTypes}
                    onNodesDelete={onNodesDelete}
                    fitView
                >
                    <Controls />
                    <Background variant="dots" gap={12} size={1} />
                </ReactFlow>
            </div>
        </div>
    );
};

export default Pipeline;
