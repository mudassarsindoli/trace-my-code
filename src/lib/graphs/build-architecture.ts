import { basename, categoryFromPath, normalizePath } from "@/lib/core/paths";
import type {
  FileAnalysis,
  GraphEdge,
  GraphModel,
  GraphNode,
  NodeCategory,
  ProjectSnapshot,
  RouteRecord,
} from "@/lib/types/ir";

const SOURCE_LANGUAGES = new Set(["typescript", "tsx", "javascript", "jsx"]);
const ROOT_GROUP_SEGMENTS = new Set(["src", "app", "pages"]);

interface GroupBucket {
  name: string;
  files: FileAnalysis[];
  categories: NodeCategory[];
}

function groupNameFor(path: string): string {
  const segments = normalizePath(path).split("/").filter(Boolean);
  if (segments.length === 0) return basename(path) || "root";
  const first = segments[0];
  if (ROOT_GROUP_SEGMENTS.has(first) && segments.length > 1) return segments[1];
  return first;
}

function majorityCategory(categories: NodeCategory[], name: string): NodeCategory {
  if (categories.length === 0) return categoryFromPath(name);
  const counts = new Map<NodeCategory, number>();
  for (const category of categories) counts.set(category, (counts.get(category) ?? 0) + 1);
  let best = categories[0];
  let bestCount = 0;
  for (const category of categories) {
    const count = counts.get(category) ?? 0;
    if (count > bestCount) {
      best = category;
      bestCount = count;
    }
  }
  return best;
}

function computeDegrees(nodes: GraphNode[], edges: GraphEdge[]): void {
  const degree = new Map<string, number>();
  for (const node of nodes) degree.set(node.id, 0);
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  for (const node of nodes) node.degree = degree.get(node.id) ?? 0;
}

function buildFallback(
  sourceFiles: FileAnalysis[],
  cyclicPaths: Set<string>,
  snapshot: ProjectSnapshot,
): GraphModel {
  const included = new Set(sourceFiles.map((file) => file.path));
  const nodes: GraphNode[] = sourceFiles.map((file) => ({
    id: file.path,
    label: basename(file.path),
    category: categoryFromPath(file.path),
    file: file.path,
    symbolId: null,
    confidence: "verified",
    degree: 0,
    meta: {
      path: file.path,
      fileCount: 1,
      lines: file.lines,
      cyclic: cyclicPaths.has(file.path),
    },
  }));

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

  computeDegrees(nodes, edges);
  return { nodes, edges };
}

export function buildArchitectureGraph(snapshot: ProjectSnapshot): GraphModel {
  const cyclicPaths = new Set<string>();
  for (const cycle of snapshot.cycles) {
    for (const path of cycle) cyclicPaths.add(path);
  }

  const sourceFiles = snapshot.files.filter(
    (file) =>
      (file.status === "analyzed" || file.status === "error") &&
      SOURCE_LANGUAGES.has(file.language),
  );

  if (sourceFiles.length < 4) return buildFallback(sourceFiles, cyclicPaths, snapshot);

  const buckets = new Map<string, GroupBucket>();
  const fileGroups = new Map<string, string>();
  for (const file of sourceFiles) {
    const name = groupNameFor(file.path);
    fileGroups.set(file.path, name);
    let bucket = buckets.get(name);
    if (!bucket) {
      bucket = { name, files: [], categories: [] };
      buckets.set(name, bucket);
    }
    bucket.files.push(file);
    bucket.categories.push(categoryFromPath(file.path));
  }

  const nodes: GraphNode[] = [];
  for (const bucket of buckets.values()) {
    const lines = bucket.files.reduce((total, file) => total + file.lines, 0);
    nodes.push({
      id: `group:${bucket.name}`,
      label: bucket.name,
      category: majorityCategory(bucket.categories, bucket.name),
      file: null,
      symbolId: null,
      confidence: "verified",
      degree: 0,
      meta: {
        fileCount: bucket.files.length,
        lines,
        cyclic: bucket.files.some((file) => cyclicPaths.has(file.path)),
      },
    });
  }

  const edges: GraphEdge[] = [];
  const seenEdges = new Set<string>();
  for (const dep of snapshot.dependencies) {
    const from = fileGroups.get(dep.from);
    const to = fileGroups.get(dep.to);
    if (!from || !to || from === to) continue;
    const source = `group:${from}`;
    const target = `group:${to}`;
    const id = `edge:${source}->${target}:${dep.kind}`;
    if (seenEdges.has(id)) continue;
    seenEdges.add(id);
    edges.push({
      id,
      source,
      target,
      kind: dep.kind,
      confidence: dep.confidence,
      label: dep.kind,
    });
  }

  if (buckets.size < 12) {
    for (const file of sourceFiles) {
      const owner = fileGroups.get(file.path);
      if (!owner) continue;
      for (const route of file.routes) {
        const routeNode = createRouteNode(file, route);
        if (nodes.some((node) => node.id === routeNode.id)) continue;
        nodes.push(routeNode);
        const id = `edge:${routeNode.id}->group:${owner}:route`;
        if (seenEdges.has(id)) continue;
        seenEdges.add(id);
        edges.push({
          id,
          source: routeNode.id,
          target: `group:${owner}`,
          kind: "route",
          confidence: route.confidence,
          label: "route",
        });
      }
    }
  }

  computeDegrees(nodes, edges);
  return { nodes, edges };
}

function createRouteNode(file: FileAnalysis, route: RouteRecord): GraphNode {
  return {
    id: `route:${route.id}`,
    label: `${route.method} ${route.path}`.trim(),
    category: "route",
    file: file.path,
    symbolId: route.handlerSymbolId,
    confidence: route.confidence,
    degree: 0,
    meta: {
      framework: route.framework,
      line: route.line,
    },
  };
}
