
type MappingSuggestion =
    | {
        target_field: string;
        mapping_type: "direct";
        source_field: string;
    }
    | {
        target_field: string;
        mapping_type: "static";
        value: string;
    }
    | {
        target_field: string;
        mapping_type: "conditional";
        conditions: Array<{ condition: string; value: string }>;
    }
    | {
        target_field: string;
        mapping_type: "table";
        source_field: string;
        table: Record<string, string>;
    }
    | {
        target_field: string;
        mapping_type: "date_conversion";
        source_field: string;
        format: string;
    }
    | {
        target_field: string;
        mapping_type: "concat";
        source_fields: string[];
        separator: string;
    }
    | {
        target_field: string;
        mapping_type: "split";
        source_field: string;
        delimiter: string;
        index: number;
    }
    | {
        target_field: string;
        mapping_type: "skip";
    };

interface CanvasNode {
    id: string;
    type: string;
    [key: string]: any;
}

interface CanvasEdge {
    type: "edge" | "direct";
    from: string;
    to: string;
}

export function convertMappingsToCanvas(mappings: MappingSuggestion[]) {
    const nodes: CanvasNode[] = [];
    const edges: CanvasEdge[] = [];
    const addedNodeIds = new Set<string>();

    for (const map of mappings) {
        const targetId = `target_${map.target_field}`;
        if (!addedNodeIds.has(targetId)) {
            nodes.push({ id: targetId, type: "TargetFieldNode", label: map.target_field });
            addedNodeIds.add(targetId);
        }

        let nodeId = "";
        let node: CanvasNode | null = null;

        const addSource = (field: string) => {
            const sourceId = `source_${field}`;
            if (!addedNodeIds.has(sourceId)) {
                nodes.push({ id: sourceId, type: "SourceFieldNode", label: field });
                addedNodeIds.add(sourceId);
            }
            return sourceId;
        };

        switch (map.mapping_type) {
            case "direct": {
                const from = addSource(map.source_field);
                edges.push({ type: "direct", from, to: targetId });
                continue;
            }

            case "static":
                nodeId = `static_${map.target_field}`;
                node = { id: nodeId, type: "StaticValueNode", value: map.value };
                break;

            case "conditional":
                nodeId = `if_${map.target_field}`;
                node = { id: nodeId, type: "IfThenNode", conditions: map.conditions };
                break;

            case "table": {
                nodeId = `convert_${map.target_field}`;
                const from = addSource(map.source_field);
                node = { id: nodeId, type: "ConversionMappingNode", source: map.source_field, mappingTable: map.table };
                edges.push({ type: "direct", from, to: nodeId });
                break;
            }

            case "date_conversion": {
                nodeId = `date_${map.target_field}`;
                const from = addSource(map.source_field);
                node = {
                    id: nodeId,
                    type: "TransformNode",
                    source: map.source_field,
                    stringOperation: "dateFormat",
                    format: map.format,
                    autoDetect: true
                };
                edges.push({ type: "direct", from, to: nodeId });
                break;
            }

            case "concat": {
                nodeId = `concat_${map.target_field}`;
                node = {
                    id: nodeId,
                    type: "TransformNode",
                    stringOperation: "concat",
                    sourceFields: map.source_fields,
                    separator: map.separator ?? " "
                };
                for (const field of map.source_fields) {
                    const from = addSource(field);
                    edges.push({ type: "direct", from, to: nodeId });
                }
                break;
            }

            case "split": {
                nodeId = `split_${map.target_field}`;
                const from = addSource(map.source_field);
                node = {
                    id: nodeId,
                    type: "TransformNode",
                    stringOperation: "split",
                    source: map.source_field,
                    delimiter: map.delimiter,
                    index: map.index
                };
                edges.push({ type: "direct", from, to: nodeId });
                break;
            }

            case "skip":
                continue;

            default:
                console.warn(`⚠️ Unknown mapping type: ${(map as any)["mapping_type"]}`);
                continue;
        }

        if (node && !addedNodeIds.has(node.id)) {
            nodes.push(node);
            addedNodeIds.add(node.id);
        }

        edges.push({ type: "edge", from: nodeId, to: targetId });
    }

    return { nodes, edges };
}

export type { MappingSuggestion, CanvasNode, CanvasEdge };
