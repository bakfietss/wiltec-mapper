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
import { downloadBothMappingFiles } from './utils/FileDownloader';
import { importConfiguration } from './importers/ConfigImporter';
import { MappingConfiguration } from './types/MappingTypes';
import { exportMappingDocumentation } from './DocumentationExporter';
import { useNodeValueUpdates } from '../hooks/useNodeValueUpdates';
import { useManualUpdateTrigger } from '../hooks/useManualUpdateTrigger';
import { toast } from 'sonner';
import AiChatAssistant from '../components/AiChatAssistant';
import CanvasMiniMap from './components/CanvasMiniMap';
import { MappingService } from '../services/MappingService';
import { useAuth } from '../contexts/AuthContext';

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
  const [currentMappingVersion, setCurrentMappingVersion] = useState<string>('');
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

      // Check for mapping to load from Control Panel edit button
  useEffect(() => {
    const state = location.state as any;
    if (state?.mappingToLoad) {
      try {
        const { mappingToLoad } = state;
        console.log('Loading mapping from Control Panel:', mappingToLoad);
        console.log('=== DEBUGGING LOADED MAPPING ===');
        console.log('UI Config nodes:', mappingToLoad.ui_config?.nodes);
        console.log('UI Config edges:', mappingToLoad.ui_config?.edges);
        
        // Extract UI config from the saved mapping
        const uiConfig = mappingToLoad.ui_config;
        if (uiConfig && uiConfig.nodes && uiConfig.edges) {
          console.log('Setting nodes first...');
          setNodes(uiConfig.nodes);
          setEdges([]);  // Clear edges first
          
          // Debug: Check what handle IDs should exist
          const sourceNodes = uiConfig.nodes.filter((node: any) => node.type === 'source');
          sourceNodes.forEach((node: any) => {
            console.log('Source node data:', node.data);
            if (node.data?.data && node.data.data.length > 0) {
              console.log('Sample data structure:', Object.keys(node.data.data[0]));
            }
            if (node.data?.fields) {
              console.log('Manual fields:', node.data.fields.map((f: any) => ({ id: f.id, name: f.name })));
            }
          });
          
          uiConfig.edges.forEach((edge: any) => {
            console.log('Edge to be loaded:', {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              sourceHandle: edge.sourceHandle,
              targetHandle: edge.targetHandle
            });
          });
          
          // Add edges with proper delay to ensure handles are ready
          setTimeout(() => {
            console.log('Setting edges...');
            setEdges(uiConfig.edges);
            // Trigger update after edges are loaded to ensure connections are processed
            setTimeout(() => {
              console.log('Triggering update...');
              triggerUpdate('MAPPING_LOADED_FROM_DB');
            }, 100);
          }, 200); // Reduced delay since handles should be created properly now
          
          setCurrentMappingName(mappingToLoad.name);
          setCurrentMappingVersion(mappingToLoad.version);
          
          // Load sample data if available in source nodes
          if (sourceNodes.length > 0 && sourceNodes[0].data?.data) {
            console.log('Loading sample data:', sourceNodes[0].data.data);
            setSampleData(sourceNodes[0].data.data);
          }
          
          toast.success(`Mapping "${mappingToLoad.name}" loaded for editing`);
        } else {
          toast.error('Invalid mapping configuration');
        }
      } catch (error) {
        console.error('Failed to load mapping from Control Panel:', error);
        toast.error('Failed to load mapping');
      }
      
      // Clear the state to prevent re-loading on subsequent renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state, setNodes, setEdges]);

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
        
        console.log('=== MAPPING IMPORT DEBUG ===');
        console.log('Imported nodes:', importedNodes.length);
        console.log('Imported edges:', importedEdges.length);
        
        // Log source nodes and their initial expanded fields
        importedNodes.forEach(node => {
          if (node.type === 'source') {
            console.log(`Source node ${node.id} initialExpandedFields:`, node.data?.initialExpandedFields);
          }
        });
        
        // AUDIT TRAIL: Analyze edges to determine which source fields need expansion
        console.log('=== IMPORT EXPANSION AUDIT TRAIL ===');
        console.log('Total imported edges:', importedEdges.length);
        
        const sourceFieldsToExpand = new Map<string, Set<string>>();
        importedEdges.forEach((edge, index) => {
          console.log(`Edge ${index + 1}:`, {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle
          });
          
          if (edge.sourceHandle) {
            const sourceNodeId = edge.source;
            if (!sourceFieldsToExpand.has(sourceNodeId)) {
              sourceFieldsToExpand.set(sourceNodeId, new Set());
            }
            
            const fieldPath = edge.sourceHandle;
            console.log(`🔍 Analyzing path: ${fieldPath}`);
            
            // Split by dots and handle array indices - but don't expand indexed paths
            const pathParts = fieldPath.split('.');
            console.log('Path parts:', pathParts);
            
            // Build parent paths, but strip array indices to avoid duplicates
            for (let i = 0; i < pathParts.length - 1; i++) {
              let parentPath = pathParts.slice(0, i + 1).join('.');
              
              // Remove array indices like [0] to get just the base array name
              const cleanPath = parentPath.replace(/\[.*?\]/g, '');
              
              if (cleanPath) {
                sourceFieldsToExpand.get(sourceNodeId)!.add(cleanPath);
                console.log(`📂 Will expand (cleaned): ${cleanPath}`);
              }
            }
          } else {
            console.log('⚠️ Edge has no sourceHandle - skipping');
          }
        });
        
        // Summary of what will be expanded
        sourceFieldsToExpand.forEach((fieldsSet, nodeId) => {
          console.log(`📋 Node ${nodeId} will expand:`, Array.from(fieldsSet));
        });
        
        // Apply auto-expansion to source nodes based on their connections
        const enhancedNodes = importedNodes.map(node => {
          if (node.type === 'source' && sourceFieldsToExpand.has(node.id)) {
            const fieldsToExpand = sourceFieldsToExpand.get(node.id)!;
            console.log(`Auto-expanding fields for source ${node.id}:`, Array.from(fieldsToExpand));
            return {
              ...node,
              data: {
                ...node.data,
                initialExpandedFields: fieldsToExpand
              }
            };
          }
          return node;
        });
        
        // Import enhanced nodes first, then edges after a small delay to ensure handles are ready
        setNodes(enhancedNodes);
        setEdges([]);  // Clear edges first
        
        // Add edges after nodes are rendered and expanded
        setTimeout(() => {
          console.log('Setting imported edges...');
          setEdges(importedEdges);
          setTimeout(() => triggerUpdate('MAPPING_IMPORTED'), 100);
        }, 300); // Delay to ensure expansion happens first
        
        setCurrentMappingName(config.name || 'Untitled Mapping');
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

  const handleSaveMapping = async (name: string) => {
    console.log('=== SAVE MAPPING CALLED ===');
    console.log('Name:', name);
    console.log('User:', user);
    console.log('Nodes count:', nodes.length);
    console.log('Edges count:', edges.length);
    
    if (!user) {
      console.log('❌ No user - showing error');
      toast.error('Please log in to save mappings');
      return;
    }

    if (!name?.trim()) {
      console.log('❌ No name - showing error');
      toast.error('Mapping name is required');
      return;
    }

    console.log('✅ Starting save process...');
    try {
      // Generate the UI and execution configs using the same exporters as the export button
      const { exportUIMappingConfiguration } = await import('./exporters/UIConfigExporter');
      const { exportExecutionMapping } = await import('./exporters/ExecutionConfigExporter');
      
      const uiConfig = exportUIMappingConfiguration(nodes, edges, name.trim());
      const executionConfig = exportExecutionMapping(nodes, edges, name.trim());
      
      console.log('Generated configs:', { uiConfig, executionConfig });
      
      // Convert executionConfig to match interface
      const formattedExecutionConfig = {
        name: name.trim(),
        version: 'v1.01',
        category: 'General',
        mappings: executionConfig.mappings || [],
        arrays: executionConfig.arrays || [],
        metadata: executionConfig.metadata
      };
      
      // Save to database using MappingService
      const savedMapping = await MappingService.saveMapping(
        name.trim(),
        nodes,
        edges,
        user.id,
        'General', // default category
        undefined, // description
        undefined, // tags
        formattedExecutionConfig // execution config
      );

      console.log('✅ Mapping saved successfully:', savedMapping);
      setCurrentMappingName(name.trim());
      setCurrentMappingVersion(savedMapping.version);
      toast.success(`Mapping "${name}" saved as version ${savedMapping.version}`);
    } catch (error) {
      console.error('❌ Failed to save mapping:', error);
      toast.error(error instanceof Error ? error.message : "Failed to save mapping");
    }
  };

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
              
              {/* Custom minimap component */}
              <CanvasMiniMap />
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
