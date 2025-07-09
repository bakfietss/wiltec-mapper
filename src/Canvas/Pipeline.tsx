import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
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
import { useLocation } from 'react-router-dom';

import { nodeTypes, useNodeFactories } from './NodeFactories';
import { useFieldStore } from '../store/fieldStore';
import DataSidebar from '../components/nodes/DataSidebar';
import MappingToolbar from '../components/nodes/MappingToolbar';
import MappingManager from '../components/nodes/MappingManager';
import { useNodeValueUpdates } from '../hooks/useNodeValueUpdates';
import { useManualUpdateTrigger } from '../hooks/useManualUpdateTrigger';
import AiChatAssistant from '../components/AiChatAssistant';
import { useAuth } from '../contexts/AuthContext';
import { useMappingLoaders } from './hooks/useMappingLoaders';
import { useCanvasEventHandlers } from './hooks/useCanvasEventHandlers';
import { useClickOutsideHandler } from './hooks/useClickOutsideHandler';
import { useMappingOperations } from './hooks/useMappingOperations';

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'source',
    data: { label: 'Source 1' },
    position: { x: 50, y: 50 },
  },
];

const initialEdges: Edge[] = [];

const Pipeline = () => {
  console.log('🚀 Pipeline component mounting');
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [currentMappingName, setCurrentMappingName] = useState<string>('Untitled Mapping');
  const [currentMappingVersion, setCurrentMappingVersion] = useState<string>('');
  const [currentCategory, setCurrentCategory] = useState<string>('General');
  const [currentTransformType, setCurrentTransformType] = useState<string>('JsonToJson');

  // Load session data on component mount
  useEffect(() => {
    const sessionData = JSON.parse(sessionStorage.getItem('currentMappingSession') || '{}');
    if (sessionData.name) {
      setCurrentMappingName(sessionData.name);
      setCurrentCategory(sessionData.category || 'General');
      setCurrentTransformType(sessionData.transformType || 'JsonToJson');
    }
  }, []);
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const [isManagerExpanded, setIsManagerExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const fieldStore = useFieldStore();
  const { addSchemaNode, addTransformNode, addMappingNode } = useNodeFactories(nodes, setNodes);

  // Centralized update system - FIXED to pass edges
  const { updateTrigger, triggerUpdate } = useManualUpdateTrigger();
  const { enhancedNodes } = useNodeValueUpdates(updateTrigger, nodes, edges);

  // Use custom hooks for different loading scenarios
  useMappingLoaders({
    setNodes,
    setEdges,
    setSampleData,
    setCurrentMappingName,
    setCurrentMappingVersion,
    triggerUpdate
  });

  useCanvasEventHandlers({
    addTransformNode,
    addMappingNode,
    setNodes,
    setEdges,
    setSampleData
  });

  useClickOutsideHandler({
    reactFlowWrapper,
    setIsToolbarExpanded,
    setIsManagerExpanded
  });

  // Use mapping operations hook for save/export functionality
  const {
    handleExportMapping,
    handleImportMapping,
    handleNewMapping,
    handleSaveMapping,
    handleExportDocumentation
  } = useMappingOperations({
    nodes,
    edges,
    setNodes,
    setEdges,
    currentMappingName,
    currentMappingVersion,
    setCurrentMappingName,
    setCurrentMappingVersion,
    triggerUpdate,
    userId: user?.id || ''
  });

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
    
    // Trigger immediate update after connection
    setTimeout(() => triggerUpdate('CONNECTION_CREATED'), 50);
  }, [setEdges, triggerUpdate]);

  const handleEdgesChange = useCallback((changes: any[]) => {
    console.log('=== EDGE CHANGES ===');
    console.log('Edge changes:', changes);
    
    onEdgesChange(changes);
    
    const hasRemovals = changes.some(change => change.type === 'remove');
    const hasAdditions = changes.some(change => change.type === 'add');
    
    if (hasRemovals || hasAdditions) {
      setTimeout(() => triggerUpdate('EDGE_CHANGED'), 50);
    }
  }, [onEdgesChange, triggerUpdate]);

  const handleNodesChange = useCallback((changes: any[]) => {
    console.log('=== NODE CHANGES ===');
    console.log('Node changes:', changes);
    
    onNodesChange(changes);
    
    const hasDataUpdates = changes.some(change => 
      change.type === 'replace' || 
      (change.type === 'add') ||
      (change.type === 'remove')
    );
    
    if (hasDataUpdates) {
      setTimeout(() => triggerUpdate('NODE_DATA_CHANGED'), 50);
    }
  }, [onNodesChange, triggerUpdate]);

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

  const handleReactFlowInit = useCallback((instance: ReactFlowInstance) => {
    setReactFlowInstance(instance);
  }, []);

  return (
    <ReactFlowProvider>
      <div className={`h-screen w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'flex bg-background'}`}>
        {/* Hide sidebar in fullscreen mode */}
        {!isFullscreen && (
          <DataSidebar 
            side="left"
            title="Sample Data"
            data={sampleData}
            onDataChange={setSampleData}
          />
        )}
        <div className={`${isFullscreen ? 'w-full h-full' : 'flex-1'} relative overflow-hidden`} ref={reactFlowWrapper}>
          <ReactFlow
            nodes={enhancedNodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-background w-full h-full"
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
            
            {/* Custom positioned controls and minimap at bottom left */}
            <div className="absolute bottom-4 left-4 z-50 flex flex-col gap-3 pointer-events-none">
              {/* Controls positioned horizontally above minimap */}
              <div className="flex justify-start pointer-events-auto">
                <Controls 
                  showZoom={true}
                  showFitView={true}
                  showInteractive={false}
                  position="bottom-left"
                  style={{ 
                    position: 'static',
                    transform: 'none',
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                    display: 'flex',
                    flexDirection: 'row'
                  }}
                />
              </div>
            </div>
          </ReactFlow>
          
          {/* Hide toolbars in fullscreen mode */}
          {!isFullscreen && (
            <>
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
                currentMappingVersion={currentMappingVersion}
                currentCategory={currentCategory}
                currentTransformType={currentTransformType}
                isExpanded={isManagerExpanded}
                onToggleExpanded={setIsManagerExpanded}
              />
              
              <AiChatAssistant />
            </>
          )}
        </div>
      </div>
    </ReactFlowProvider>
  );
};

export default Pipeline;
