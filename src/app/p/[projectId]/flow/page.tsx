"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { buildFlowGraph } from "@/lib/graphs/build-flow";
import { GraphCanvas } from "@/components/graphs/GraphCanvas";
import { EmptyState } from "@/components/ui/EmptyState";
import type { GraphModel, GraphNode } from "@/lib/types/ir";

const EMPTY_MODEL: GraphModel = { nodes: [], edges: [] };

export default function FlowPage() {
  const snapshot = useAppStore((state) => state.snapshot);
  const search = useAppStore((state) => state.search);
  const setSearch = useAppStore((state) => state.setSearch);
  const showInferred = useAppStore((state) => state.showInferred);
  const selectedNodeId = useAppStore((state) => state.selectedNodeId);
  const selectNode = useAppStore((state) => state.selectNode);
  const detailsOpen = useAppStore((state) => state.detailsOpen);
  const toggleDetails = useAppStore((state) => state.toggleDetails);

  const model = useMemo(
    () => (snapshot ? buildFlowGraph(snapshot, { includeInferred: showInferred }) : EMPTY_MODEL),
    [snapshot, showInferred],
  );

  const handleNodeSelect = (node: GraphNode) => {
    selectNode(node.id);
    if (!detailsOpen) toggleDetails();
  };

  if (!snapshot) {
    return (
      <div className="h-full">
        <EmptyState title="No project loaded" description="Open a project from the dashboard to view its call flow." />
      </div>
    );
  }

  return (
    <div className="h-full p-3">
      <GraphCanvas
        model={model}
        snapshot={snapshot}
        title="Execution Flow"
        subtitle="Static approximate call flow — not runtime verified"
        search={search}
        onSearchChange={setSearch}
        showInferred={showInferred}
        selectedNodeId={selectedNodeId}
        onNodeSelect={handleNodeSelect}
        className="h-full w-full"
      />
    </div>
  );
}
