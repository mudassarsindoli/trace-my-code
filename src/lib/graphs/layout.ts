import type { GraphEdge, GraphModel, GraphNode, NodeCategory } from "@/lib/types/ir";

const LANE_ORDER: NodeCategory[] = [
  "frontend",
  "route",
  "backend",
  "service",
  "model",
  "utility",
  "config",
  "external",
  "unknown",
];
const LANE_HEIGHT = 220;
const LAYER_GAP = 120;
const MAX_LAYER = 12;

interface DfsFrame {
  id: string;
  edgeIndex: number;
}

function findBackEdges(nodes: GraphNode[], edges: GraphEdge[]): Set<string> {
  const adjacency = new Map<string, GraphEdge[]>();
  for (const node of nodes) adjacency.set(node.id, []);
  for (const edge of edges) adjacency.get(edge.source)?.push(edge);

  const color = new Map<string, number>();
  for (const node of nodes) color.set(node.id, 0);
  const ignored = new Set<string>();

  for (const node of nodes) {
    if (color.get(node.id) !== 0) continue;
    const stack: DfsFrame[] = [{ id: node.id, edgeIndex: 0 }];
    color.set(node.id, 1);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const outgoing = adjacency.get(frame.id) ?? [];
      if (frame.edgeIndex >= outgoing.length) {
        color.set(frame.id, 2);
        stack.pop();
        continue;
      }
      const edge = outgoing[frame.edgeIndex];
      frame.edgeIndex += 1;
      const targetColor = color.get(edge.target) ?? 0;
      if (targetColor === 1) {
        ignored.add(edge.id);
      } else if (targetColor === 0) {
        color.set(edge.target, 1);
        stack.push({ id: edge.target, edgeIndex: 0 });
      }
    }
  }

  return ignored;
}

export function layoutGraph(
  model: GraphModel,
  options?: { lanes?: boolean; nodeWidth?: number; nodeGap?: number },
): GraphModel {
  const lanes = options?.lanes === true;
  const nodeWidth = options?.nodeWidth ?? 180;
  const nodeGap = options?.nodeGap ?? 120;

  if (model.nodes.length === 0) {
    return { nodes: [], edges: model.edges.map((edge) => ({ ...edge })) };
  }

  const nodeIds = new Set(model.nodes.map((node) => node.id));
  const ignored = findBackEdges(model.nodes, model.edges);
  const indegree = new Map<string, number>();
  const outgoing = new Map<string, GraphEdge[]>();
  for (const node of model.nodes) {
    indegree.set(node.id, 0);
    outgoing.set(node.id, []);
  }
  for (const edge of model.edges) {
    if (ignored.has(edge.id) || !nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    outgoing.get(edge.source)?.push(edge);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  const layer = new Map<string, number>();
  for (const node of model.nodes) layer.set(node.id, 0);
  const queue: string[] = [];
  for (const node of model.nodes) {
    if ((indegree.get(node.id) ?? 0) === 0) queue.push(node.id);
  }

  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    const currentLayer = layer.get(id) ?? 0;
    for (const edge of outgoing.get(id) ?? []) {
      const nextLayer = Math.min(MAX_LAYER, currentLayer + 1);
      if (nextLayer > (layer.get(edge.target) ?? 0)) layer.set(edge.target, nextLayer);
      const remaining = (indegree.get(edge.target) ?? 0) - 1;
      indegree.set(edge.target, remaining);
      if (remaining === 0) queue.push(edge.target);
    }
  }

  const byLayer = new Map<number, GraphNode[]>();
  for (const node of model.nodes) {
    const value = Math.min(MAX_LAYER, Math.max(0, layer.get(node.id) ?? 0));
    const group = byLayer.get(value) ?? [];
    group.push(node);
    byLayer.set(value, group);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const xStep = nodeWidth + LAYER_GAP;
  for (const [layerIndex, group] of byLayer) {
    const x = layerIndex * xStep;
    if (!lanes) {
      group.forEach((node, index) => {
        positions.set(node.id, {
          x,
          y: (index - (group.length - 1) / 2) * nodeGap,
        });
      });
      continue;
    }

    for (const category of LANE_ORDER) {
      const laneNodes = group.filter((node) => node.category === category);
      if (laneNodes.length === 0) continue;
      const laneIndex = LANE_ORDER.indexOf(category);
      const offset = (laneIndex - (LANE_ORDER.length - 1) / 2) * LANE_HEIGHT;
      laneNodes.forEach((node, index) => {
        positions.set(node.id, {
          x,
          y: (index - (laneNodes.length - 1) / 2) * nodeGap + offset,
        });
      });
    }
  }

  return {
    nodes: model.nodes.map((node) => ({
      ...node,
      position: positions.get(node.id) ?? { x: 0, y: 0 },
    })),
    edges: model.edges.map((edge) => ({ ...edge })),
  };
}
