
import React, { useState } from 'react';
import { Plus, Database, ArrowRightLeft, Zap, Hash, GitBranch } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';

interface MappingToolbarProps {
  onAddSchemaNode: (type: 'source' | 'target') => void;
  onAddTransform: (transformType: string) => void;
  onAddMappingNode: () => void;
  isExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
}

const MappingToolbar: React.FC<MappingToolbarProps> = ({
  onAddSchemaNode,
  onAddTransform,
  onAddMappingNode,
  isExpanded,
  onToggleExpanded,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const transformTypes = [
    { name: 'Text Splitter', icon: ArrowRightLeft },
    { name: 'Static Value', icon: Hash },
    { name: 'IF-THEN', icon: GitBranch },
  ];

  return (
    <div 
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white rounded-lg shadow-lg border p-2"
      data-toolbar="mapping-toolbar"
    >
      <div className="flex items-center gap-2">
        <button
          onClick={() => onAddSchemaNode('source')}
          className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
        >
          <Database className="w-4 h-4" />
          Source Schema
        </button>

        <button
          onClick={() => onAddSchemaNode('target')}
          className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
        >
          <Database className="w-4 h-4" />
          Target Schema
        </button>

        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm">
              <Zap className="w-4 h-4" />
              Add Transform
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            {transformTypes.map((transform) => {
              const IconComponent = transform.icon;
              return (
                <DropdownMenuItem
                  key={transform.name}
                  onClick={() => {
                    onAddTransform(transform.name);
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <IconComponent className="w-4 h-4" />
                  {transform.name}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={onAddMappingNode}
          className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm"
        >
          <ArrowRightLeft className="w-4 h-4" />
          Field Mapping
        </button>
      </div>
    </div>
  );
};

export default MappingToolbar;
