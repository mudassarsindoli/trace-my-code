"use client";

import React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node as FlowNodeBase,
  type NodeTypes,
} from "@xyflow/react";
import {
  Check,
  Download,
  FileCode2,
  FileJson,
  Image as ImageIcon,
  Search,
  Waypoints,
} from "lucide-react";
import { cn } from "@/lib/core/cn";
import { exportJson, exportPng, exportSvg } from "@/lib/graphs/export";
import { layoutGraph } from "@/lib/graphs/layout";
import { toMermaid } from "@/lib/graphs/mermaid";
import type { GraphModel, GraphNode, ProjectSnapshot } from "@/lib/types/ir";
import { GraphLegend } from "./GraphLegend";
import { GraphNodeCard, type GraphNodeCardData } from "./GraphNodeCard";
import { CATEGORY_LABELS, categoryColor } from "./graph-colors";

type FlowNode = FlowNodeBase<GraphNodeCardData, "graphNode">;

const nodeTypes: NodeTypes = { graphNode: GraphNodeCard };

export interface GraphCanvasProps {
  model: GraphModel;
  snapshot?: ProjectSnapshot | null;
  onNodeSelect?: (node: GraphNode) => void;
  selectedNodeId?: string | null;
  search?: string;
  onSearchChange?: (value: string) => void;
  showInferred?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
  focusNodeId?: string | null;
}

export function GraphCanvas(props: GraphCanvasProps): React.ReactElement {
  return (
    <ReactFlowProvider>
      <GraphCanvasContent {...props} />
    </ReactFlowProvider>
  );
}

function GraphCanvasContent({
  model,
  snapshot,
  onNodeSelect,
  selectedNodeId,
  search = "",
  onSearchChange,
  showInferred = true,
  title = "Graph",
  subtitle,
  className,
  focusNodeId,
}: GraphCanvasProps): React.ReactElement {
  const laidOut = useMemo(() => layoutGraph(model), [model]);
  const { fitView, setCenter } = useReactFlow<FlowNode, Edge>();
  const [nodes, setNodes] = useNodesState<FlowNode>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const flowRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const query = search.trim().toLowerCase();

  const flowNodes = useMemo<FlowNode[]>(
    () =>
      laidOut.nodes.map((node) => {
        const searchable = `${node.label} ${node.file ?? ""} ${CATEGORY_LABELS[node.category]}`.toLowerCase();
        return {
          id: node.id,
          type: "graphNode",
          position: node.position ?? { x: 0, y: 0 },
          data: {
            node,
            selected: node.id === selectedNodeId || node.id === focusNodeId,
            dimmed: !!query && !searchable.includes(query),
          },
        };
      }),
    [laidOut, selectedNodeId, focusNodeId, query],
  );

  const cyclicData = useMemo(() => {
    const cyclicNodes = new Set<string>();
    const cyclicPairs = new Set<string>();
    for (const node of laidOut.nodes) {
      if (node.meta?.cyclic === true) cyclicNodes.add(node.id);
    }
    for (const cycle of snapshot?.cycles ?? []) {
      cycle.forEach((id, index) => {
        cyclicNodes.add(id);
        cyclicPairs.add(`${id}\u0000${cycle[(index + 1) % cycle.length]}`);
      });
    }
    return { cyclicNodes, cyclicPairs };
  }, [laidOut, snapshot]);

  const flowEdges = useMemo<Edge[]>(
    () =>
      laidOut.edges
        .filter((edge) => showInferred || edge.confidence !== "inferred")
        .map((edge) => {
          const cyclic =
            cyclicData.cyclicPairs.has(`${edge.source}\u0000${edge.target}`) ||
            (cyclicData.cyclicNodes.has(edge.source) && cyclicData.cyclicNodes.has(edge.target));
          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: "out",
            targetHandle: "in",
            label: edge.label,
            className: cn(
              edge.confidence === "inferred" && "inferred",
              cyclic && "cyclic",
            ) || undefined,
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--border-strong)" },
          };
        }),
    [laidOut, showInferred, cyclicData],
  );

  useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  useEffect(() => {
    if (flowNodes.length === 0) return;
    const frame = requestAnimationFrame(() => {
      void fitView({ padding: 0.2 });
    });
    return () => cancelAnimationFrame(frame);
  }, [laidOut, fitView, flowNodes.length]);

  useEffect(() => {
    if (!focusNodeId || lastFocusedRef.current === focusNodeId) return;
    const position = laidOut.nodes.find((node) => node.id === focusNodeId)?.position;
    if (!position) return;
    lastFocusedRef.current = focusNodeId;
    const frame = requestAnimationFrame(() => {
      void setCenter(position.x, position.y, { zoom: 1.2, duration: 400 });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusNodeId, laidOut, setCenter]);

  useEffect(() => {
    if (!menuOpen) return;
    const onMouseDown = (event: MouseEvent) => {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 2200);
    return () => window.clearTimeout(timer);
  }, [status]);

  const slug = useMemo(() => {
    const source = snapshot?.name || title;
    return source.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "graph";
  }, [snapshot, title]);

  const runExport = useCallback((label: string, action: () => unknown) => {
    try {
      void Promise.resolve(action())
        .then(() => setStatus(`${label} exported`))
        .catch(() => setStatus(`${label} failed`));
    } catch {
      setStatus(`${label} failed`);
    }
    setMenuOpen(false);
  }, []);

  const exportViewport = useCallback(
    (label: string, exporter: (element: HTMLElement, filename: string) => unknown, extension: string) => {
      const element = flowRef.current?.querySelector<HTMLElement>(".react-flow__viewport") ?? null;
      if (!element) {
        setStatus("Canvas not ready");
        setMenuOpen(false);
        return;
      }
      runExport(label, () => exporter(element, `${slug}.${extension}`));
    },
    [runExport, slug],
  );

  const copyMermaid = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(toMermaid(model));
      setStatus("Copied");
    } catch {
      setStatus("Copy failed");
    }
    setMenuOpen(false);
  }, [model]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: FlowNode) => {
      const original = laidOut.nodes.find((candidate) => candidate.id === node.id);
      if (original) onNodeSelect?.(original);
    },
    [laidOut, onNodeSelect],
  );

  return (
    <div className={cn("flex h-full min-h-[420px] flex-col", className)}>
      <div className="panel m-2 flex flex-wrap items-center gap-2 p-2">
        <div className="min-w-0 px-1">
          <div className="truncate text-[13px] font-semibold">{title}</div>
          {subtitle ? <div className="truncate text-[11px] text-[var(--muted)]">{subtitle}</div> : null}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Search size={14} className="text-[var(--faint)]" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search graph"
            placeholder="Search nodes"
            className="input w-[190px]"
            value={search}
            readOnly={!onSearchChange}
            onChange={(event) => onSearchChange?.(event.target.value)}
          />
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Export graph"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Download size={15} aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              aria-label="Export options"
              className="panel absolute right-0 top-[calc(100%+6px)] z-20 w-40 p-1"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--surface-2)]"
                onClick={() => exportViewport("PNG image", exportPng, "png")}
              >
                <ImageIcon size={13} aria-hidden="true" />
                PNG image
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--surface-2)]"
                onClick={() => exportViewport("SVG image", exportSvg, "svg")}
              >
                <FileCode2 size={13} aria-hidden="true" />
                SVG image
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--surface-2)]"
                onClick={() => void copyMermaid()}
              >
                <Waypoints size={13} aria-hidden="true" />
                Mermaid
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!snapshot}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--surface-2)] disabled:opacity-40"
                onClick={() => {
                  if (!snapshot) return;
                  runExport("JSON analysis", () => exportJson(snapshot));
                }}
              >
                <FileJson size={13} aria-hidden="true" />
                JSON analysis
              </button>
            </div>
          ) : null}
        </div>
        {status ? (
          <span role="status" aria-live="polite" className="inline-flex items-center gap-1 text-[11px] text-[var(--success)]">
            <Check size={12} aria-hidden="true" />
            {status}
          </span>
        ) : null}
      </div>
      <GraphLegend className="border-b border-[var(--border)]" />
      <div ref={flowRef} className="relative min-h-0 flex-1">
        {model.nodes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
            <Waypoints size={22} className="text-[var(--faint)]" aria-hidden="true" />
            <div className="text-[13px] font-medium">No relationships detected</div>
            <div className="text-[11px] text-[var(--muted)]">
              Add files or adjust the search to see relationships here.
            </div>
          </div>
        ) : (
          <ReactFlow<FlowNode, Edge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={(changes) => setNodes(changes.applyTo(nodes))}
            onEdgesChange={(changes) => setEdges(changes.applyTo(edges))}
            onNodeClick={handleNodeClick}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            panOnScroll
            selectionOnDrag={false}
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: false }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--grid)" />
            <Controls />
            <MiniMap<FlowNode>
              nodeColor={(node) => categoryColor(node.data.node.category)}
              ariaLabel="Graph minimap"
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
