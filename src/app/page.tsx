"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Boxes, Database, Monitor, Moon, Network, RotateCcw, ShieldCheck, Sun, Workflow } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { useAppStore } from "@/lib/store/app-store";
import { extractZip } from "@/lib/zip/extract";
import { analyzeFiles } from "@/lib/workers/worker-client";
import { getDemoFiles } from "@/lib/demo/demo-project";
import { saveProject } from "@/lib/db/projects";
import { Button, IconButton } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DropZone } from "@/components/dashboard/DropZone";
import { DemoCard } from "@/components/dashboard/DemoCard";
import { RecentProjects } from "@/components/dashboard/RecentProjects";
import type { VirtualFile } from "@/lib/types/ir";

type Source = { kind: "zip"; file: File } | { kind: "demo" };

const FEATURES = [
  { icon: Network, title: "Static analysis", text: "Files, symbols, routes and imports extracted without running code." },
  { icon: Workflow, title: "Dependency graph", text: "Resolved imports and circular dependencies at a glance." },
  { icon: Boxes, title: "Execution flow", text: "Approximate call paths across routes, services and models." },
  { icon: Database, title: "Local persistence", text: "Projects saved to IndexedDB on this device only." },
];

export default function DashboardPage() {
  const router = useRouter();
  const { theme, cycleTheme } = useTheme();
  const startAnalysis = useAppStore((state) => state.startAnalysis);
  const updateAnalysis = useAppStore((state) => state.updateAnalysis);
  const finishAnalysis = useAppStore((state) => state.finishAnalysis);
  const failAnalysis = useAppStore((state) => state.failAnalysis);
  const analysisStage = useAppStore((state) => state.analysisStage);
  const analysisProcessed = useAppStore((state) => state.analysisProcessed);
  const analysisTotal = useAppStore((state) => state.analysisTotal);
  const analysisMessage = useAppStore((state) => state.analysisMessage);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(null);

  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  const run = useCallback(async (next: Source) => {
    setSource(next);
    setError(null);
    setSaveWarning(null);
    setIsAnalyzing(true);
    startAnalysis();
    try {
      let files: VirtualFile[];
      if (next.kind === "demo") {
        updateAnalysis("extracting", 0, 0, "Loading demo project");
        files = getDemoFiles();
      } else {
        updateAnalysis("extracting", 0, 0, "Extracting ZIP archive");
        const result = await extractZip(next.file);
        files = result.files;
      }
      const snapshot = await analyzeFiles(files, (message) =>
        updateAnalysis(message.stage, message.processed, message.total, message.message),
      );
      finishAnalysis(snapshot);
      try {
        await saveProject(snapshot);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Unknown storage error";
        setSaveWarning(`Analysis is ready, but it could not be saved locally: ${message}`);
      }
      router.push(`/p/${snapshot.id}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not analyze this project.";
      setError(message);
      failAnalysis(message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [startAnalysis, updateAnalysis, finishAnalysis, failAnalysis, router]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-[var(--surface)] px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent)] text-white">
            <Logo size={18} />
          </div>
          <div>
            <div className="text-[14px] font-semibold leading-tight">TraceMyProject</div>
            <div className="text-[11px] muted">Local-first static codebase analysis</div>
          </div>
        </div>
        <IconButton label="Change theme" onClick={cycleTheme}>
          <ThemeIcon size={16} />
        </IconButton>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <div className="mb-7 max-w-2xl">
          <h1 className="text-[26px] font-semibold tracking-tight">Understand a codebase at a glance.</h1>
          <p className="mt-2 text-[13px] leading-relaxed muted">
            Drop a ZIP of a JavaScript or TypeScript repository to explore its architecture, dependencies and
            execution flow — computed entirely in your browser.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
          <DropZone onFile={(file) => void run({ kind: "zip", file })} disabled={isAnalyzing} />
          <DemoCard onLoadDemo={() => void run({ kind: "demo" })} disabled={isAnalyzing} />
        </div>

        {error ? (
          <div className="panel mt-4 flex items-start gap-3 border-[var(--danger)] p-4">
            <AlertCircle size={17} className="mt-0.5 shrink-0 text-[var(--danger)]" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">Analysis failed</div>
              <div className="mt-1 break-words text-[12px] muted">{error}</div>
            </div>
            <Button size="sm" onClick={() => { if (source) void run(source); }} disabled={!source} icon={<RotateCcw size={13} />}>
              Retry
            </Button>
          </div>
        ) : null}

        {saveWarning ? (
          <div role="status" className="panel mt-4 flex items-start gap-3 border-[var(--warning)] p-4">
            <AlertCircle size={17} className="mt-0.5 shrink-0 text-[var(--warning)]" />
            <div className="min-w-0 flex-1 text-[12px] muted">{saveWarning}</div>
          </div>
        ) : null}

        <div className="mt-8">
          <RecentProjects />
        </div>

        <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="panel p-4">
              <Icon size={16} className="text-[var(--accent-text)]" />
              <div className="mt-2.5 text-[12px] font-semibold">{title}</div>
              <p className="mt-1 text-[11px] leading-relaxed muted">{text}</p>
            </div>
          ))}
        </section>

        <p className="mt-6 flex items-center gap-2 text-[11px] muted">
          <ShieldCheck size={13} className="shrink-0" />
          Everything runs in your browser. No source code is uploaded and no external AI service is used.
        </p>
      </main>

      {isAnalyzing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="panel w-full max-w-md p-5 shadow-xl">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
              <span className="text-[13px] font-semibold">Analyzing project…</span>
            </div>
            <ProgressBar
              stage={analysisStage}
              processed={analysisProcessed}
              total={analysisTotal}
              message={analysisMessage ?? undefined}
            />
            <p className="mt-4 text-[11px] muted">This stays on your device. Keep this tab open until analysis finishes.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
