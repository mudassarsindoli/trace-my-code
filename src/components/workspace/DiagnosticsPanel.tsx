"use client";

import { AlertTriangle, CheckCircle2, FileWarning } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ProjectSnapshot } from "@/lib/types/ir";

export function DiagnosticsPanel({ snapshot, bare = false }: { snapshot: ProjectSnapshot; bare?: boolean }) {
  const parseErrors = snapshot.diagnostics.parseErrors;
  const skippedFiles = snapshot.diagnostics.skippedFiles;
  const clean = parseErrors.length === 0 && skippedFiles.length === 0 && !snapshot.diagnostics.truncated;

  return (
    <div className={bare ? "flex flex-col" : "panel flex flex-col"}>
      {bare ? null : (
        <div className="panel-header">
          <span className="text-[13px] font-semibold">Diagnostics</span>
          <div className="flex gap-1.5">
            <span className="badge">{parseErrors.length} errors</span>
            <span className="badge">{skippedFiles.length} skipped</span>
          </div>
        </div>
      )}

      {clean ? (
        <EmptyState
          icon={<CheckCircle2 size={20} />}
          title="No issues found"
          description="All source files were parsed successfully with no skipped files."
        />
      ) : (
        <div className="scroll-thin max-h-72 divide-y overflow-auto">
          {parseErrors.map((error, index) => (
            <div key={`error-${error.path}-${error.line ?? index}`} className="flex items-start gap-2.5 px-4 py-2.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--danger)]" />
              <div className="min-w-0">
                <div className="mono truncate text-[11px]" title={error.path}>{error.path}{error.line ? `:${error.line}` : ""}</div>
                <div className="mt-0.5 text-[11px] leading-snug muted">{error.message}</div>
              </div>
            </div>
          ))}
          {skippedFiles.map((file, index) => (
            <div key={`skipped-${file.path}-${index}`} className="flex items-start gap-2.5 px-4 py-2.5">
              <FileWarning size={14} className="mt-0.5 shrink-0 text-[var(--warning)]" />
              <div className="min-w-0">
                <div className="mono truncate text-[11px]" title={file.path}>{file.path}</div>
                <div className="mt-0.5 text-[11px] leading-snug muted">{file.reason}</div>
              </div>
            </div>
          ))}
          {snapshot.diagnostics.truncated ? (
            <div className="flex items-start gap-2.5 px-4 py-2.5">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--warning)]" />
              <div className="text-[11px] leading-snug muted">
                The archive exceeded analysis limits, so some files were omitted.
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
