import { cn } from "@/lib/core/cn";
import type { AnalysisStage } from "@/lib/types/ir";

const STAGES: AnalysisStage[] = ["extracting", "parsing", "resolving", "building", "done"];
const LABELS: Record<AnalysisStage, string> = {
  extracting: "Extracting files",
  parsing: "Parsing source",
  resolving: "Resolving relationships",
  building: "Building graphs",
  done: "Complete",
};

export function ProgressBar({
  stage,
  processed,
  total,
  message,
  className,
}: {
  stage: AnalysisStage;
  processed: number;
  total: number;
  message?: string;
  className?: string;
}) {
  const activeIndex = STAGES.indexOf(stage);
  const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : stage === "done" ? 100 : 0;
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex items-center justify-between text-[12px]">
        <span className="font-medium">{message ?? LABELS[stage]}</span>
        <span className="mono muted">{percent}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-200" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {STAGES.slice(0, 4).map((item, index) => (
          <span
            key={item}
            className={cn("text-[11px]", index === activeIndex ? "text-[var(--accent-text)]" : index < activeIndex ? "text-[var(--success)]" : "faint")}
          >
            {index < activeIndex ? "✓ " : ""}{LABELS[item]}
          </span>
        ))}
      </div>
    </div>
  );
}
