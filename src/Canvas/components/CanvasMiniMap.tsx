import React from 'react';
import { MiniMap } from '@xyflow/react';

const CanvasMiniMap = () => {
  return (
    <div className="bg-background border border-border/30 rounded-xl shadow-xl overflow-hidden pointer-events-auto backdrop-blur-sm" 
         style={{ width: '140px', height: '140px' }}>
      <MiniMap 
        zoomable
        pannable
        nodeStrokeWidth={0}
        style={{ 
          width: '140px', 
          height: '140px',
          background: 'hsl(var(--background))',
          borderRadius: '12px'
        }}
        nodeColor={(node) => {
          switch (node.type) {
            case 'source': return 'hsl(142, 76%, 50%)';
            case 'target': return 'hsl(0, 84%, 60%)';
            case 'transform': return 'hsl(217, 91%, 60%)';
            case 'concat': return 'hsl(38, 92%, 60%)';
            case 'conversionMapping': return 'hsl(262, 83%, 65%)';
            case 'coalesce': return 'hsl(280, 87%, 70%)';
            case 'splitter': return 'hsl(340, 82%, 60%)';
            case 'ifThen': return 'hsl(291, 64%, 50%)';
            case 'staticValue': return 'hsl(199, 89%, 55%)';
            default: return 'hsl(220, 13%, 69%)';
          }
        }}
        nodeClassName="rounded-md"
        maskColor="hsl(var(--muted) / 0.2)"
      />
    </div>
  );
};

export default CanvasMiniMap;