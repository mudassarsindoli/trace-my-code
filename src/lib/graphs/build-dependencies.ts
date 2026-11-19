import { basename, categoryFromPath } from "@/lib/core/paths";
import type { GraphEdge, GraphModel, GraphNode, ProjectSnapshot } from "@/lib/types/ir";

const SOURCE_LANGUAGES = new Set(["typescript", "tsx", "javascript", "jsx"]);

export function buildDependencyGraph(snapshot: ProjectSnapshot): GraphModel {
  const cyclicPaths = new Set<string>();
  for (const cycle of snapshot.cycles) {
    for (const path of cycle) cyclicPaths.add(path);
  }

  const included = new Set<string>();
  const nodes: GraphNode[] = [];

  for (const file of snapshot.files) {
    if (file.status !== "analyzed" && file.status !== "error") continue;
    if (!SOURCE_LANGUAGES.has(file.language)) continue;
    included.add(file.path);
    nodes.push({
      id: file.path,
      label: basename(file.path),
      category: categoryFromPath(file.path),
      file: file.path,
      symbolId: null,
      confidence: "verified",
      degree: 0,
      meta: {
        path: file.path,
        lines: file.lines,
        cyclic: cyclicPaths.has(file.path),
        imports: file.imports.length,
        exports: file.exports.length,
      },
    });
  }

  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  for (const dep of snapshot.dependencies) {
    if (!included.has(dep.from) || !included.has(dep.to)) continue;
    const id = `edge:${dep.from}->${dep.to}:${dep.kind}:${dep.line}`;
    if (seen.has(id)) continue;
    seen.add(id);
    edges.push({
      id,
      source: dep.from,
      target: dep.to,
      kind: dep.kind,
      confidence: dep.confidence,
      label: dep.kind,
    });
  }

  const degree = new Map<string, number>();
  for (const node of nodes) degree.set(node.id, 0);
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  for (const node of nodes) node.degree = degree.get(node.id) ?? 0;

  return { nodes, edges };
}
