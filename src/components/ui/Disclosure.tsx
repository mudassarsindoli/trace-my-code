"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/core/cn";

export function Disclosure({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--surface-2)]"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            {title}
            {badge}
          </div>
          {subtitle ? <div className="mt-0.5 text-[11px] muted">{subtitle}</div> : null}
        </div>
        <ChevronDown size={15} className={cn("shrink-0 faint transition-transform", open && "rotate-180")} />
      </button>
      {open ? <div className="border-t">{children}</div> : null}
    </div>
  );
}
