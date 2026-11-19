"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function DemoCard({ onLoadDemo, disabled }: { onLoadDemo: () => void; disabled?: boolean }) {
  return (
    <div className="panel flex min-h-56 flex-col justify-between gap-4 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-[var(--accent-soft)] p-2 text-[var(--accent-text)]">
          <Sparkles size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold">Try the demo</div>
          <p className="mt-1 text-[12px] leading-relaxed muted">
            A small sample project with routes, services and models — analyzed instantly, no upload required.
          </p>
        </div>
      </div>
      <Button variant="primary" onClick={onLoadDemo} disabled={disabled} className="w-full">
        Load demo project
        <ArrowRight size={14} />
      </Button>
    </div>
  );
}
