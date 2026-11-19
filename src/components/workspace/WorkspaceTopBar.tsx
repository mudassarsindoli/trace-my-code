"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Download, Monitor, Moon, PanelRightClose, PanelRightOpen, Search, Sun } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { exportJson } from "@/lib/graphs/export";
import { IconButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function WorkspaceTopBar() {
  const snapshot = useAppStore((state) => state.snapshot);
  const search = useAppStore((state) => state.search);
  const setSearch = useAppStore((state) => state.setSearch);
  const showInferred = useAppStore((state) => state.showInferred);
  const setShowInferred = useAppStore((state) => state.setShowInferred);
  const detailsOpen = useAppStore((state) => state.detailsOpen);
  const toggleDetails = useAppStore((state) => state.toggleDetails);
  const pathname = usePathname();
  const { theme, cycleTheme } = useTheme();
  const [exportOpen, setExportOpen] = useState(false);

  const isFlow = /(^|\/)flow(\/|$)/.test(pathname);
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  const handleExport = () => {
    if (!snapshot) return;
    exportJson(snapshot);
    setExportOpen(false);
  };

  return (
    <header className="flex h-[57px] shrink-0 items-center gap-2 border-b bg-[var(--surface)] px-3 sm:gap-3 sm:px-4">
      <div className="min-w-0 shrink-0">
        <div className="max-w-[90px] truncate text-[13px] font-semibold sm:max-w-52">{snapshot?.name ?? "Project"}</div>
      </div>
      <div className="hidden min-w-0 items-center gap-1.5 overflow-hidden md:flex">
        {snapshot?.detection.frameworks.slice(0, 2).map((framework) => (
          <Badge key={framework} tone="accent">{framework}</Badge>
        ))}
        {snapshot?.detection.languages.slice(0, 2).map((language) => (
          <Badge key={language}>{language}</Badge>
        ))}
      </div>

      <div className="relative ml-auto min-w-0 flex-1 sm:max-w-xs">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 muted" />
        <input
          className="input pl-8"
          placeholder="Search…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search graph"
        />
      </div>

      {isFlow ? (
        <label className="hidden shrink-0 cursor-pointer items-center gap-1.5 text-[11px] muted sm:flex" title="Include inferred calls">
          <input
            type="checkbox"
            checked={showInferred}
            onChange={(event) => setShowInferred(event.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          Inferred
        </label>
      ) : null}

      <div className="relative shrink-0">
        <button type="button" className="btn" onClick={() => setExportOpen((open) => !open)} disabled={!snapshot}>
          <Download size={14} />
          <span className="hidden sm:inline">Export</span>
          <ChevronDown size={12} />
        </button>
        {exportOpen ? (
          <div className="panel absolute right-0 top-full z-30 mt-1 w-52 p-1 shadow-lg">
            <button
              type="button"
              onClick={handleExport}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--surface-2)]"
            >
              <Download size={13} /> Export JSON
            </button>
            <div className="px-2 py-1.5 text-[10px] leading-snug faint">
              PNG, SVG and Mermaid exports are in each graph&apos;s toolbar.
            </div>
          </div>
        ) : null}
      </div>

      <IconButton label="Change theme" onClick={cycleTheme}>
        <ThemeIcon size={16} />
      </IconButton>
      <IconButton label={detailsOpen ? "Hide details" : "Show details"} onClick={toggleDetails}>
        {detailsOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
      </IconButton>
    </header>
  );
}
