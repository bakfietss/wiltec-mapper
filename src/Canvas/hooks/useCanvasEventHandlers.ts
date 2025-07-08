import { useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { toast } from 'sonner';

interface UseCanvasEventHandlersProps {
  addTransformNode: (type: string) => void;
  addMappingNode: () => void;
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  setSampleData: (data: any[]) => void;
}

export const useCanvasEventHandlers = ({
  addTransformNode,
  addMappingNode,
  setNodes,
  setEdges,
  setSampleData
}: UseCanvasEventHandlersProps) => {
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
  }, [addTransformNode, addMappingNode, setNodes, setEdges, setSampleData]);
};