
interface FlowNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: any;
}

interface FlowEdge {
    id: string;
    source: string;
    target: string;
}

function mapToCanvasNodeType(type: string): string {
    if (type === "TargetFieldNode") return "TargetNode";
    if (type === "SourceFieldNode") return "SourceNode";
    return type;
}

export function applyTemplate(aiCanvasResult: {
    nodes: any[];
    edges: any[];
}) {
    const nodes: FlowNode[] = aiCanvasResult.nodes.map((n, index) => ({
        id: n.id,
        type: mapToCanvasNodeType(n.type),
        position: { x: 100 + index * 300, y: 100 },
        data: { ...n }
    }));

    const edges: FlowEdge[] = aiCanvasResult.edges.map((e) => ({
        id: `${e.from}-${e.to}`,
        source: e.from,
        target: e.to
    }));

    return { nodes, edges };
}

export type { FlowNode, FlowEdge };
