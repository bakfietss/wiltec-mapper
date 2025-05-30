
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
      
      // Get node centers with better positioning
      const sourceCenter = {
        x: sourceNode.position.x + (sourceNode.measured?.width || sourceNode.width || 200) / 2,
        y: sourceNode.position.y + (sourceNode.measured?.height || sourceNode.height || 100) / 2
      };
      
      const targetCenter = {
        x: targetNode.position.x + (targetNode.measured?.width || targetNode.width || 200) / 2,
        y: targetNode.position.y + (targetNode.measured?.height || targetNode.height || 100) / 2
      };
      
      // Create a smooth curve path with better control
      const deltaX = targetCenter.x - sourceCenter.x;
      const deltaY = targetCenter.y - sourceCenter.y;
      
      // Enhanced control points for smoother curves
      const cp1x = sourceCenter.x + deltaX * 0.3;
      const cp1y = sourceCenter.y + deltaY * 0.1;
      const cp2x = targetCenter.x - deltaX * 0.3;
      const cp2y = targetCenter.y - deltaY * 0.1;
      
      const path = `M ${sourceCenter.x} ${sourceCenter.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetCenter.x} ${targetCenter.y}`;
      
      // Enhanced color coding based on node types
      let color = '#e2e8f0'; // default light gray
      
      if (sourceNode.type === 'editableSchema' && sourceNode.data?.schemaType === 'source') {
        if (targetNode.type === 'editableSchema' && targetNode.data?.schemaType === 'target') {
          color = '#3b82f6'; // blue for direct source to target
        } else if (targetNode.type === 'conversionMapping') {
          color = '#f59e0b'; // amber for mapping
        } else if (targetNode.type === 'editableTransform' || targetNode.type === 'splitterTransform') {
          color = '#8b5cf6'; // purple for transforms
        }
      } else if (sourceNode.type === 'conversionMapping') {
        color = '#f97316'; // orange for mapping output
      } else if (sourceNode.type === 'editableTransform' || sourceNode.type === 'splitterTransform') {
        color = '#10b981'; // emerald for transform output
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
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden'
      }}
    >
      <svg
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {pipelinePaths.map(({ id, path, color }) => (
          <g key={id}>
            {/* Background glow */}
            <path
              d={path}
              stroke={color}
              strokeWidth="12"
              fill="none"
              opacity="0.2"
              strokeLinecap="round"
              filter="url(#glow)"
            />
            {/* Main path */}
            <path
              d={path}
              stroke={color}
              strokeWidth="6"
              fill="none"
              opacity="0.6"
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>
    </div>
  );
};
