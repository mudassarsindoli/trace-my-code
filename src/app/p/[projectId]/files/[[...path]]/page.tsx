"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileCode2, FolderTree as FolderTreeIcon, X } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { FileTree } from "@/components/inspector/FileTree";
import { SourceInspector } from "@/components/inspector/SourceInspector";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/Button";
import { basename } from "@/lib/core/paths";

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export default function FilesPage() {
  const params = useParams();
  const router = useRouter();

  const rawProjectId = params.projectId;
  const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] ?? "" : rawProjectId ?? "";
  const rawPath = params.path;
  const segments = rawPath ? (Array.isArray(rawPath) ? rawPath : [rawPath]) : [];
  const urlPath = segments.map(decodeSegment).join("/");

  const snapshot = useAppStore((state) => state.snapshot);
  const selectedFilePath = useAppStore((state) => state.selectedFilePath);
  const selectFile = useAppStore((state) => state.selectFile);
  const [treeOpen, setTreeOpen] = useState(false);

  useEffect(() => {
    if (!snapshot) return;
    const firstFile = snapshot.files.find((file) => file.status === "analyzed")?.path ?? snapshot.files[0]?.path;
    const target = snapshot.files.some((file) => file.path === urlPath) ? urlPath : firstFile;
    if (target && target !== selectedFilePath) selectFile(target);
  }, [snapshot, urlPath, selectedFilePath, selectFile]);

  const file = snapshot?.files.find((item) => item.path === selectedFilePath) ?? null;

  const handleSelectFile = (path: string) => {
    selectFile(path);
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    router.push(`/p/${projectId}/files/${encoded}`);
    setTreeOpen(false);
  };

  if (!snapshot) {
    return (
      <div className="h-full">
        <EmptyState title="No project loaded" description="Open a project from the dashboard to browse its files." />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <button
        type="button"
        onClick={() => setTreeOpen(true)}
        className="flex h-10 shrink-0 items-center gap-2 border-b bg-[var(--surface)] px-3 text-left text-[12px] md:hidden"
      >
        <FolderTreeIcon size={15} className="shrink-0 faint" />
        <span className="min-w-0 flex-1 truncate font-medium">{file ? basename(file.path) : "Browse files"}</span>
        <span className="badge shrink-0">{snapshot.files.length}</span>
      </button>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[280px] shrink-0 flex-col overflow-hidden border-r bg-[var(--surface)] md:flex">
          <div className="flex h-9 shrink-0 items-center justify-between border-b px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide muted">Files</span>
            <span className="badge">{snapshot.files.length}</span>
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-auto p-1">
            <FileTree files={snapshot.files} activePath={selectedFilePath} onSelectFile={handleSelectFile} />
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          {file ? (
            <SourceInspector file={file} snapshot={snapshot} onSelectFile={handleSelectFile} />
          ) : (
            <EmptyState
              icon={<FileCode2 size={20} />}
              title="Select a file"
              description="Choose a file from the tree to view its source, symbols and references."
            />
          )}
        </div>
      </div>

      {treeOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close file browser"
            className="absolute inset-0 cursor-default"
            onClick={() => setTreeOpen(false)}
          />
          <div className="relative flex max-h-[80vh] w-full flex-col rounded-t-2xl border-t bg-[var(--surface)] shadow-xl">
            <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
              <span className="text-[13px] font-semibold">Files <span className="badge">{snapshot.files.length}</span></span>
              <IconButton label="Close file browser" onClick={() => setTreeOpen(false)}>
                <X size={16} />
              </IconButton>
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-1">
              <FileTree files={snapshot.files} activePath={selectedFilePath} onSelectFile={handleSelectFile} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
