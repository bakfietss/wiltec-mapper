
import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';

interface SchemaField {
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    children?: SchemaField[];
    exampleValue?: any;
}

interface TargetNodeData {
    label: string;
    fields: SchemaField[];
    data?: any[];
}

const getTypeColor = (type: string) => {
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

const TargetField: React.FC<{
    field: SchemaField;
    level: number;
    nodeData: any[];
    expandedStates: Map<string, boolean>;
    onExpandChange?: () => void;
}> = ({ field, level, nodeData, expandedStates, onExpandChange }) => {
    const isExpanded = expandedStates.get(field.id) !== false;
    const hasChildren = field.children && field.children.length > 0;

    const handleToggle = () => {
        expandedStates.set(field.id, !isExpanded);
        if (onExpandChange) onExpandChange();
    };

    // Get the field value - prioritize actual data, then example value
    const getFieldValue = () => {
        const dataValue = nodeData?.[0]?.[field.id] || nodeData?.[0]?.[field.name];
        return dataValue !== undefined ? dataValue : field.exampleValue;
    };

    const fieldValue = getFieldValue();

    return (
        <div className="relative">
            <div
                className="flex items-center justify-between gap-2 py-1 px-2 hover:bg-gray-50 rounded text-sm group"
                style={{ marginLeft: `${level * 16}px` }}
            >
                {hasChildren ? (
                    <button onClick={handleToggle} className="p-0.5 hover:bg-gray-200 rounded">
                        {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
                    </button>
                ) : (
                    <div className="w-4" />
                )}

                <span className="font-medium text-gray-900 flex-1">{field.name}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(field.type)}`}>
                    {field.type}
                </span>
                {fieldValue && (
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded max-w-20 truncate">
                        {String(fieldValue)}
                    </span>
                )}

                {!hasChildren && (
                    <Handle
                        type="target"
                        position={Position.Left}
                        id={field.id}
                        className="w-3 h-3 bg-blue-500 border-2 border-white group-hover:bg-blue-600"
                        style={{
                            left: '-6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                        }}
                    />
                )}
            </div>

            {hasChildren && isExpanded && (
                <div>
                    {field.children?.map((child) => (
                        <TargetField 
                            key={child.id} 
                            field={child} 
                            level={level + 1} 
                            nodeData={nodeData}
                            expandedStates={expandedStates}
                            onExpandChange={onExpandChange} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const countVisibleFields = (fields: SchemaField[], expandedStates: Map<string, boolean>): number => {
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

const TargetNode: React.FC<{ data: TargetNodeData; id?: string }> = ({ data, id }) => {
    const { getEdges, getNodes, setNodes } = useReactFlow();
    const edges = getEdges();
    const nodes = getNodes();
    const [expandedStates] = useState(() => new Map<string, boolean>());
    const [, forceUpdate] = useState({});

    const handleExpandChange = () => {
        forceUpdate({});
    };

    // Find current node by ID (passed as prop) or by matching target nodes
    const currentNode = nodes.find(node => {
        if (id) return node.id === id;
        return (node.type === 'target' || (node.type === 'editableSchema' && node.data?.schemaType === 'target')) &&
               node.data?.label === data.label;
    });

    // Build the complete data record from both manual input and connections
    const targetNodeData = data.data?.[0] ?? {};
    const handleValueMap: Record<string, any> = { ...targetNodeData };

    // Check for connected values and merge them
    let hasNewConnectionData = false;
    for (const edge of edges) {
        if (edge.target === currentNode?.id) {
            const targetHandle = edge.targetHandle;
            const sourceHandle = edge.sourceHandle;
            if (targetHandle && sourceHandle) {
                const sourceNode = nodes.find(n => n.id === edge.source);
                if (sourceNode && sourceNode.data?.data?.[0]) {
                    const sourceValue = sourceNode.data.data[0][sourceHandle];
                    if (sourceValue !== undefined) {
                        handleValueMap[targetHandle] = sourceValue;
                        // Check if this is new data that needs to be stored
                        if (targetNodeData[targetHandle] !== sourceValue) {
                            hasNewConnectionData = true;
                        }
                    }
                }
            }
        }
    }

    // Update the node's data if we have new connection data
    useEffect(() => {
        if (hasNewConnectionData && currentNode) {
            const updatedData = { ...handleValueMap };
            console.log('Updating target node data with:', updatedData);
            
            setNodes(nodes => nodes.map(node => {
                if (node.id === currentNode.id) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            data: [updatedData]
                        }
                    };
                }
                return node;
            }));
        }
    }, [hasNewConnectionData, currentNode?.id, JSON.stringify(handleValueMap)]);

    console.log('Target node current data:', targetNodeData);
    console.log('Final handle value map:', handleValueMap);

    // Use the current node's data if available, otherwise use the prop data
    // Ensure we always have an array
    const nodeData = Array.isArray(currentNode?.data?.data) ? currentNode.data.data : 
                     Array.isArray(data.data) ? data.data : [];

    const visibleFieldCount = countVisibleFields(data.fields, expandedStates);
    const fieldHeight = 32;
    const headerHeight = 60;
    const padding = 8;
    const dynamicHeight = headerHeight + (visibleFieldCount * fieldHeight) + padding;

    return (
        <div 
            className="bg-white border border-gray-200 rounded-lg shadow-sm min-w-64 max-w-80"
            style={{ height: `${dynamicHeight}px` }}
        >
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 bg-green-50">
                <FileText className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-gray-900">{data.label}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                    target
                </span>
            </div>

            <div className="p-2" style={{ height: `${dynamicHeight - headerHeight}px` }}>
                {data.fields.map((field) => (
                    <TargetField
                        key={field.id}
                        field={field}
                        level={0}
                        nodeData={nodeData}
                        expandedStates={expandedStates}
                        onExpandChange={handleExpandChange}
                    />
                ))}
            </div>
        </div>
    );
};

export default TargetNode;
