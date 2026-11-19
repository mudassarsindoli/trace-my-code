"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, MousePointerClick, X } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { buildArchitectureGraph } from "@/lib/graphs/build-architecture";
import { buildDependencyGraph } from "@/lib/graphs/build-dependencies";
import { buildFlowGraph } from "@/lib/graphs/build-flow";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SourceInspector } from "@/components/inspector/SourceInspector";
import { truncatePath } from "@/lib/core/format";
import type { DependencyEdge, GraphNode, ProjectSnapshot } from "@/lib/types/ir";

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-[var(--surface-2)] px-2.5 py-2">
      <div className="stat-label">{label}</div>
      <div className="mt-1 text-[16px] font-semibold">{value}</div>
    </div>
  );
}

function EdgeList({
  title,
  edges,
  files,
  onSelectFile,
}: {
  title: string;
  edges: DependencyEdge[];
  files: Set<string>;
  onSelectFile: (path: string) => void;
}) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide muted">
        {title === "Incoming" ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
        {title}
        <span className="badge">{edges.length}</span>
      </div>
      {edges.length === 0 ? (
        <div className="text-[11px] faint">None</div>
      ) : (
        <div className="space-y-1">
          {edges.map((edge) => {
            const path = title === "Outgoing" ? edge.to : edge.from;
            return (
              <button
                key={edge.id}
                type="button"
                onClick={() => onSelectFile(path)}
                title={path}
                className="block w-full truncate rounded px-1.5 py-1 text-left mono text-[11px] text-[var(--accent-text)] hover:bg-[var(--accent-soft)]"
              >
                {truncatePath(path, 46)} <span className="faint">{files.has(path) ? "" : "(external)"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NodeDetails({
  node,
  snapshot,
  onSelectFile,
}: {
  node: GraphNode;
  snapshot: ProjectSnapshot;
  onSelectFile: (path: string) => void;
}) {
  const key = node.file ?? node.id;
  const incoming = snapshot.dependencies.filter((edge) => edge.to === key);
  const outgoing = snapshot.dependencies.filter((edge) => edge.from === key);
  const files = useMemo(() => new Set(snapshot.files.map((file) => file.path)), [snapshot.files]);
  const metaEntries = Object.entries(node.meta ?? {});

  return (
    <div className="scroll-thin h-full overflow-auto p-4">
      <div className="break-words text-[14px] font-semibold">{node.label}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone={node.category}>{node.category}</Badge>
        <Badge tone={node.confidence === "verified" ? "success" : "warning"}>{node.confidence}</Badge>
      </div>

      {node.file ? (
        <button
          type="button"
          onClick={() => onSelectFile(node.file as string)}
          className="mono mt-4 block w-full break-all rounded border bg-[var(--surface-2)] px-2 py-1.5 text-left text-[11px] text-[var(--accent-text)] hover:bg-[var(--accent-soft)]"
        >
          {node.file}
        </button>
      ) : null}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="Degree" value={node.degree} />
        <MiniStat label="Incoming" value={incoming.length} />
        <MiniStat label="Outgoing" value={outgoing.length} />
      </div>

      {metaEntries.length > 0 ? (
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide muted">Metadata</div>
          <dl className="divide-y rounded-md border">
            {metaEntries.map(([name, value]) => (
              <div key={name} className="flex items-start justify-between gap-3 px-2.5 py-1.5 text-[11px]">
                <dt className="muted">{name}</dt>
                <dd className="mono break-all text-right">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <EdgeList title="Incoming" edges={incoming} files={files} onSelectFile={onSelectFile} />
      <EdgeList title="Outgoing" edges={outgoing} files={files} onSelectFile={onSelectFile} />
    </div>
  );
}

export function DetailPanel() {
  const snapshot = useAppStore((state) => state.snapshot);
  const selectedNodeId = useAppStore((state) => state.selectedNodeId);
  const selectFile = useAppStore((state) => state.selectFile);
  const toggleDetails = useAppStore((state) => state.toggleDetails);
  const router = useRouter();
  const params = useParams();
  const rawProjectId = params.projectId;
  const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] ?? "" : rawProjectId ?? "";

  const file = snapshot?.files.find((item) => item.path === selectedNodeId) ?? null;

  const node = useMemo(() => {
    if (!snapshot || !selectedNodeId || file) return null;
    const models = [
      buildArchitectureGraph(snapshot),
      buildDependencyGraph(snapshot),
      buildFlowGraph(snapshot, { includeInferred: true }),
    ];
    for (const model of models) {
      const found = model.nodes.find((item) => item.id === selectedNodeId);
      if (found) return found;
    }
    return null;
  }, [snapshot, selectedNodeId, file]);

  const openFile = (path: string) => {
    selectFile(path);
    router.push(`/p/${projectId}/files/${path.split("/").map(encodeURIComponent).join("/")}`);
  };

  const hasSelection = !!(file || node);

  const body = !snapshot || !hasSelection ? (
    <EmptyState
      icon={<MousePointerClick size={20} />}
      title="Nothing selected"
      description="Click a node in a graph or a file in the explorer to inspect its details here."
    />
  ) : file ? (
    <SourceInspector file={file} snapshot={snapshot} onSelectFile={openFile} />
  ) : node && snapshot ? (
    <NodeDetails node={node} snapshot={snapshot} onSelectFile={openFile} />
  ) : null;

  const footer = snapshot && hasSelection ? (
    <div className="shrink-0 border-t p-2">
      <Button size="sm" variant="ghost" onClick={() => selectFile(null)} className="w-full">
        Clear selection
      </Button>
    </div>
  ) : null;

  return (
    <>
      <aside className="hidden h-full w-[340px] shrink-0 flex-col border-l bg-[var(--surface)] lg:flex xl:w-[380px]">
        <div className="flex h-[57px] shrink-0 items-center justify-between border-b px-4">
          <span className="text-[12px] font-semibold">Details</span>
          <IconButton label="Close details" onClick={toggleDetails}>
            <X size={15} />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{body}</div>
        {footer}
      </aside>

      {hasSelection ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close details"
            className="absolute inset-0 cursor-default"
            onClick={toggleDetails}
          />
          <div className="relative flex max-h-[80vh] w-full flex-col rounded-t-2xl border-t bg-[var(--surface)] shadow-xl">
            <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
              <span className="text-[13px] font-semibold">Details</span>
              <IconButton label="Close details" onClick={toggleDetails}>
                <X size={16} />
              </IconButton>
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{body}</div>
            {footer}
          </div>
        </div>
      ) : null}
    </>
  );
}
