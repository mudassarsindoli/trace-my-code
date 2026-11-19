"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Bot, FolderTree, GitBranch, LayoutDashboard, Network, Workflow } from "lucide-react";
import { cn } from "@/lib/core/cn";
import { Logo } from "@/components/ui/Logo";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export function WorkspaceSidebar({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  const base = `/p/${projectId}`;
  const items: NavItem[] = [
    { href: base, label: "Overview", icon: LayoutDashboard, exact: true },
    { href: `${base}/architecture`, label: "Architecture", icon: Network },
    { href: `${base}/dependencies`, label: "Dependencies", icon: GitBranch },
    { href: `${base}/flow`, label: "Execution Flow", icon: Workflow },
    { href: `${base}/files`, label: "File Explorer", icon: FolderTree },
    { href: `${base}/summary`, label: "AI Summary", icon: Bot },
  ];

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <aside className="flex h-full w-14 shrink-0 flex-col items-center border-r bg-[var(--surface)]">
      <div className="flex h-[57px] w-full shrink-0 items-center justify-center border-b">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--accent)] text-white">
          <Logo size={14} />
        </span>
      </div>

      <nav className="scroll-thin flex-1 space-y-1 overflow-y-auto p-2">
        {items.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
                  : "muted hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
              )}
            >
              <Icon size={17} className="shrink-0" />
            </Link>
          );
        })}
      </nav>

      <div className="w-full border-t p-2">
        <Link
          href="/"
          title="Dashboard"
          aria-label="Back to dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-md muted hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
        >
          <ArrowLeft size={17} className="shrink-0" />
        </Link>
      </div>
    </aside>
  );
}
