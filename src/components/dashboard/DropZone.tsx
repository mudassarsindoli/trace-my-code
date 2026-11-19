"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { FileArchive, UploadCloud } from "lucide-react";
import { cn } from "@/lib/core/cn";

export function DropZone({ onFile, disabled }: { onFile: (file: File) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const browse = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      browse();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={browse}
      onKeyDown={handleKeyDown}
      onDragEnter={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
      onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
      onDrop={handleDrop}
      className={cn(
        "panel flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-9 text-center outline-none transition-colors",
        dragging ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "hover:border-[var(--border-strong)]",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <div className="rounded-xl border bg-[var(--surface-2)] p-3 text-[var(--accent-text)]">
        <UploadCloud size={22} />
      </div>
      <div className="text-[14px] font-medium">Drop a ZIP archive here</div>
      <div className="max-w-xs text-[12px] leading-relaxed muted">
        or click to browse. Your source files are read locally and never uploaded.
      </div>
      <span className="badge"><FileArchive size={12} /> .zip archives only</span>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
