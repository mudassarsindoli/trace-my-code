"use client";

import { useState } from "react";
import {
  Boxes,
  ChevronDown,
  Code2,
  FileCode2,
  GitBranch,
  Hash,
  Import,
  List,
  Package,
  Route,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/core/cn";
import { formatNumber } from "@/lib/core/format";
import type { ProjectSnapshot } from "@/lib/types/ir";

interface StatItem {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
  warn?: boolean;
}

function StatTile({ label, value, icon: Icon, tone, warn }: StatItem) {
  return (
    <div className="panel p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="stat-label">{label}</span>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
          style={{ color: tone, background: "color-mix(in srgb, currentColor 14%, transparent)" }}
        >
          <Icon size={13} />
        </span>
      </div>
      <div className={cn("stat-value", warn && value > 0 && "text-[var(--warning)]")}>{formatNumber(value)}</div>
    </div>
  );
}

export function StatsGrid({ snapshot }: { snapshot: ProjectSnapshot }) {
  const [expanded, setExpanded] = useState(false);
  const stats = snapshot.stats;

  const primary: StatItem[] = [
    { label: "Files", value: stats.files, icon: FileCode2, tone: "var(--cat-frontend)" },
    { label: "Lines", value: stats.totalLines, icon: List, tone: "var(--cat-utility)" },
    { label: "Routes", value: stats.routes, icon: Route, tone: "var(--cat-route)" },
    { label: "Circular deps", value: stats.cycles, icon: GitBranch, tone: "var(--warning)", warn: true },
  ];

  const secondary: StatItem[] = [
    { label: "Functions", value: stats.functions, icon: Code2, tone: "var(--cat-service)" },
    { label: "Components", value: stats.components, icon: Boxes, tone: "var(--cat-model)" },
    { label: "Hooks", value: stats.hooks, icon: Sparkles, tone: "var(--cat-backend)" },
    { label: "Classes", value: stats.classes, icon: Hash, tone: "var(--cat-config)" },
    { label: "Imports", value: stats.imports, icon: Import, tone: "var(--cat-external)" },
    { label: "External deps", value: stats.externalDependencies, icon: Package, tone: "var(--accent)" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {primary.map((item) => (
          <StatTile key={item.label} {...item} />
        ))}
      </div>

      {expanded ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {secondary.map((item) => (
            <StatTile key={item.label} {...item} />
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-2.5 flex items-center gap-1 text-[11px] font-medium muted hover:text-[var(--text)]"
        aria-expanded={expanded}
      >
        <ChevronDown size={13} className={cn("transition-transform", expanded && "rotate-180")} />
        {expanded ? "Fewer stats" : "More stats"}
      </button>
    </div>
  );
}
