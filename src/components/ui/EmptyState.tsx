import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 p-8 text-center">
      {icon ? <div className="text-[var(--faint)]">{icon}</div> : null}
      <div className="text-[14px] font-medium">{title}</div>
      {description ? <div className="max-w-sm text-[12px] leading-relaxed muted">{description}</div> : null}
      {action}
    </div>
  );
}
