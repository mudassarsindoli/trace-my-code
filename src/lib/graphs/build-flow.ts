import { MAX_FLOW_DEPTH, MAX_GRAPH_NODES } from "@/lib/core/constants";
import { edgeId } from "@/lib/core/ids";
import { categoryFromPath } from "@/lib/core/paths";
import type {
  CallRecord,
  Confidence,
  EdgeKind,
  FileAnalysis,
  GraphEdge,
  GraphModel,
  GraphNode,
  ProjectSnapshot,
  RouteRecord,
  SymbolRecord,
} from "@/lib/types/ir";

const SOURCE_LANGUAGES = new Set(["typescript", "tsx", "javascript", "jsx"]);
const ENTRY_KINDS = new Set(["function", "method", "handler", "component", "hook"]);

interface SymbolEntry {
  file: FileAnalysis;
  symbol: SymbolRecord;
}

interface TraversalItem {
  entry: SymbolEntry;
  parentId: string;
  edgeKind: "route" | "call";
  depth: number;
}

function isDatabaseEntry(entry: SymbolEntry | undefined): boolean {
  if (!entry) return false;
  if (entry.file.language === "prisma") return true;
  if (entry.symbol.kind === "model") return true;
  return categoryFromPath(entry.file.path) === "model";
}

function findHandler(file: FileAnalysis, route: RouteRecord): SymbolEntry | undefined {
  const byId = route.handlerSymbolId
    ? file.symbols.find((symbol) => symbol.id === route.handlerSymbolId)
    : undefined;
  if (byId) return { file, symbol: byId };

  const covering = file.symbols
    .filter((symbol) => ENTRY_KINDS.has(symbol.kind))
    .filter((symbol) => route.line >= symbol.line && route.line <= symbol.endLine)
    .sort((a, b) => b.endLine - b.line - (a.endLine - a.line) || a.id.localeCompare(b.id))[0];
  return covering ? { file, symbol: covering } : undefined;
}

function callsInSymbol(file: FileAnalysis, symbol: SymbolRecord): CallRecord[] {
  return file.calls.filter((call) => call.line >= symbol.line && call.line <= symbol.endLine);
}

export function buildFlowGraph(
  snapshot: ProjectSnapshot,
  options?: { includeInferred?: boolean },
): GraphModel {
  const includeInferred = options?.includeInferred === true;
  const sourceFiles = snapshot.files.filter(
    (file) =>
      (file.status === "analyzed" || file.status === "error") &&
      SOURCE_LANGUAGES.has(file.language),
  );

  const symbolIndex = new Map<string, SymbolEntry>();
  for (const file of sourceFiles) {
    for (const symbol of file.symbols) {
      if (!symbolIndex.has(symbol.id)) symbolIndex.set(symbol.id, { file, symbol });
    }
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const expanded = new Set<string>();
  const queue: TraversalItem[] = [];

  const addNode = (node: GraphNode): void => {
    if (nodeIds.has(node.id)) return;
    nodeIds.add(node.id);
    nodes.push(node);
  };

  const addEdge = (
    source: string,
    target: string,
    kind: EdgeKind,
    confidence: Confidence,
    line: number,
  ): void => {
    const id = edgeId(source, target, kind, line);
    if (edgeIds.has(id)) return;
    edgeIds.add(id);
    edges.push({ id, source, target, kind, confidence, label: kind });
  };

  const expand = (item: TraversalItem): void => {
    if (item.depth > MAX_FLOW_DEPTH) return;
    const key = `${item.entry.file.path}::${item.entry.symbol.id}`;
    const shouldExpandChildren = !expanded.has(key);
    if (shouldExpandChildren) expanded.add(key);

    for (const call of callsInSymbol(item.entry.file, item.entry.symbol)) {
      if (nodes.length >= MAX_GRAPH_NODES) break;
      const hasTarget = call.targetSymbolId !== null;
      if (!hasTarget && !(includeInferred && call.confidence === "inferred")) continue;

      const targetEntry = call.targetSymbolId
        ? symbolIndex.get(call.targetSymbolId)
        : undefined;
      const targetFile = targetEntry?.file.path ?? call.targetFile ?? item.entry.file.path;
      const targetName = targetEntry?.symbol.name ?? call.callee;
      const callNodeId = `call:${item.entry.file.path}:${call.targetSymbolId ?? call.callee}:${call.line}`;
      const confidence: Confidence = call.confidence === "inferred" ? "inferred" : "verified";

      addNode({
        id: callNodeId,
        label: targetName,
        category: categoryFromPath(targetFile),
        file: targetFile,
        symbolId: call.targetSymbolId,
        confidence,
        degree: 0,
        meta: {
          callee: call.callee,
          line: call.line,
          caller: item.entry.file.path,
        },
      });
      addEdge(item.parentId, callNodeId, item.edgeKind, confidence, call.line);
      if (isDatabaseEntry(targetEntry)) {
        addEdge(item.parentId, callNodeId, "database", confidence, call.line);
      }

      if (shouldExpandChildren && targetEntry && item.depth < MAX_FLOW_DEPTH) {
        queue.push({
          entry: targetEntry,
          parentId: callNodeId,
          edgeKind: "call",
          depth: item.depth + 1,
        });
      }
    }
  };

  const routes: Array<{ file: FileAnalysis; route: RouteRecord }> = [];
  for (const file of sourceFiles) {
    for (const route of file.routes) routes.push({ file, route });
  }

  if (routes.length > 0) {
    for (const { file, route } of routes) {
      if (nodes.length >= MAX_GRAPH_NODES) break;
      const routeId = `route:${route.id}`;
      addNode({
        id: routeId,
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
      });
      const handler = findHandler(file, route);
      if (handler) queue.push({ entry: handler, parentId: routeId, edgeKind: "route", depth: 0 });
    }
  } else {
    const incoming = new Map<string, number>();
    for (const file of sourceFiles) {
      for (const call of file.calls) {
        if (call.targetSymbolId) {
          incoming.set(call.targetSymbolId, (incoming.get(call.targetSymbolId) ?? 0) + 1);
        }
      }
    }

    const candidates = sourceFiles.flatMap((file) =>
      file.symbols
        .filter((symbol) => ENTRY_KINDS.has(symbol.kind))
        .map((symbol) => ({
          entry: { file, symbol },
          degree:
            callsInSymbol(file, symbol).length + (incoming.get(symbol.id) ?? 0),
        })),
    );
    candidates.sort(
      (a, b) =>
        b.degree - a.degree ||
        a.entry.file.path.localeCompare(b.entry.file.path) ||
        a.entry.symbol.id.localeCompare(b.entry.symbol.id),
    );

    for (const candidate of candidates.slice(0, 3)) {
      const { file, symbol } = candidate.entry;
      const entryId = `entry:${symbol.id}`;
      addNode({
        id: entryId,
        label: `entry:${symbol.name}`,
        category: categoryFromPath(file.path),
        file: file.path,
        symbolId: symbol.id,
        confidence: "verified",
        degree: 0,
        meta: {
          kind: symbol.kind,
          line: symbol.line,
        },
      });
      queue.push({ entry: candidate.entry, parentId: entryId, edgeKind: "call", depth: 0 });
    }
  }

  for (let index = 0; index < queue.length; index += 1) {
    if (nodes.length >= MAX_GRAPH_NODES) break;
    expand(queue[index]);
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
