import type { ReactNode } from "react";
import { cn } from "@/lib/core/cn";
import type { NodeCategory } from "@/lib/types/ir";

export function Badge({ children, tone, className }: { children: ReactNode; tone?: NodeCategory | "accent" | "danger" | "success" | "warning"; className?: string }) {
  const color = tone
    ? tone === "accent" ? "var(--accent)" :
      tone === "danger" ? "var(--danger)" :
      tone === "success" ? "var(--success)" :
      tone === "warning" ? "var(--warning)" :
      `var(--cat-${tone})`
    : undefined;
  return (
    <span
      className={cn("badge", className)}
      style={color ? { color, borderColor: "color-mix(in srgb, currentColor 30%, transparent)" } : undefined}
    >
      {children}
    </span>
  );
}
