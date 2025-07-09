import { useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import { toast } from 'sonner';
import { downloadBothMappingFiles } from '../utils/FileDownloader';
import { importConfiguration } from '../importers/ConfigImporter';
import { exportMappingDocumentation } from '../DocumentationExporter';
import { MappingConfiguration } from '../types/MappingTypes';
import { MappingService } from '../../services/MappingService';
import { useFieldStore } from '../../store/fieldStore';
import { calculateNodeFieldValues } from '../../hooks/useNodeValueUpdates';

interface UseMappingOperationsProps {
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  currentMappingName: string;
  currentMappingVersion: string;
  setCurrentMappingName: (name: string) => void;
  setCurrentMappingVersion: (version: string) => void;
  triggerUpdate: (reason: string) => void;
  userId: string;
}

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'source',
    data: { label: 'Source 1' },
    position: { x: 50, y: 50 },
  },
];

const initialEdges: Edge[] = [];

export const useMappingOperations = ({
  nodes,
  edges,
  setNodes,
  setEdges,
  currentMappingName,
  currentMappingVersion,
  setCurrentMappingName,
  setCurrentMappingVersion,
  triggerUpdate,
  userId
}: UseMappingOperationsProps) => {
  const fieldStore = useFieldStore();

  const handleExportMapping = useCallback(() => {
    try {
      downloadBothMappingFiles(nodes, edges, currentMappingName);
      toast.success('Mapping exported successfully!');
    } catch (error) {
      console.error('Failed to export mapping:', error);
      toast.error('Failed to export mapping');
    }
  }, [nodes, edges, currentMappingName]);

  // Unified function for loading any UI config (from file or database)
  const loadUIConfig = useCallback((uiConfig: any, mappingName?: string, fromSource?: string) => {
    console.log(`=== LOADING UI CONFIG FROM ${fromSource || 'UNKNOWN'} ===`);
    console.log('UI Config:', uiConfig);
    
    const { nodes: importedNodes, edges: importedEdges } = importConfiguration(uiConfig);
    console.log('Imported nodes:', importedNodes);
    console.log('Imported edges:', importedEdges);
    
    // Set nodes first
    setNodes(importedNodes);
    setEdges([]);  // Clear edges first
    
    // Add edges and directly calculate values with auto-expansion
    setTimeout(() => {
      console.log('=== SETTING EDGES AND CALCULATING VALUES ===');
      setEdges(importedEdges);
      
      // Directly calculate field values and auto-expand
      setTimeout(() => {
        console.log('=== DIRECTLY CALCULATING FIELD VALUES ===');
        const enhancedNodes = calculateNodeFieldValues(importedNodes, importedEdges);
        
        // Auto-expand target node fields that have connections to nested fields
        const finalNodes = enhancedNodes.map(node => {
          if (node.type === 'target' && node.data?.fields) {
            const fieldsToExpand = new Set<string>();
            
            // Check which target fields have incoming connections
            const targetConnections = importedEdges.filter(edge => edge.target === node.id);
            console.log(`Target node ${node.id} has ${targetConnections.length} connections`);
            
            targetConnections.forEach(edge => {
              const targetFieldId = edge.targetHandle;
              
              // Find the field and check if it's nested
              const findFieldAndParents = (fields: any[], fieldId: string, path: string[] = []): string[] => {
                for (const field of fields) {
                  if (field.id === fieldId) {
                    return path;
                  }
                  if (field.children) {
                    const childPath = findFieldAndParents(field.children, fieldId, [...path, field.id]);
                    if (childPath.length > 0) {
                      return childPath;
                    }
                  }
                }
                return [];
              };
              
              const parentPath = findFieldAndParents(node.data.fields, targetFieldId);
              parentPath.forEach(parentId => fieldsToExpand.add(parentId));
            });
            
            console.log(`Auto-expanding fields for target ${node.id}:`, Array.from(fieldsToExpand));
            
            // Add initialExpandedFields to node data
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
        
        console.log(`Final nodes with auto-expansion from ${fromSource}:`, finalNodes.filter(n => n.type === 'target').map(n => ({
          id: n.id,
          fieldValues: n.data?.fieldValues,
          initialExpandedFields: n.data?.initialExpandedFields,
          hasFieldValues: !!n.data?.fieldValues && Object.keys(n.data.fieldValues).length > 0
        })));
        
        // Update nodes with calculated values and expansion info
        setNodes(finalNodes);
        triggerUpdate(fromSource === 'FILE' ? 'MAPPING_IMPORTED' : 'MAPPING_LOADED_FROM_DB');
      }, 100);
    }, 300);
    
    if (mappingName) {
      setCurrentMappingName(mappingName);
    }
  }, [setNodes, setEdges, triggerUpdate, setCurrentMappingName]);

  const handleImportMapping = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config: MappingConfiguration = JSON.parse(event.target?.result as string);
        loadUIConfig(config, config.name || 'Untitled Mapping', 'FILE');
        toast.success('Mapping imported successfully!');
      } catch (error) {
        console.error('Failed to import mapping:', error);
        toast.error('Failed to import mapping');
      }
    };
    reader.readAsText(file);
  }, [loadUIConfig]);

  const handleNewMapping = useCallback((name: string) => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setCurrentMappingName(name);
    fieldStore.resetAll();
    toast.success('New mapping created!');
  }, [setNodes, setEdges, fieldStore, setCurrentMappingName]);

  const handleSaveMapping = useCallback(async (name: string) => {
    try {
      // Generate next version locally
      let nextVersion = 'v1.01';
      if (currentMappingVersion) {
        const currentNum = parseFloat(currentMappingVersion.substring(1));
        const nextNum = currentNum + 0.01;
        nextVersion = `v${nextNum.toFixed(2)}`;
      }

      // Dynamic imports to avoid circular dependencies
      const [{ exportUIMappingConfiguration }, { exportExecutionMapping }] = await Promise.all([
        import('../exporters/UIConfigExporter'),
        import('../exporters/ExecutionConfigExporter')
      ]);
      
      const uiConfig = exportUIMappingConfiguration(nodes, edges, name.trim());
      const executionConfig = exportExecutionMapping(nodes, edges, name.trim());
      
      // Convert executionConfig to match interface format
      const formattedExecutionConfig = {
        name: name.trim(),
        version: nextVersion,
        category: 'General',
        mappings: executionConfig.mappings || [],
        arrays: executionConfig.arrays || [],
        metadata: executionConfig.metadata
      };
      
      const savedMapping = await MappingService.saveMapping(
        name.trim(),
        nodes,
        edges,
        userId,
        'General',
        undefined,
        undefined,
        formattedExecutionConfig,
        nextVersion // Pass the version we calculated
      );

      setCurrentMappingName(name.trim());
      setCurrentMappingVersion(savedMapping.version);
      toast.success(`Mapping "${name}" saved as version ${savedMapping.version}`);
    } catch (error) {
      console.error('Failed to save mapping:', error);
      toast.error(error instanceof Error ? error.message : "Failed to save mapping");
    }
  }, [nodes, edges, userId, currentMappingVersion, setCurrentMappingName, setCurrentMappingVersion]);

  const handleExportDocumentation = useCallback(() => {
    try {
      exportMappingDocumentation(nodes, edges, currentMappingName);
      toast.success('Documentation exported successfully!');
    } catch (error) {
      console.error('Failed to export documentation:', error);
      toast.error('Failed to export documentation');
    }
  }, [nodes, edges, currentMappingName]);

  return {
    handleExportMapping,
    handleImportMapping,
    handleNewMapping,
    handleSaveMapping,
    handleExportDocumentation
  };
};