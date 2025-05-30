import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    Background,
    Controls,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useTheme } from '../Theme/ThemeContext';
import { useFieldStore } from '../store/fieldStore';

import SourceNode from '../compontents/SourceNode';
import TargetNode from '../compontents/TargetNode';
import ConversionMappingNode from '../compontents/ConversionMappingNode';
import TransformNode from '../compontents/TransformNode';
import EditableSchemaNode from '../compontents/EditableSchemaNode';
import EditableTransformNode from '../compontents/EditableTransformNode';
import SplitterTransformNode from '../compontents/SplitterTransformNode';
import MappingToolbar from '../compontents/MappingToolbar';
import DataSidebar from '../compontents/DataSidebar';

import { useEdgeHandlers } from './EdgeHandlers';
import { useNodeFactories } from './NodeFactories';
import { processDataMapping } from './DataMappingProcessor';
import { exportMappingConfiguration, importMappingConfiguration, MappingConfiguration } from './MappingExporter';

const nodeTypes = {
    source: SourceNode,
    target: TargetNode,
    conversionMapping: ConversionMappingNode,
    transform: TransformNode,
    editableSchema: EditableSchemaNode,
    editableTransform: EditableTransformNode,
    splitterTransform: SplitterTransformNode,
};

// Helper function to check if node data has schema properties
const isSchemaNodeData = (data: any): data is { schemaType: 'source' | 'target'; fields: any[]; data: any[] } => {
    return data && typeof data === 'object' && 'schemaType' in data && 'fields' in data;
};

export default function Pipeline() {
    const { theme } = useTheme();
    const { updateTargetField, conversionMode, conversionMappings, conversionTransforms } = useFieldStore();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [sourceData, setSourceData] = useState([]);
    const [targetData, setTargetData] = useState([]);
    const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
    const canvasRef = useRef(null);

    // Use custom edge handlers
    const { onConnect, handleEdgesChange } = useEdgeHandlers(edges, setEdges, setNodes);

    // Use node factories
    const { addSchemaNode, addTransformNode, addMappingNode } = useNodeFactories(nodes, setNodes);

    // Update sidebar data whenever nodes change
    useEffect(() => {
        console.log('Nodes changed, updating sidebar data');
        
        // Update source data from all source nodes
        const allSourceData = nodes
            .filter(node => node.type === 'editableSchema' && isSchemaNodeData(node.data) && node.data.schemaType === 'source')
            .flatMap(node => node.data?.data || []);
        
        // Update target data from all target nodes
        const allTargetData = nodes
            .filter(node => node.type === 'editableSchema' && isSchemaNodeData(node.data) && node.data.schemaType === 'target')
            .flatMap(node => node.data?.data || []);
        
        console.log('Updated source data:', allSourceData);
        console.log('Updated target data:', allTargetData);
        
        setSourceData(allSourceData);
        setTargetData(allTargetData);
    }, [nodes]);

    // Handle node changes and deletions
    const handleNodesChange = useCallback((changes: any) => {
        console.log('Node changes:', changes);
        
        // Check if any nodes are being removed
        const removedNodes = changes.filter((change: any) => change.type === 'remove');
        if (removedNodes.length > 0) {
            console.log('Nodes being removed:', removedNodes);
            
            // Remove edges connected to deleted nodes
            setEdges((currentEdges) => {
                const removedNodeIds = removedNodes.map((change: any) => change.id);
                return currentEdges.filter(edge => 
                    !removedNodeIds.includes(edge.source) && 
                    !removedNodeIds.includes(edge.target)
                );
            });
        }
        
        onNodesChange(changes);
        
        // Re-process mapping after node changes if it's a data update
        const hasDataChanges = changes.some((change: any) => 
            change.type === 'replace' || 
            (change.type === 'add' && change.item?.data)
        );
        
        if (hasDataChanges) {
            setTimeout(() => {
                setNodes(currentNodes => {
                    const updatedNodes = processDataMapping(edges, currentNodes);
                    const hasChanges = updatedNodes.some((node, index) => node !== currentNodes[index]);
                    return hasChanges ? updatedNodes : currentNodes;
                });
            }, 50);
        }
    }, [onNodesChange, edges, setEdges, setNodes]);

    const handleEdgesChangeWrapper = useCallback((changes: any) => {
        onEdgesChange(changes);
        handleEdgesChange(changes);
    }, [onEdgesChange, handleEdgesChange]);

    // Handle canvas clicks to close toolbar
    const handleCanvasClick = useCallback((event: React.MouseEvent) => {
        const target = event.target as HTMLElement;
        
        // Check if click is on the toolbar or its children
        const toolbar = document.querySelector('[data-toolbar="mapping-toolbar"]');
        if (toolbar && toolbar.contains(target)) {
            return; // Don't close if clicking on toolbar
        }
        
        // Close toolbar if it's expanded and click is outside toolbar
        if (isToolbarExpanded) {
            setIsToolbarExpanded(false);
        }
    }, [isToolbarExpanded]);

    // Add export functionality
    const exportCurrentMapping = useCallback(() => {
        const config = exportMappingConfiguration(nodes, edges, 'Current Mapping');
        
        // Create download link
        const dataStr = JSON.stringify(config, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `mapping-config-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('Exported mapping configuration:', config);
    }, [nodes, edges]);

    // Add import functionality
    const importMapping = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config: MappingConfiguration = JSON.parse(e.target?.result as string);
                const { nodes: importedNodes, edges: importedEdges } = importMappingConfiguration(config);
                
                setNodes(importedNodes);
                setEdges(importedEdges);
                
                console.log('Imported mapping configuration:', config);
            } catch (error) {
                console.error('Failed to import mapping configuration:', error);
                alert('Invalid mapping configuration file');
            }
        };
        reader.readAsText(file);
    }, [setNodes, setEdges]);

    const style = useMemo(
        () => ({
            width: '100%',
            height: '100%',
            background: theme?.canvas?.background || '#f8f9fa',
        }),
        [theme?.canvas?.background]
    );

    return (
        <div className="w-full h-screen relative" onClick={handleCanvasClick} ref={canvasRef}>
            <DataSidebar
                side="left"
                title="Source Data"
                data={sourceData}
                onDataChange={setSourceData}
            />
            
            <DataSidebar
                side="right"
                title="Target Data"
                data={targetData}
                onDataChange={setTargetData}
            />

            <ReactFlowProvider>
                <MappingToolbar
                    onAddTransform={addTransformNode}
                    onAddMappingNode={addMappingNode}
                    onAddSchemaNode={addSchemaNode}
                    isExpanded={isToolbarExpanded}
                    onToggleExpanded={setIsToolbarExpanded}
                    onExportMapping={exportCurrentMapping}
                    onImportMapping={importMapping}
                />
                
                <div className="relative w-full h-full overflow-hidden">
                    <ReactFlow
                        nodes={nodes}
                        onNodesChange={handleNodesChange}
                        edges={edges}
                        onEdgesChange={handleEdgesChangeWrapper}
                        onConnect={onConnect}
                        fitView
                        style={style}
                        nodeTypes={nodeTypes}
                        deleteKeyCode={['Backspace', 'Delete']}
                        defaultEdgeOptions={{
                            type: 'smoothstep',
                            animated: true,
                            style: { 
                                strokeWidth: 1,
                                stroke: '#3b82f6'
                            }
                        }}
                    >
                        <Background />
                        <Controls />
                    </ReactFlow>
                </div>
            </ReactFlowProvider>
        </div>
    );
}
