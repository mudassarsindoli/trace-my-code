"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { buildArchitectureGraph } from "@/lib/graphs/build-architecture";
import { GraphCanvas } from "@/components/graphs/GraphCanvas";
import { StatsGrid } from "@/components/workspace/StatsGrid";
import { DiagnosticsPanel } from "@/components/workspace/DiagnosticsPanel";
import { Badge } from "@/components/ui/Badge";
import { Disclosure } from "@/components/ui/Disclosure";
import { EmptyState } from "@/components/ui/EmptyState";
import type { GraphModel, GraphNode } from "@/lib/types/ir";

const EMPTY_MODEL: GraphModel = { nodes: [], edges: [] };

export default function OverviewPage() {
  const snapshot = useAppStore((state) => state.snapshot);
  const search = useAppStore((state) => state.search);
  const setSearch = useAppStore((state) => state.setSearch);
  const selectedNodeId = useAppStore((state) => state.selectedNodeId);
  const selectNode = useAppStore((state) => state.selectNode);
  const detailsOpen = useAppStore((state) => state.detailsOpen);
  const toggleDetails = useAppStore((state) => state.toggleDetails);

  const model = useMemo(() => (snapshot ? buildArchitectureGraph(snapshot) : EMPTY_MODEL), [snapshot]);

  const handleNodeSelect = (node: GraphNode) => {
    selectNode(node.id);
    if (!detailsOpen) toggleDetails();
  };

  if (!snapshot) {
    return (
      <div className="h-full">
        <EmptyState title="No project loaded" description="Open a project from the dashboard to see its overview." />
      </div>
    );
  }

  const { detection } = snapshot;
  const hasIssues = snapshot.diagnostics.parseErrors.length + snapshot.diagnostics.skippedFiles.length > 0;

  return (
    <div className="scroll-thin h-full space-y-4 overflow-auto p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-[17px] font-semibold">{snapshot.name}</h1>
          <p className="mt-0.5 text-[12px] muted">Static overview of the analyzed source tree.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {detection.frameworks.slice(0, 3).map((framework) => (
            <Badge key={framework} tone="accent">{framework}</Badge>
          ))}
          {detection.languages.slice(0, 3).map((language) => (
            <Badge key={language}>{language}</Badge>
          ))}
        </div>
      </div>

      <StatsGrid snapshot={snapshot} />

      <div className="panel h-[430px] overflow-hidden">
        <GraphCanvas
          model={model}
          snapshot={snapshot}
          title="Architecture overview"
          subtitle="Source files grouped by their detected role"
          search={search}
          onSearchChange={setSearch}
          selectedNodeId={selectedNodeId}
          onNodeSelect={handleNodeSelect}
          className="h-full w-full"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Disclosure
          title="Diagnostics"
          subtitle={hasIssues ? "Some files had issues during analysis" : "Everything parsed cleanly"}
          badge={hasIssues ? <Badge tone="warning">Needs review</Badge> : <Badge tone="success">Clean</Badge>}
        >
          <DiagnosticsPanel snapshot={snapshot} bare />
        </Disclosure>

        <Disclosure
          title="Detection"
          subtitle={detection.packageManager ? `Managed with ${detection.packageManager}` : "Project metadata"}
        >
          <dl className="space-y-3 p-4">
            <div>
              <dt className="stat-label">Frameworks</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {detection.frameworks.length > 0
                  ? detection.frameworks.map((framework) => <Badge key={framework} tone="accent">{framework}</Badge>)
                  : <span className="text-[12px] faint">Not detected</span>}
              </dd>
            </div>
            <div>
              <dt className="stat-label">Languages</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {detection.languages.map((language) => <Badge key={language}>{language}</Badge>)}
              </dd>
            </div>
            <div>
              <dt className="stat-label">Entry points</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {detection.entryPoints.length > 0
                  ? detection.entryPoints.map((entry) => <span key={entry} className="mono text-[11px] muted">{entry}</span>)
                  : <span className="text-[12px] faint">None detected</span>}
              </dd>
            </div>
            <div>
              <dt className="stat-label">Package manager</dt>
              <dd className="mt-1 text-[12px]">{detection.packageManager ?? <span className="faint">Unknown</span>}</dd>
            </div>
          </dl>
        </Disclosure>
      </div>
    </div>
  );
}
