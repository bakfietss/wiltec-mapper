import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { ChevronDown, ChevronRight, Settings } from 'lucide-react';

export interface SchemaField {
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
    children?: SchemaField[];
    parent?: string;
    groupBy?: string;
    path?: string[]; // Add path for nested field value retrieval
    isAttribute?: boolean; // For XML attributes
    value?: any; // Add value property for manual field values
    // NOTE: Removed exampleValue - using sampleData as single source of truth
}

export const getTypeColor = (type: string) => {
    switch (type) {
        case 'string': return 'text-green-600 bg-green-50';
        case 'number': return 'text-blue-600 bg-blue-50';
        case 'boolean': return 'text-purple-600 bg-purple-50';
        case 'date': return 'text-orange-600 bg-orange-50';
        case 'object': return 'text-gray-600 bg-gray-50';
        case 'array': return 'text-red-600 bg-red-50';
        default: return 'text-gray-600 bg-gray-50';
    }
};

interface FieldRendererProps {
    field: SchemaField;
    level?: number;
    expandedFields: Set<string>;
    onFieldExpansionToggle: (fieldId: string) => void;
    
    // TargetNode specific props
    fieldValues?: Record<string, any>;
    onFieldUpdate?: (fieldId: string, updates: Partial<SchemaField>) => void;
    
    // SourceNode specific props
    selectedFields?: Set<string>;
    onFieldToggle?: (fieldId: string) => void;
    sampleData?: any[]; // Add sampleData for source nodes
    
    // Handle configuration
    handleType: 'source' | 'target';
    handlePosition: Position;
    nodeId?: string;
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({
    field,
    level = 0,
    expandedFields,
    onFieldExpansionToggle,
    fieldValues,
    onFieldUpdate,
    selectedFields,
    onFieldToggle,
    sampleData,
    handleType,
    handlePosition,
    nodeId
}) => {
    const isExpanded = expandedFields.has(field.id);
    const hasChildren = field.children && field.children.length > 0;
    const isSelected = selectedFields?.has(field.id) || false;
    const fieldValue = fieldValues?.[field.id];
    
    // Get groupBy options for arrays
    const getGroupByOptions = (): string[] => {
        if (field.type === 'array' && field.children) {
            return field.children.map(child => child.name);
        }
        return [];
    };

    // Array field rendering
    if (field.type === 'array') {
        return (
            <div>
                <div 
                    className={`flex items-center gap-2 py-1 px-2 pr-8 hover:bg-gray-50 rounded text-sm group cursor-pointer relative ${
                        isSelected ? 'bg-blue-50' : ''
                    }`}
                    style={{ paddingLeft: `${8 + level * 12}px` }}
                    onClick={() => onFieldExpansionToggle(field.id)}
                >
                    <div className="cursor-pointer p-1 -m-1">
                        {isExpanded ? (
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        ) : (
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                        )}
                    </div>
                    <span 
                        className="font-medium text-gray-900 flex-1 min-w-0 truncate text-left"
                        onClick={onFieldToggle ? (e) => {
                            e.stopPropagation();
                            onFieldToggle(field.id);
                        } : undefined}
                    >
                        {field.name}[]
                    </span>
                    
                    {/* Show groupBy for target nodes */}
                    {handleType === 'target' && field.groupBy && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            group by: {field.groupBy}
                        </span>
                    )}
                    
                    {/* Show count for both source and target */}
                    {hasChildren && (
                        <span className="text-xs text-gray-500">
                            ({field.children!.length} {handleType === 'target' ? 'items' : 'items'})
                        </span>
                    )}
                    
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor('array')}`}>
                        array
                    </span>
                    
                    <Handle
                        type={handleType}
                        position={handlePosition}
                        id={field.id}
                        className={`w-3 h-3 bg-blue-500 border-2 border-white hover:bg-blue-600 !absolute ${
                            handlePosition === Position.Left ? '!left-1' : '!right-1'
                        } ${isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                        style={{
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 10
                        }}
                    />
                </div>
                
                {/* Target node GroupBy configuration */}
                {handleType === 'target' && isExpanded && hasChildren && (
                    <div 
                        className="flex items-center gap-2 py-1 px-2 pr-8 bg-blue-50 border-l-2 border-blue-200 text-xs"
                        style={{ paddingLeft: `${20 + level * 12}px` }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Settings className="w-3 h-3 text-blue-600" />
                        <span className="text-blue-700 font-medium">Group by:</span>
                        <select
                            value={field.groupBy || ''}
                            onChange={(e) => onFieldUpdate?.(field.id, { groupBy: e.target.value || undefined })}
                            className="text-xs border rounded px-2 py-1 bg-white"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="">Select field...</option>
                            {getGroupByOptions().map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                        <span className="text-blue-600 text-xs italic">
                            Choose which field to group records by
                        </span>
                    </div>
                )}
                
                {/* Child fields */}
                {isExpanded && hasChildren && field.children!.map((childField) => (
                    <FieldRenderer
                        key={childField.id}
                        field={childField}
                        level={level + 1}
                        expandedFields={expandedFields}
                        onFieldExpansionToggle={onFieldExpansionToggle}
                        fieldValues={fieldValues}
                        onFieldUpdate={onFieldUpdate}
                        selectedFields={selectedFields}
                        onFieldToggle={onFieldToggle}
                        sampleData={sampleData}
                        handleType={handleType}
                        handlePosition={handlePosition}
                        nodeId={nodeId}
                    />
                ))}
            </div>
        );
    }
    
    // Object field rendering
    if (field.type === 'object') {
        return (
            <div>
                <div 
                    className={`flex items-center gap-2 py-1 px-2 pr-8 hover:bg-gray-50 rounded text-sm group cursor-pointer relative ${
                        isSelected ? 'bg-blue-50' : ''
                    }`}
                    style={{ paddingLeft: `${8 + level * 12}px` }}
                    onClick={() => onFieldExpansionToggle(field.id)}
                >
                    <div className="cursor-pointer p-1 -m-1">
                        {isExpanded ? (
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        ) : (
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                        )}
                    </div>
                    <span 
                        className="font-medium text-gray-900 flex-1 min-w-0 truncate text-left"
                        onClick={onFieldToggle ? (e) => {
                            e.stopPropagation();
                            onFieldToggle(field.id);
                        } : undefined}
                    >
                        {field.name}
                    </span>
                    {hasChildren && (
                        <span className="text-xs text-gray-500">
                            ({field.children!.length} fields)
                        </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor('object')}`}>
                        object
                    </span>
                    
                    <Handle
                        type={handleType}
                        position={handlePosition}
                        id={field.id}
                        className={`w-3 h-3 bg-blue-500 border-2 border-white hover:bg-blue-600 !absolute ${
                            handlePosition === Position.Left ? '!left-1' : '!right-1'
                        } ${isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                        style={{
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 10
                        }}
                    />
                </div>
                
                {/* Child fields */}
                {isExpanded && hasChildren && field.children!.map((childField) => (
                    <FieldRenderer
                        key={childField.id}
                        field={childField}
                        level={level + 1}
                        expandedFields={expandedFields}
                        onFieldExpansionToggle={onFieldExpansionToggle}
                        fieldValues={fieldValues}
                        onFieldUpdate={onFieldUpdate}
                        selectedFields={selectedFields}
                        onFieldToggle={onFieldToggle}
                        sampleData={sampleData}
                        handleType={handleType}
                        handlePosition={handlePosition}
                        nodeId={nodeId}
                    />
                ))}
            </div>
        );
    }
    
    // Primitive field rendering
    return (
        <div 
            className={`flex items-center gap-2 py-1 px-2 pr-8 hover:bg-gray-50 rounded text-sm group cursor-pointer relative ${
                isSelected ? 'bg-blue-50' : ''
            }`}
            style={{ paddingLeft: `${8 + level * 12}px` }}
            onClick={onFieldToggle ? (e) => {
                e.stopPropagation();
                onFieldToggle(field.id);
            } : undefined}
        >
            <div className="w-3 h-3" />
            <span className="font-medium text-gray-900 flex-1 min-w-0 truncate text-left">{field.name}</span>
            
            {/* Value display - blue for target, blue for source (matching target) */}
            <div className="text-xs max-w-[200px] text-center">
                {handleType === 'target' ? (
                    fieldValue !== undefined && fieldValue !== null && fieldValue !== '' ? (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                            {String(fieldValue)}
                        </span>
                    ) : (
                        <span className="text-gray-400 italic">no value</span>
                    )
                ) : (
                    // Source node - show manual value first, then fallback to sampleData
                    (() => {
                        // Check if field has a manual value set
                        if (field.value !== undefined && field.value !== null && field.value !== '') {
                            // Handle array/object display for manual values
                            if (Array.isArray(field.value)) {
                                return (
                                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs break-words">
                                        [Array with {field.value.length} items]
                                    </span>
                                );
                            } else if (typeof field.value === 'object') {
                                return (
                                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs break-words">
                                        [Object]
                                    </span>
                                );
                            } else {
                                return (
                                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs break-words">
                                        {typeof field.value === 'string' 
                                            ? (field.value === '' ? '""' : `"${field.value}"`)
                                            : String(field.value)}
                                    </span>
                                );
                            }
                        }
                        
                        // Fallback to sampleData if no manual value
                        const dataRecord = sampleData?.[0];
                        if (!dataRecord) {
                            return <span className="text-gray-400 italic">no value</span>;
                        }
                        
                        // Get value using field ID as dot-separated path
                        const getNestedValue = (obj: any, fieldId: string): any => {
                            console.log(`🔍 Getting value for field ID: "${fieldId}" from data:`, obj);
                            if (!fieldId || !obj) return undefined;
                            
                            const pathParts = fieldId.split('.');
                            console.log(`📝 Path parts:`, pathParts);
                            let current = obj;
                            
                            for (const part of pathParts) {
                                console.log(`🚶 Processing part: "${part}", current value:`, current);
                                if (current === null || current === undefined) {
                                    return undefined;
                                }
                                
                                // Handle standalone [0] notation first
                                if (part.startsWith('[') && part.endsWith(']')) {
                                    const index = parseInt(part.slice(1, -1));
                                    console.log(`🎯 Processing standalone array index: ${index}, current is array:`, Array.isArray(current), 'array length:', current?.length, 'target item:', current?.[index]);
                                    if (Array.isArray(current) && index >= 0 && index < current.length) {
                                        current = current[index];
                                        console.log(`✅ Successfully accessed array[${index}]:`, current);
                                    } else {
                                        console.log(`❌ Failed to access array[${index}]`);
                                        return undefined;
                                    }
                                // Handle array notation like containers[0]
                                } else if (part.includes('[') && part.includes(']')) {
                                    const [arrayKey, indexPart] = part.split('[');
                                    const index = parseInt(indexPart.replace(']', ''));
                                    
                                    if (Array.isArray(current[arrayKey]) && current[arrayKey][index] !== undefined) {
                                        current = current[arrayKey][index];
                                    } else {
                                        return undefined;
                                    }
                                } else {
                                    current = current[part];
                                }
                            }
                            
                            return current;
                        };
                        
                        const sourceFieldValue = getNestedValue(dataRecord, field.id);
                        
                        if (sourceFieldValue !== undefined && sourceFieldValue !== null) {
                            // Handle array/object display
                            if (Array.isArray(sourceFieldValue)) {
                                return (
                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs break-words">
                                        [Array with {sourceFieldValue.length} items]
                                    </span>
                                );
                            } else if (typeof sourceFieldValue === 'object') {
                                return (
                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs break-words">
                                        [Object]
                                    </span>
                                );
                            } else {
                                return (
                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs break-words">
                                        {typeof sourceFieldValue === 'string' 
                                            ? (sourceFieldValue === '' ? '""' : `"${sourceFieldValue}"`)
                                            : String(sourceFieldValue)}
                                    </span>
                                );
                            }
                        } else {
                            return <span className="text-gray-400 italic">no value</span>;
                        }
                    })()
                )}
            </div>
            
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(field.type)}`}>
                {field.type}
            </span>
            
            <Handle
                type={handleType}
                position={handlePosition}
                id={field.id}
                className={`w-3 h-3 bg-blue-500 border-2 border-white group-hover:bg-blue-600 !absolute ${
                    handlePosition === Position.Left ? '!left-1' : '!right-1'
                } ${isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10
                }}
            />
        </div>
    );
};