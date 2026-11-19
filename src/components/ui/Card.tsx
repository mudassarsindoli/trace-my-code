import type { ReactNode } from "react";
import { cn } from "@/lib/core/cn";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("card", className)}>{children}</div>;
}

export function CardHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 pb-3">
      <div className="text-[13px] font-semibold">{title}</div>
      {action}
    </div>
  );
}
