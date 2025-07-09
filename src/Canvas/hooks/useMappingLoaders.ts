import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Node, Edge } from '@xyflow/react';
import { toast } from 'sonner';
import { importConfiguration } from '../importers/ConfigImporter';
import { calculateNodeFieldValues } from '../../hooks/useNodeValueUpdates';

interface UseMappingLoadersProps {
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  setSampleData: (data: any[]) => void;
  setCurrentMappingName: (name: string) => void;
  setCurrentMappingVersion: (version: string) => void;
  triggerUpdate: (reason: string) => void;
}

export const useMappingLoaders = ({
  setNodes,
  setEdges,
  setSampleData,
  setCurrentMappingName,
  setCurrentMappingVersion,
  triggerUpdate
}: UseMappingLoadersProps) => {
  const location = useLocation();

  // AI-generated mapping loader
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
  }, [setNodes, setEdges, setSampleData, setCurrentMappingName]);

  // Database mapping loader (from My Mappings)
  useEffect(() => {
    const state = location.state as any;
    if (state?.mappingToLoad) {
      try {
        const { mappingToLoad } = state;
        console.log('=== LOADING FROM MY MAPPINGS ===');
        console.log('Raw mapping from database:', mappingToLoad);
        
        // Extract UI config from the saved mapping and use proper import logic
        const uiConfig = mappingToLoad.ui_config;
        console.log('UI Config from database:', uiConfig);
        
        if (uiConfig && uiConfig.nodes && uiConfig.edges) {
          // Use the ConfigImporter to properly import with auto-expansion logic
          const { nodes, edges } = importConfiguration(uiConfig);
          
          console.log('=== AFTER IMPORT CONFIGURATION ===');
          console.log('Imported nodes:', nodes);
          console.log('Target nodes with fieldValues:', nodes.filter(n => n.type === 'target').map(n => ({
            id: n.id,
            fieldValues: n.data?.fieldValues,
            hasFieldValues: !!n.data?.fieldValues && Object.keys(n.data.fieldValues).length > 0
          })));
          console.log('Imported edges:', edges);
          
          // Set nodes first
          setNodes(nodes);
          setEdges([]);  // Clear edges first
          
          // Add edges and directly calculate values
          setTimeout(() => {
            console.log('=== SETTING EDGES AND CALCULATING VALUES ===');
            setEdges(edges);
            
            // Directly calculate field values instead of relying on trigger system
            setTimeout(() => {
              console.log('=== DIRECTLY CALCULATING FIELD VALUES ===');
              const enhancedNodes = calculateNodeFieldValues(nodes, edges);
              console.log('Enhanced nodes with calculated values:', enhancedNodes);
              console.log('Target nodes after calculation:', enhancedNodes.filter(n => n.type === 'target').map(n => ({
                id: n.id,
                fieldValues: n.data?.fieldValues,
                hasFieldValues: !!n.data?.fieldValues && Object.keys(n.data.fieldValues).length > 0
              })));
              
              // Update nodes with calculated values
              setNodes(enhancedNodes);
              triggerUpdate('MAPPING_LOADED_FROM_DB');
            }, 100);
          }, 300);
          
          setCurrentMappingName(mappingToLoad.name);
          setCurrentMappingVersion(mappingToLoad.version);
          
          // Load sample data if available in source nodes
          const sourceNodes = nodes.filter((node: any) => node.type === 'source');
          if (sourceNodes.length > 0 && sourceNodes[0].data?.data) {
            console.log('Loading sample data:', sourceNodes[0].data.data);
            setSampleData(Array.isArray(sourceNodes[0].data.data) ? sourceNodes[0].data.data : []);
          }
          
          toast.success(`Mapping "${mappingToLoad.name}" loaded for editing`);
        } else {
          console.error('Invalid UI config structure:', uiConfig);
          toast.error('Invalid mapping configuration');
        }
      } catch (error) {
        console.error('Failed to load mapping from My Mappings:', error);
        toast.error('Failed to load mapping');
      }
      
      // Clear the state to prevent re-loading on subsequent renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state, setNodes, setEdges, setSampleData, setCurrentMappingName, setCurrentMappingVersion, triggerUpdate]);
};