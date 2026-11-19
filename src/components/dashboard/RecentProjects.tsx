"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Files, FolderOpen, RefreshCw, Trash2 } from "lucide-react";
import { deleteProject, listProjects, type ProjectMeta } from "@/lib/db/projects";
import { formatNumber, relativeTime } from "@/lib/core/format";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function RecentProjects() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refresh() {
    try {
      const result = await listProjects();
      setProjects(result);
      setError(null);
    } catch {
      setError("Could not load saved projects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    listProjects()
      .then((result) => {
        if (cancelled) return;
        setProjects(result);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load saved projects.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteProject(id);
      await refresh();
    } catch {
      setError("Could not delete that project.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="text-[13px] font-semibold">Recent projects</span>
        <span className="badge">{projects.length}</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-4 py-6 text-[12px] muted">
          <RefreshCw size={13} className="animate-spin" /> Loading saved projects…
        </div>
      ) : error && projects.length === 0 ? (
        <div className="px-4 py-6 text-[12px] text-[var(--danger)]">{error}</div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={20} />}
          title="No projects yet"
          description="Analyze a ZIP or load the demo project and it will appear here for quick access."
        />
      ) : (
        <>
          {error ? <div className="border-b px-4 py-2 text-[11px] text-[var(--danger)]">{error}</div> : null}
          <div className="divide-y">
            {projects.map((project) => (
              <div key={project.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{project.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] muted">
                    <span className="inline-flex items-center gap-1"><Files size={11} /> {formatNumber(project.fileCount)} files</span>
                    <span className="inline-flex items-center gap-1"><Clock size={11} /> {relativeTime(project.updatedAt)}</span>
                  </div>
                </div>
                <Button size="sm" onClick={() => router.push(`/p/${project.id}`)} icon={<FolderOpen size={13} />}>
                  Open
                </Button>
                <IconButton
                  label="Delete project"
                  size="sm"
                  disabled={deletingId === project.id}
                  onClick={() => void handleDelete(project.id)}
                  className="text-[var(--faint)] hover:text-[var(--danger)]"
                >
                  <Trash2 size={14} />
                </IconButton>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
