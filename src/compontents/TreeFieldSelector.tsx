
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface TreeNode {
  name: string;
  path: string;
  type: string;
  children?: TreeNode[];
  isArray?: boolean;
  arrayLength?: number;
}

interface TreeFieldSelectorProps {
  data: any;
  onFieldSelect: (path: string, type: string) => void;
  selectedFields: Set<string>;
}

const TreeFieldSelector: React.FC<TreeFieldSelectorProps> = ({ 
  data, 
  onFieldSelect, 
  selectedFields 
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (path: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  const buildTreeFromData = (obj: any, parentPath: string = ''): TreeNode[] => {
    if (!obj || typeof obj !== 'object') return [];

    const nodes: TreeNode[] = [];

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const currentPath = parentPath ? `${parentPath}.${key}` : key;
      
      if (Array.isArray(value)) {
        // Handle arrays
        const arrayNode: TreeNode = {
          name: `${key}[]`,
          path: currentPath,
          type: 'array',
          isArray: true,
          arrayLength: value.length,
          children: []
        };

        // Add indexed items for arrays
        value.forEach((item, index) => {
          const indexPath = `${currentPath}[${index}]`;
          if (item && typeof item === 'object') {
            arrayNode.children!.push({
              name: `[${index}]`,
              path: indexPath,
              type: 'object',
              children: buildTreeFromData(item, indexPath)
            });
          } else {
            arrayNode.children!.push({
              name: `[${index}]`,
              path: indexPath,
              type: typeof item,
            });
          }
        });

        nodes.push(arrayNode);
      } else if (value && typeof value === 'object') {
        // Handle nested objects
        nodes.push({
          name: key,
          path: currentPath,
          type: 'object',
          children: buildTreeFromData(value, currentPath)
        });
      } else {
        // Handle primitive values
        nodes.push({
          name: key,
          path: currentPath,
          type: typeof value,
        });
      }
    });

    return nodes;
  };

  const renderTreeNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.path);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedFields.has(node.path);
    const canSelect = !hasChildren || node.type !== 'object';

    return (
      <div key={node.path} className="select-none">
        <div 
          className={`flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer group ${
            isSelected ? 'bg-blue-50 text-blue-700' : ''
          }`}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.path);
            }
            if (canSelect) {
              onFieldSelect(node.path, node.type);
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-400" />
            )
          ) : (
            <div className="w-3 h-3" />
          )}
          
          <span className="font-medium text-gray-900 flex-1">
            {node.name}
            {node.isArray && (
              <span className="text-xs text-gray-500 ml-1">
                ({node.arrayLength} items)
              </span>
            )}
          </span>
          
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(node.type)}`}>
            {node.type}
          </span>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const tree = buildTreeFromData(data);

  return (
    <div className="border rounded-lg max-h-96 overflow-y-auto bg-white">
      <div className="p-3 border-b bg-gray-50">
        <h4 className="font-medium text-gray-900">Nested Field Explorer</h4>
        <p className="text-xs text-gray-600 mt-1">
          Click on fields to select them for mapping. Expand objects and arrays to see nested fields.
        </p>
      </div>
      <div className="p-2">
        {tree.length > 0 ? (
          tree.map(node => renderTreeNode(node))
        ) : (
          <p className="text-gray-500 text-sm p-2">No nested structure found</p>
        )}
      </div>
    </div>
  );
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'string': return 'text-green-600 bg-green-50';
    case 'number': return 'text-blue-600 bg-blue-50';
    case 'boolean': return 'text-purple-600 bg-purple-50';
    case 'object': return 'text-gray-600 bg-gray-50';
    case 'array': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

export default TreeFieldSelector;
