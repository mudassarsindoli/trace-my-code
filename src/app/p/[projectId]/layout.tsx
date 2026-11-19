"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FolderX, LoaderCircle } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { loadProject } from "@/lib/db/projects";
import { WorkspaceSidebar } from "@/components/workspace/WorkspaceSidebar";
import { WorkspaceTopBar } from "@/components/workspace/WorkspaceTopBar";
import { DetailPanel } from "@/components/workspace/DetailPanel";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const rawProjectId = params.projectId;
  const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] ?? "" : rawProjectId ?? "";

  const snapshot = useAppStore((state) => state.snapshot);
  const setSnapshot = useAppStore((state) => state.setSnapshot);
  const detailsOpen = useAppStore((state) => state.detailsOpen);

  const [notFoundFor, setNotFoundFor] = useState<string | null>(null);
  const notFound = notFoundFor === projectId;
  const currentProjectId = snapshot?.id;

  useEffect(() => {
    if (!projectId) return;
    if (currentProjectId === projectId) return;
    let cancelled = false;
    loadProject(projectId)
      .then((loaded) => {
        if (cancelled) return;
        if (loaded) {
          setSnapshot(loaded);
          setNotFoundFor(null);
        } else {
          setNotFoundFor(projectId);
        }
      })
      .catch(() => {
        if (!cancelled) setNotFoundFor(projectId);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, currentProjectId, setSnapshot]);

  if (!snapshot || snapshot.id !== projectId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        {notFound ? (
          <>
            <div className="rounded-xl border bg-[var(--surface)] p-3 text-[var(--faint)]"><FolderX size={24} /></div>
            <div className="text-[15px] font-semibold">Project not found</div>
            <p className="max-w-sm text-[12px] leading-relaxed muted">
              This project isn&apos;t saved in this browser. It may have been deleted or opened on another device.
            </p>
            <Link href="/" className="btn btn-primary">
              <ArrowLeft size={14} /> Back to dashboard
            </Link>
          </>
        ) : (
          <>
            <LoaderCircle size={24} className="animate-spin text-[var(--accent)]" />
            <div className="text-[13px] muted">Loading project…</div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <WorkspaceSidebar projectId={projectId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceTopBar />
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
      {detailsOpen ? <DetailPanel /> : null}
    </div>
  );
}
