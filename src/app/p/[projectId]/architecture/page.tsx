"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { buildArchitectureGraph } from "@/lib/graphs/build-architecture";
import { GraphCanvas } from "@/components/graphs/GraphCanvas";
import { EmptyState } from "@/components/ui/EmptyState";
import type { GraphModel, GraphNode } from "@/lib/types/ir";

const EMPTY_MODEL: GraphModel = { nodes: [], edges: [] };

export default function ArchitecturePage() {
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
        <EmptyState title="No project loaded" description="Open a project from the dashboard to view its architecture." />
      </div>
    );
  }

  return (
    <div className="h-full p-3">
      <GraphCanvas
        model={model}
        snapshot={snapshot}
        title="Architecture"
        subtitle="Files grouped into frontend, backend, routes, services, models and configuration"
        search={search}
        onSearchChange={setSearch}
        selectedNodeId={selectedNodeId}
        onNodeSelect={handleNodeSelect}
        className="h-full w-full"
      />
    </div>
  );
}
