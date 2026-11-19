import type * as React from "react";
import type { NodeCategory } from "@/lib/types/ir";
import { cn } from "@/lib/core/cn";
import { CATEGORY_LABELS, categoryColor } from "./graph-colors";

export interface GraphLegendProps {
  className?: string;
}

const CATEGORIES: NodeCategory[] = [
  "frontend",
  "backend",
  "route",
  "service",
  "utility",
  "model",
  "config",
  "external",
  "unknown",
];

export function GraphLegend({ className }: GraphLegendProps): React.ReactElement {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 text-[10px] text-[var(--muted)]",
        className,
      )}
    >
      {CATEGORIES.map((category) => (
        <span key={category} className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: categoryColor(category) }}
          />
          {CATEGORY_LABELS[category]}
        </span>
      ))}
      <span className="h-3 w-px shrink-0 bg-[var(--border)]" aria-hidden="true" />
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0 w-4 shrink-0 border-t-2 border-solid border-[var(--border-strong)]" />
        Verified
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0 w-4 shrink-0 border-t-2 border-dashed border-[var(--border-strong)]" />
        Inferred
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-4 shrink-0 rounded-sm border border-dashed border-[var(--warning)]" />
        Cycle
      </span>
    </div>
  );
}
