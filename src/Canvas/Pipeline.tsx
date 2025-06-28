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

// Helper function to check if node is a source-type node
const isSourceNode = (node: any): boolean => {
    return node.type === 'source';
};

// Helper function to check if node is a target-type node  
const isTargetNode = (node: any): boolean => {
    return node.type === 'target';
};

// Get source value from a node
const getSourceValue = (node: any, handleId: string): any => {
    if (!isSourceNode(node)) return null;
    
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

// Apply coalesce transformation with proper rule-based logic
const applyCoalesceTransform = (inputValues: Record<string, any>, nodeData: any): any => {
  const rules = nodeData?.rules || nodeData?.config?.rules || [];
  const defaultValue = nodeData?.defaultValue || nodeData?.config?.defaultValue || '';
  
  console.log('=== COALESCE TRANSFORM CALCULATION ===');
  console.log('Input values received:', inputValues);
  console.log('Rules configuration:', rules);
  console.log('Default value:', defaultValue);
  
  // Try each rule in priority order
  for (const rule of rules.sort((a: any, b: any) => a.priority - b.priority)) {
    console.log(`Checking rule ${rule.priority} (ID: ${rule.id})`);
    
    const inputValue = inputValues[rule.id];
    console.log(`  - Input value for rule ${rule.id}:`, inputValue);
    console.log(`  - Rule output value:`, rule.outputValue);
    
    if (inputValue !== undefined && inputValue !== null && inputValue !== '') {
      console.log(`  - Rule ${rule.priority} matched! Returning output:`, rule.outputValue);
      return rule.outputValue || inputValue;
    }
  }
  
  console.log('No rules matched, returning default value:', defaultValue);
  return defaultValue;
};

// Centralized function to calculate all node field values
const calculateNodeFieldValues = (nodes: any[], edges: any[]) => {
    console.log('=== CALCULATING ALL NODE FIELD VALUES ===');
    console.log('Total nodes:', nodes.length);
    console.log('Total edges:', edges.length);
    
    const updatedNodes = nodes.map(node => {
        if (isTargetNode(node) && node.data?.fields && Array.isArray(node.data.fields)) {
            const fieldValues = calculateTargetFieldValues(node.id, node.data.fields, nodes, edges);
            
            console.log(`Target node ${node.id} field values:`, fieldValues);
            
            return {
                ...node,
                data: {
                    ...node.data,
                    fieldValues,
                }
            };
        } else if (node.type === 'transform' && node.data?.transformType === 'coalesce') {
            // Calculate input values for coalesce nodes to display
            const transformInputEdges = edges.filter(e => e.target === node.id);
            let inputValues: Record<string, any> = {};
            
            console.log(`=== ENHANCING COALESCE NODE ${node.id} ===`);
            console.log('Transform input edges:', transformInputEdges.length);
            
            transformInputEdges.forEach(inputEdge => {
                const inputSourceNode = nodes.find(n => n.id === inputEdge.source);
                
                if (inputSourceNode && isSourceNode(inputSourceNode)) {
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

// Enhanced function to calculate field values for target nodes
const calculateTargetFieldValues = (targetNodeId: string, targetFields: any[], allNodes: any[], allEdges: any[]) => {
    console.log('=== CALCULATING TARGET FIELD VALUES ===');
    console.log('Target Node ID:', targetNodeId);
    console.log('Target Fields:', targetFields?.map(f => ({ id: f.id, name: f.name })));
    
    if (!targetFields || !Array.isArray(targetFields)) {
        console.log('No target fields, returning empty object');
        return {};
    }
    
    const valueMap: Record<string, any> = {};
    
    // Find incoming edges to this target node
    const incomingEdges = allEdges.filter(edge => edge.target === targetNodeId);
    console.log('Incoming edges to target:', incomingEdges.length);
    
    if (incomingEdges.length === 0) {
        console.log('No incoming edges, returning empty valueMap');
        return {};
    }
    
    incomingEdges.forEach(edge => {
        const sourceNode = allNodes.find(n => n.id === edge.source);
        const targetField = targetFields.find(f => f.id === edge.targetHandle);
        
        console.log('Processing edge:', {
            sourceNodeId: edge.source,
            sourceNodeType: sourceNode?.type,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            targetField: targetField?.name
        });
        
        if (!sourceNode || !targetField) {
            console.log('Missing sourceNode or targetField, skipping');
            return;
        }
        
        let value: any = undefined;
        
        // Handle different source node types
        if (isSourceNode(sourceNode)) {
            value = getSourceValue(sourceNode, edge.sourceHandle);
            console.log('Direct source value:', value);
        } else if (sourceNode.type === 'transform' && sourceNode.data?.transformType === 'coalesce') {
            console.log('=== PROCESSING COALESCE TRANSFORM OUTPUT ===');
            console.log('Coalesce node ID:', sourceNode.id);
            console.log('Coalesce node data:', sourceNode.data);
            
            // Get input values for the coalesce transform
            const transformInputEdges = allEdges.filter(e => e.target === sourceNode.id);
            console.log('Transform input edges:', transformInputEdges.length);
            
            let inputValues: Record<string, any> = {};
            
            transformInputEdges.forEach(inputEdge => {
                const inputSourceNode = allNodes.find(n => n.id === inputEdge.source);
                console.log('Processing input edge:', inputEdge.id);
                
                if (inputSourceNode && isSourceNode(inputSourceNode)) {
                    const sourceValue = getSourceValue(inputSourceNode, inputEdge.sourceHandle);
                    inputValues[inputEdge.targetHandle] = sourceValue;
                    console.log(`Mapped input: ${inputEdge.targetHandle} = ${sourceValue}`);
                }
            });
            
            console.log('Final input values for coalesce:', inputValues);
            
            // Apply coalesce transformation
            if (Object.keys(inputValues).length > 0 || sourceNode.data?.rules?.length > 0) {
                value = applyCoalesceTransform(inputValues, sourceNode.data);
                console.log('Coalesce transform result:', value);
            } else {
                console.log('No input values or rules, using default');
                value = sourceNode.data?.defaultValue || sourceNode.data?.config?.defaultValue || '';
            }
        } else if (sourceNode.type === 'staticValue') {
            // Handle static value nodes
            const staticValues = sourceNode.data?.values;
            if (Array.isArray(staticValues)) {
                const staticValue = staticValues.find((v: any) => v.id === edge.sourceHandle);
                if (staticValue) {
                    value = staticValue.value || '';
                }
            } else {
                // Fallback for old single-value static nodes
                value = sourceNode.data?.value || '';
            }
            console.log('Static value:', value);
        }
        
        if (value !== undefined && value !== null && value !== '') {
            valueMap[targetField.id] = value;
            console.log(`Set target field value: ${targetField.name} (${targetField.id}) = ${value}`);
        } else {
            console.log(`No value to set for field: ${targetField.name} (${targetField.id})`);
        }
    });
    
    console.log('Final target valueMap:', valueMap);
    return valueMap;
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

  const fieldStore = useFieldStore();
  const { addSchemaNode, addTransformNode, addMappingNode } = useNodeFactories(nodes, setNodes);

  // Enhanced nodes with calculated field values - recalculate on every nodes/edges change
  const enhancedNodes = useMemo(() => {
    console.log('=== ENHANCED NODES RECALCULATION ===');
    return calculateNodeFieldValues(nodes, edges);
  }, [nodes, edges]);

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
  }, [setEdges]);

  // Enhanced onEdgesChange to handle connection removal
  const handleEdgesChange = useCallback((changes: any[]) => {
    console.log('=== EDGE CHANGES ===');
    console.log('Edge changes:', changes);
    
    // Apply the edge changes normally
    onEdgesChange(changes);
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
            onInit={setReactFlowInstance}
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
