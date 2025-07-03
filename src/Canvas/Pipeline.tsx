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

import { nodeTypes, useNodeFactories } from './NodeFactories';
import { useFieldStore } from '../store/fieldStore';
import DataSidebar from '../compontents/DataSidebar';
import MappingToolbar from '../compontents/MappingToolbar';
import MappingManager from '../compontents/MappingManager';
import { downloadBothMappingFiles } from './utils/FileDownloader';
import { importConfiguration } from './importers/ConfigImporter';
import { MappingConfiguration } from './types/MappingTypes';
import { exportMappingDocumentation } from './DocumentationExporter';
import { useNodeValueUpdates } from '../hooks/useNodeValueUpdates';
import { useManualUpdateTrigger } from '../hooks/useManualUpdateTrigger';
import { toast } from 'sonner';
import AiChatAssistant from '../components/AiChatAssistant';

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
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [currentMappingName, setCurrentMappingName] = useState<string>('Untitled Mapping');
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const [isManagerExpanded, setIsManagerExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Check for AI-generated mapping on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromAI = urlParams.get('from');
    
    if (fromAI === 'ai-generated') {
      const aiMapping = localStorage.getItem('ai-generated-mapping');
      if (aiMapping) {
        try {
          const { nodes: aiNodes, edges: aiEdges, sourceData } = JSON.parse(aiMapping);
          setNodes(aiNodes);
          setEdges(aiEdges);
          setSampleData(sourceData || []);
          setCurrentMappingName('AI Generated Mapping');
          localStorage.removeItem('ai-generated-mapping');
          toast.success('AI-generated mapping loaded successfully!');
        } catch (error) {
          console.error('Failed to load AI-generated mapping:', error);
          toast.error('Failed to load AI-generated mapping');
        }
      }
    } else if (fromAI === 'ai-suggestions') {
      const aiSuggestions = localStorage.getItem('ai-suggestions');
      if (aiSuggestions) {
        try {
          const { sourceData } = JSON.parse(aiSuggestions);
          setSampleData(sourceData || []);
          localStorage.removeItem('ai-suggestions');
          toast.success('AI suggestions available for manual refinement');
        } catch (error) {
          console.error('Failed to load AI suggestions:', error);
        }
      }
    }
  }, [setNodes, setEdges]);

  // Listen for custom events from Index page
  useEffect(() => {
    const handleAddTransformNode = (event: CustomEvent) => {
      const { type } = event.detail;
      addTransformNode(type);
    };

    const handleAddMappingNode = () => {
      addMappingNode();
    };

    const handleLoadTemplateConversion = (event: CustomEvent) => {
      const { nodes: templateNodes, edges: templateEdges, sourceData } = event.detail;
      
      console.log('Loading template conversion:', { templateNodes, templateEdges, sourceData });
      
      // Replace current nodes and edges with the converted ones
      setNodes(templateNodes);
      setEdges(templateEdges);
      
      // Update sample data if provided
      if (sourceData && sourceData.length > 0) {
        setSampleData(sourceData);
      }
      
      toast.success('Visual mapping loaded from template!');
    };

    window.addEventListener('addTransformNode', handleAddTransformNode as EventListener);
    window.addEventListener('addMappingNode', handleAddMappingNode);
    window.addEventListener('loadTemplateConversion', handleLoadTemplateConversion as EventListener);

    return () => {
      window.removeEventListener('addTransformNode', handleAddTransformNode as EventListener);
      window.removeEventListener('addMappingNode', handleAddMappingNode);
      window.removeEventListener('loadTemplateConversion', handleLoadTemplateConversion as EventListener);
    };
  }, [addTransformNode, addMappingNode]);

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
        const { nodes: importedNodes, edges: importedEdges } = importConfiguration(config);
        setNodes(importedNodes);
        setEdges(importedEdges);
        setCurrentMappingName(config.name || 'Untitled Mapping');
        setTimeout(() => triggerUpdate('MAPPING_IMPORTED'), 100);
        toast.success('Mapping imported successfully!');
      } catch (error) {
        console.error('Failed to import mapping:', error);
        toast.error('Failed to import mapping');
      }
    };
    reader.readAsText(file);
  }, [setNodes, setEdges, triggerUpdate]);

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
      <div className={`flex h-screen bg-gray-50 w-full ${isFullscreen ? 'fullscreen-mode' : ''}`}>
        {/* Hide sidebar in fullscreen mode */}
        {!isFullscreen && (
          <DataSidebar 
            side="left"
            title="Sample Data"
            data={sampleData}
            onDataChange={setSampleData}
          />
        )}
        <div className="flex-1 relative overflow-hidden" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={enhancedNodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-50 w-full h-full"
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
              
              {/* Small square minimap below controls */}
              <div className="bg-white/95 border border-gray-200 rounded-lg shadow-lg overflow-hidden pointer-events-auto" style={{ width: '120px', height: '120px' }}>
                <MiniMap 
                  zoomable
                  pannable
                  nodeStrokeWidth={2}
                  style={{ 
                    width: '120px', 
                    height: '120px',
                    background: 'transparent'
                  }}
                  nodeColor={(node) => {
                    switch (node.type) {
                      case 'source': return '#22c55e';
                      case 'target': return '#ef4444';
                      case 'transform': return '#3b82f6';
                      case 'concat': return '#f59e0b';
                      case 'conversionMapping': return '#8b5cf6';
                      default: return '#6b7280';
                    }
                  }}
                  nodeClassName={(node) => 'minimap-node'}
                  maskColor="rgba(255, 255, 255, 0.1)"
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
