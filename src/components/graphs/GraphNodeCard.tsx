"use client";

import type { CSSProperties } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  AlertTriangle,
  Boxes,
  CircleHelp,
  Database,
  Monitor,
  Package,
  Route,
  Server,
  Settings,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/core/cn";
import { truncatePath } from "@/lib/core/format";
import type { GraphNode, NodeCategory } from "@/lib/types/ir";
import { CATEGORY_LABELS, categoryColor } from "./graph-colors";

export type GraphNodeCardData = {
  node: GraphNode;
  selected: boolean;
  dimmed: boolean;
};

export interface GraphNodeCardProps {
  data: GraphNodeCardData;
}

const CATEGORY_ICONS: Record<NodeCategory, LucideIcon> = {
  frontend: Monitor,
  backend: Server,
  route: Route,
  service: Boxes,
  utility: Wrench,
  model: Database,
  config: Settings,
  external: Package,
  unknown: CircleHelp,
};

export function GraphNodeCard({ data }: GraphNodeCardProps) {
  const { node, selected, dimmed } = data;
  const Icon = CATEGORY_ICONS[node.category];
  const color = categoryColor(node.category);
  const cyclic = node.meta?.cyclic === true;
  const metaLine = node.file
    ? truncatePath(node.file, 30)
    : Object.values(node.meta ?? {})
        .map(String)
        .filter(Boolean)
        .slice(0, 2)
        .join(" · ") || CATEGORY_LABELS[node.category];

  return (
    <div
      className={cn(
        "node-shell",
        selected && "is-selected",
        dimmed && "is-dimmed",
        cyclic && "is-cyclic",
      )}
      style={{ width: 210, "--node-color": color } as CSSProperties}
      title={node.file ?? node.label}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <div className="flex items-center gap-2">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
          style={{ color, background: "color-mix(in srgb, currentColor 12%, transparent)" }}
        >
          <Icon size={14} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold leading-tight" title={node.label}>
            {node.label}
          </span>
          <span className="mono block truncate text-[10px] leading-tight text-[var(--muted)]">
            {metaLine}
          </span>
        </span>
        {cyclic ? (
          <AlertTriangle size={12} className="shrink-0 text-[var(--warning)]" aria-label="Part of a cycle" />
        ) : null}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <Badge tone={node.category}>{CATEGORY_LABELS[node.category]}</Badge>
        {node.degree > 0 ? (
          <span className="badge" title={`${node.degree} connections`}>
            {node.degree}
          </span>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
