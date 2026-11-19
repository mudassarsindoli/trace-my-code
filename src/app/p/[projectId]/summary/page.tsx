"use client";

import { useMemo, useState } from "react";
import { Bot, Check, Copy, Download } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { buildAiSummary, estimateTokenCount } from "@/lib/summary/build-ai-summary";
import { exportMarkdown } from "@/lib/graphs/export";
import { formatNumber } from "@/lib/core/format";
import { Button } from "@/components/ui/Button";
import { Disclosure } from "@/components/ui/Disclosure";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AiSummaryPage() {
  const snapshot = useAppStore((state) => state.snapshot);
  const [copied, setCopied] = useState(false);

  const summary = useMemo(() => (snapshot ? buildAiSummary(snapshot) : ""), [snapshot]);
  const describedFiles = useMemo(
    () => (summary.match(/^### /gm) ?? []).length,
    [summary],
  );
  const tokenEstimate = useMemo(() => estimateTokenCount(summary), [summary]);

  if (!snapshot) {
    return (
      <div className="h-full">
        <EmptyState title="No project loaded" description="Open a project from the dashboard to generate an AI summary." />
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const safeName = snapshot.name.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
    exportMarkdown(summary, `${safeName}-ai-summary`);
  };

  return (
    <div className="scroll-thin h-full space-y-4 overflow-auto p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)]">
            <Bot size={18} />
          </div>
          <div>
            <h1 className="text-[17px] font-semibold">AI summary</h1>
            <p className="mt-0.5 max-w-xl text-[12px] leading-relaxed muted">
              A compact, file-by-file description of this project — what each file exports, which routes it
              serves, and what depends on it. Paste it into an AI chatbot first, so it can tell you the exact
              file to open or share instead of guessing.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={() => void handleCopy()} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="primary" onClick={handleDownload} icon={<Download size={14} />}>
            Download .md
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-[12px] muted">
        <span><strong className="font-semibold text-[var(--text)]">{formatNumber(describedFiles)}</strong> files described</span>
        <span><strong className="font-semibold text-[var(--text)]">{formatNumber(summary.length)}</strong> characters</span>
        <span>~<strong className="font-semibold text-[var(--text)]">{formatNumber(tokenEstimate)}</strong> tokens</span>
      </div>

      <Disclosure title="Preview" subtitle="The full text that Copy and Download use">
        <pre className="scroll-thin mono max-h-[60vh] overflow-auto whitespace-pre-wrap p-4 text-[11px] leading-relaxed">
          {summary}
        </pre>
      </Disclosure>
    </div>
  );
}
