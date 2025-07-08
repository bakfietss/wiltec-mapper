import { useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import { toast } from 'sonner';
import { downloadBothMappingFiles } from '../utils/FileDownloader';
import { importConfiguration } from '../importers/ConfigImporter';
import { exportMappingDocumentation } from '../DocumentationExporter';
import { MappingConfiguration } from '../types/MappingTypes';
import { MappingService } from '../../services/MappingService';
import { useFieldStore } from '../../store/fieldStore';

interface UseMappingOperationsProps {
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  currentMappingName: string;
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

  const handleImportMapping = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config: MappingConfiguration = JSON.parse(event.target?.result as string);
        const { nodes: importedNodes, edges: importedEdges } = importConfiguration(config);
        
        // Enhanced nodes with auto-expansion logic
        setNodes(importedNodes);
        setEdges([]);  // Clear edges first
        
        // Add edges after nodes are rendered and expanded
        setTimeout(() => {
          setEdges(importedEdges);
          setTimeout(() => triggerUpdate('MAPPING_IMPORTED'), 100);
        }, 300);
        
        setCurrentMappingName(config.name || 'Untitled Mapping');
        toast.success('Mapping imported successfully!');
      } catch (error) {
        console.error('Failed to import mapping:', error);
        toast.error('Failed to import mapping');
      }
    };
    reader.readAsText(file);
  }, [setNodes, setEdges, triggerUpdate, setCurrentMappingName]);

  const handleNewMapping = useCallback((name: string) => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setCurrentMappingName(name);
    fieldStore.resetAll();
    toast.success('New mapping created!');
  }, [setNodes, setEdges, fieldStore, setCurrentMappingName]);

  const handleSaveMapping = useCallback(async (name: string) => {
    try {
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
        version: '', // Will be set by MappingService
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
        formattedExecutionConfig
      );

      setCurrentMappingName(name.trim());
      setCurrentMappingVersion(savedMapping.version);
      toast.success(`Mapping "${name}" saved as version ${savedMapping.version}`);
    } catch (error) {
      console.error('Failed to save mapping:', error);
      toast.error(error instanceof Error ? error.message : "Failed to save mapping");
    }
  }, [nodes, edges, userId, setCurrentMappingName, setCurrentMappingVersion]);

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