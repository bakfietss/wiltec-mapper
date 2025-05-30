
import React, { useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';

interface SmartPipelineProps {
  nodes: Node[];
  edges: Edge[];
}

export const SmartPipeline: React.FC<SmartPipelineProps> = ({ nodes, edges }) => {
  const pipelinePaths = useMemo(() => {
    const paths: Array<{
      id: string;
      path: string;
      color: string;
    }> = [];

    // Group edges by their connection chains
    const processedEdges = new Set<string>();
    
    edges.forEach(edge => {
      if (processedEdges.has(edge.id)) return;
      
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) return;
      
      // Get node centers
      const sourceCenter = {
        x: sourceNode.position.x + (sourceNode.measured?.width || 200) / 2,
        y: sourceNode.position.y + (sourceNode.measured?.height || 100) / 2
      };
      
      const targetCenter = {
        x: targetNode.position.x + (targetNode.measured?.width || 200) / 2,
        y: targetNode.position.y + (targetNode.measured?.height || 100) / 2
      };
      
      // Create a smooth curve path
      const deltaX = targetCenter.x - sourceCenter.x;
      const deltaY = targetCenter.y - sourceCenter.y;
      
      // Control points for bezier curve
      const cp1x = sourceCenter.x + deltaX * 0.5;
      const cp1y = sourceCenter.y;
      const cp2x = targetCenter.x - deltaX * 0.5;
      const cp2y = targetCenter.y;
      
      const path = `M ${sourceCenter.x} ${sourceCenter.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetCenter.x} ${targetCenter.y}`;
      
      // Determine color based on node types
      let color = '#e2e8f0'; // default light gray
      
      if (sourceNode.type === 'editableSchema' && sourceNode.data?.schemaType === 'source') {
        if (targetNode.type === 'editableSchema' && targetNode.data?.schemaType === 'target') {
          color = '#bfdbfe'; // light blue for direct source to target
        } else if (targetNode.type === 'conversionMapping') {
          color = '#fde68a'; // light yellow for mapping
        } else if (targetNode.type === 'editableTransform' || targetNode.type === 'splitterTransform') {
          color = '#d8b4fe'; // light purple for transforms
        }
      } else if (sourceNode.type === 'conversionMapping') {
        color = '#fed7aa'; // light orange for mapping output
      } else if (sourceNode.type === 'editableTransform' || sourceNode.type === 'splitterTransform') {
        color = '#bbf7d0'; // light green for transform output
      }
      
      paths.push({
        id: edge.id,
        path,
        color
      });
      
      processedEdges.add(edge.id);
    });
    
    return paths;
  }, [nodes, edges]);

  if (pipelinePaths.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    >
      {pipelinePaths.map(({ id, path, color }) => (
        <path
          key={id}
          d={path}
          stroke={color}
          strokeWidth="8"
          fill="none"
          opacity="0.3"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};
