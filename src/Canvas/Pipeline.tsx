
import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes, useNodeFactories } from './NodeFactories';
import { useFieldStore } from '../store/fieldStore';
import DataSidebar from '../compontents/DataSidebar';
import MappingToolbar from '../compontents/MappingToolbar';
import MappingManager from '../compontents/MappingManager';
import { downloadBothMappingFiles } from './utils/FileDownloader';
import { importMappingConfiguration } from './importers/ConfigImporter';
import { MappingConfiguration } from './types/MappingTypes';
import { exportMappingDocumentation } from './DocumentationExporter';
import { toast } from 'sonner';

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'source',
    data: { label: 'Source 1' },
    position: { x: 50, y: 50 },
  },
];

const initialEdges: Edge[] = [];

// Centralized function to calculate all node field values
const calculateNodeFieldValues = (nodes: any[], edges: any[]) => {
    console.log('=== CALCULATING ALL NODE FIELD VALUES ===');
    console.log('Total nodes:', nodes.length);
    console.log('Total edges:', edges.length);
    
    const updatedNodes = nodes.map(node => {
        if (node.type === 'target' && node.data?.fields && Array.isArray(node.data.fields)) {
            // For target nodes, we'll let the hook handle the calculation
            // This ensures consistency with the useTargetNodeValues hook
            return node;
        } else if (node.type === 'transform' && node.data?.transformType === 'coalesce') {
            // Calculate input values for coalesce nodes to display
            const transformInputEdges = edges.filter(e => e.target === node.id);
            let inputValues: Record<string, any> = {};
            
            console.log(`=== ENHANCING COALESCE NODE ${node.id} ===`);
            console.log('Transform input edges:', transformInputEdges.length);
            
            transformInputEdges.forEach(inputEdge => {
                const inputSourceNode = nodes.find(n => n.id === inputEdge.source);
                
                if (inputSourceNode && inputSourceNode.type === 'source') {
                    const sourceValue = getSourceValue(inputSourceNode, inputEdge.sourceHandle);
                    inputValues[inputEdge.targetHandle] = sourceValue;
                    console.log(`Mapped input for coalesce: ${inputEdge.targetHandle} = ${sourceValue}`);
                }
            });
            
            console.log('Final input values for coalesce node:', inputValues);
            
            return {
                ...node,
                data: {
                    ...node.data,
                    inputValues,
                }
            };
        }
        return node;
    });
    
    return updatedNodes;
};

// Get source value from a node
const getSourceValue = (node: any, handleId: string): any => {
    if (node.type !== 'source') return null;
    
    const sourceFields = node.data?.fields;
    const sourceData = node.data?.data;
    
    // First try to get value from actual data using the handleId as a path
    if (sourceData && Array.isArray(sourceData) && sourceData.length > 0) {
        const dataObject = sourceData[0];
        
        // Handle nested paths (like "user.name" or "items[0].title")
        const getValue = (obj: any, path: string) => {
            try {
                // Handle array indices in path like "items[0]"
                const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
                const keys = normalizedPath.split('.');
                let value = obj;
                for (const key of keys) {
                    if (value && typeof value === 'object') {
                        value = value[key];
                    } else {
                        return undefined;
                    }
                }
                return value;
            } catch (e) {
                return undefined;
            }
        };
        
        const dataValue = getValue(dataObject, handleId);
        if (dataValue !== undefined) {
            return dataValue;
        }
    }
    
    // Fallback to manual schema fields
    if (sourceFields && Array.isArray(sourceFields)) {
        const sourceField = sourceFields.find((f: any) => f.id === handleId || f.name === handleId);
        if (sourceField) {
            return sourceField.exampleValue || 'No data';
        }
    }
    
    return null;
};

const Pipeline = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [currentMappingName, setCurrentMappingName] = useState<string>('Untitled Mapping');
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const [isManagerExpanded, setIsManagerExpanded] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  const fieldStore = useFieldStore();
  const { addSchemaNode, addTransformNode, addMappingNode } = useNodeFactories(nodes, setNodes);

  // Enhanced nodes with calculated field values - recalculate on every nodes/edges change
  const enhancedNodes = useMemo(() => {
    console.log('=== ENHANCED NODES RECALCULATION ===');
    console.log('Force update counter:', forceUpdate);
    const result = calculateNodeFieldValues(nodes, edges);
    return result;
  }, [nodes, edges, forceUpdate]);

  // Click outside to close functionality
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      const reactFlowElement = reactFlowWrapper.current?.querySelector('.react-flow');
      const isCanvasClick = reactFlowElement && reactFlowElement.contains(target);
      
      const toolbarElement = document.querySelector('[data-toolbar="mapping-toolbar"]');
      const isToolbarClick = toolbarElement && toolbarElement.contains(target);
      
      const managerElement = document.querySelector('[data-toolbar="mapping-manager"]');
      const isManagerClick = managerElement && managerElement.contains(target);
      
      if (isCanvasClick || (!isToolbarClick && !isManagerClick)) {
        setIsToolbarExpanded(false);
        setIsManagerExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const onConnect = useCallback((params: Connection) => {
    console.log('=== NEW CONNECTION CREATED ===');
    console.log('Connection params:', params);
    
    const newEdge = {
      ...params,
      type: 'smoothstep',
      animated: true,
      style: { 
        strokeWidth: 2,
        stroke: '#3b82f6',
        strokeDasharray: '5,5'
      }
    };
    setEdges((eds) => addEdge(newEdge, eds));
    
    // Force update to recalculate enhanced nodes
    setForceUpdate(prev => prev + 1);
  }, [setEdges]);

  // Enhanced onEdgesChange to handle connection removal
  const handleEdgesChange = useCallback((changes: any[]) => {
    console.log('=== EDGE CHANGES ===');
    console.log('Edge changes:', changes);
    
    // Check if any edges are being removed
    const hasRemovals = changes.some(change => change.type === 'remove');
    
    // Apply the edge changes normally
    onEdgesChange(changes);
    
    // Force update if edges were removed to recalculate target values
    if (hasRemovals) {
      setForceUpdate(prev => prev + 1);
    }
  }, [onEdgesChange]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if(!reactFlowBounds) return;

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/label');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      
      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        position,
        data: { label: `${label} Node` },
        type,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes, reactFlowInstance]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Fix the onInit type issue
  const handleReactFlowInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);

  const handleExportMapping = useCallback(() => {
    try {
      downloadBothMappingFiles(nodes, edges, currentMappingName);
      toast.success('Mapping exported successfully!');
    } catch (error) {
      console.error('Failed to export mapping:', error);
      toast.error('Failed to export mapping');
    }
  }, [nodes, edges, currentMappingName]);

  const handleImportMapping = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config: MappingConfiguration = JSON.parse(event.target?.result as string);
        const { nodes: importedNodes, edges: importedEdges } = importMappingConfiguration(config);
        setNodes(importedNodes);
        setEdges(importedEdges);
        setCurrentMappingName(config.name || 'Untitled Mapping');
        toast.success('Mapping imported successfully!');
      } catch (error) {
        console.error('Failed to import mapping:', error);
        toast.error('Failed to import mapping');
      }
    };
    reader.readAsText(file);
  }, [setNodes, setEdges]);

  const handleNewMapping = useCallback((name: string) => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setCurrentMappingName(name);
    fieldStore.resetAll();
    toast.success('New mapping created!');
  }, [setNodes, setEdges, fieldStore]);

  const handleSaveMapping = useCallback((name: string) => {
    setCurrentMappingName(name);
    toast.success('Mapping name updated!');
  }, []);

  const handleExportDocumentation = useCallback(() => {
    try {
      exportMappingDocumentation(nodes, edges, currentMappingName);
      toast.success('Documentation exported successfully!');
    } catch (error) {
      console.error('Failed to export documentation:', error);
      toast.error('Failed to export documentation');
    }
  }, [nodes, edges, currentMappingName]);

  return (
    <ReactFlowProvider>
      <div className="flex h-screen bg-gray-50">
        <DataSidebar 
          side="left"
          title="Sample Data"
          data={sampleData}
          onDataChange={setSampleData}
        />
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={enhancedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-50"
            onInit={handleReactFlowInit}
            onDrop={onDrop}
            onDragOver={onDragOver}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { 
                strokeWidth: 2,
                stroke: '#3b82f6',
                strokeDasharray: '5,5'
              }
            }}
          >
            <Background />
            <Controls />
          </ReactFlow>
          
          <MappingToolbar 
            onAddTransform={addTransformNode}
            onAddMappingNode={addMappingNode}
            onAddSchemaNode={addSchemaNode}
            isExpanded={isToolbarExpanded}
            onToggleExpanded={setIsToolbarExpanded}
          />
          
          <MappingManager 
            onExportMapping={handleExportMapping}
            onImportMapping={handleImportMapping}
            onNewMapping={handleNewMapping}
            onSaveMapping={handleSaveMapping}
            onExportDocumentation={handleExportDocumentation}
            currentMappingName={currentMappingName}
            isExpanded={isManagerExpanded}
            onToggleExpanded={setIsManagerExpanded}
          />
        </div>
      </div>
    </ReactFlowProvider>
  );
};

export default Pipeline;
