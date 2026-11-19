"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, FileCode2 } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/core/cn";
import { truncatePath } from "@/lib/core/format";
import { CodeBlock } from "@/components/inspector/CodeBlock";
import type { DependencyEdge, FileAnalysis, ProjectSnapshot, SymbolKind } from "@/lib/types/ir";

const SYMBOL_LABELS: Record<SymbolKind, string> = {
  function: "fn",
  class: "class",
  method: "method",
  interface: "iface",
  type: "type",
  enum: "enum",
  component: "component",
  hook: "hook",
  variable: "var",
  model: "model",
  handler: "handler",
  constant: "const",
};

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="border-b px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide muted">{title}</h3>
        {count !== undefined ? <span className="badge">{count}</span> : null}
      </div>
      {children}
    </section>
  );
}

function ReferenceList({
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
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-1 text-[11px] muted">
        {title.includes("Outgoing") ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {title}
        <span className="badge ml-1">{edges.length}</span>
      </div>
      {edges.length === 0 ? (
        <div className="text-[11px] faint">None</div>
      ) : (
        <div className="space-y-1">
          {edges.map((edge) => {
            const path = title.includes("Outgoing") ? edge.to : edge.from;
            const known = files.has(path);
            return (
              <button
                key={edge.id}
                type="button"
                onClick={() => onSelectFile(path)}
                title={path}
                className={cn(
                  "block w-full truncate rounded px-1.5 py-1 text-left mono text-[11px]",
                  known ? "text-[var(--accent-text)] hover:bg-[var(--accent-soft)]" : "muted hover:bg-[var(--surface-2)]",
                )}
              >
                {truncatePath(path, 44)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SourceInspector({
  file,
  snapshot,
  onSelectFile,
}: {
  file: FileAnalysis;
  snapshot: ProjectSnapshot;
  onSelectFile?: (path: string) => void;
}) {
  const selectedNodeId = useAppStore((state) => state.selectedNodeId);
  const [activeSymbolId, setActiveSymbolId] = useState<string | null>(selectedNodeId);
  const selectionKey = `${file.path}::${selectedNodeId ?? ""}`;
  const [lastSelectionKey, setLastSelectionKey] = useState(selectionKey);

  if (lastSelectionKey !== selectionKey) {
    setLastSelectionKey(selectionKey);
    setActiveSymbolId(selectedNodeId);
  }

  const highlightLines = useMemo(() => {
    const symbol = file.symbols.find((item) => item.id === activeSymbolId);
    if (!symbol) return [];
    const result: number[] = [];
    for (let line = symbol.line; line <= symbol.endLine; line += 1) result.push(line);
    return result;
  }, [file.symbols, activeSymbolId]);

  const filePaths = useMemo(() => new Set(snapshot.files.map((item) => item.path)), [snapshot.files]);
  const incoming = useMemo(() => snapshot.dependencies.filter((edge) => edge.to === file.path), [snapshot.dependencies, file.path]);
  const outgoing = useMemo(() => snapshot.dependencies.filter((edge) => edge.from === file.path), [snapshot.dependencies, file.path]);

  const scrollToLine = (line: number) => {
    document.getElementById(`line-${line}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const handleSelectFile = (path: string) => {
    onSelectFile?.(path);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-2 border-b bg-[var(--surface)] px-4 py-2.5">
        <FileCode2 size={15} className="shrink-0 text-[var(--accent-text)]" />
        <span className="mono min-w-0 flex-1 truncate text-[12px]" title={file.path}>{file.path}</span>
        <Badge>{file.language}</Badge>
        <span className="mono text-[11px] muted">{file.lines} lines</span>
        {file.status !== "analyzed" ? (
          <Badge tone={file.status === "error" ? "danger" : "warning"}>{file.status}</Badge>
        ) : null}
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-auto">
        <div className="h-[min(58vh,620px)] min-h-[280px] border-b">
          <CodeBlock code={file.content} language={file.language} highlightLines={highlightLines} />
        </div>

        <Section title="Symbols" count={file.symbols.length}>
          {file.symbols.length === 0 ? (
            <div className="text-[11px] faint">No symbols detected.</div>
          ) : (
            <div className="space-y-0.5">
              {file.symbols.map((symbol) => (
                <button
                  key={symbol.id}
                  type="button"
                  onClick={() => {
                    setActiveSymbolId(symbol.id);
                    scrollToLine(symbol.line);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12px]",
                    symbol.id === activeSymbolId
                      ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
                      : "hover:bg-[var(--surface-2)]",
                  )}
                >
                  <span className="mono min-w-0 flex-1 truncate">{symbol.name}</span>
                  <span className="text-[10px] muted">{SYMBOL_LABELS[symbol.kind]}</span>
                  <span className="mono text-[10px] faint">:{symbol.line}</span>
                </button>
              ))}
            </div>
          )}
        </Section>

        <Section title="Imports" count={file.imports.length}>
          {file.imports.length === 0 ? (
            <div className="text-[11px] faint">No imports.</div>
          ) : (
            <div className="space-y-1">
              {file.imports.map((entry, index) => (
                <div key={`${entry.specifier}-${entry.line}-${index}`} className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="mono min-w-0 max-w-full truncate text-[var(--text)]">{entry.specifier}</span>
                  <span className="faint">→</span>
                  <span className={cn("mono truncate text-[11px]", entry.resolvedPath ? "text-[var(--accent-text)]" : "faint")}>
                    {entry.resolvedPath ?? "external"}
                  </span>
                  <span className="badge">{entry.kind}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Exports" count={file.exports.length}>
          {file.exports.length === 0 ? (
            <div className="text-[11px] faint">No exports.</div>
          ) : (
            <div className="space-y-1">
              {file.exports.map((entry, index) => (
                <div key={`${entry.name}-${entry.line}-${index}`} className="flex items-center gap-2 text-[11px]">
                  <span className="mono min-w-0 flex-1 truncate">{entry.isDefault ? "default" : entry.name}</span>
                  <span className="mono faint">:{entry.line}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="References">
          <div className="grid gap-4 sm:grid-cols-2">
            <ReferenceList title="Incoming" edges={incoming} files={filePaths} onSelectFile={handleSelectFile} />
            <ReferenceList title="Outgoing" edges={outgoing} files={filePaths} onSelectFile={handleSelectFile} />
          </div>
        </Section>
      </div>
    </div>
  );
}
