"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/core/cn";
import type { FileAnalysis, Language } from "@/lib/types/ir";

interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  file: FileAnalysis | null;
}

function buildTree(files: FileAnalysis[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: new Map(), file: null };
  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let node = root;
    let current = "";
    parts.forEach((part, index) => {
      current = current ? `${current}/${part}` : part;
      let child = node.children.get(part);
      if (!child) {
        child = { name: part, path: current, children: new Map(), file: null };
        node.children.set(part, child);
      }
      node = child;
      if (index === parts.length - 1) node.file = file;
    });
  }
  return root;
}

function sortedChildren(node: TreeNode): TreeNode[] {
  return [...node.children.values()].sort((a, b) => {
    if (a.children.size !== b.children.size) return b.children.size - a.children.size;
    return a.name.localeCompare(b.name);
  });
}

function languageColor(language: Language): string {
  switch (language) {
    case "typescript": return "#3b82f6";
    case "tsx": return "#60a5fa";
    case "javascript": return "#eab308";
    case "jsx": return "#fbbf24";
    case "json": return "#a1a1aa";
    case "css": return "#a855f7";
    case "html": return "#f97316";
    case "markdown": return "#94a3b8";
    case "prisma": return "#14b8a6";
    case "yaml": return "#84cc16";
    default: return "#71717a";
  }
}

function TreeBranch({
  node,
  depth,
  expanded,
  activePath,
  onToggle,
  onSelectFile,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  activePath: string | null;
  onToggle: (path: string) => void;
  onSelectFile: (path: string) => void;
}) {
  const isDirectory = node.children.size > 0;
  const isOpen = expanded.has(node.path);
  const isActive = !isDirectory && node.path === activePath;

  return (
    <div>
      <button
        type="button"
        onClick={() => (isDirectory ? onToggle(node.path) : onSelectFile(node.path))}
        title={node.path}
        style={{ paddingLeft: 6 + depth * 13 }}
        className={cn(
          "flex h-7 w-full items-center gap-1.5 rounded pr-2 text-left text-[12px]",
          isActive
            ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
            : "muted hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
        )}
      >
        {isDirectory ? (
          <>
            {isOpen ? <ChevronDown size={13} className="shrink-0 faint" /> : <ChevronRight size={13} className="shrink-0 faint" />}
            {isOpen ? <FolderOpen size={14} className="shrink-0 text-[var(--warning)]" /> : <Folder size={14} className="shrink-0 text-[var(--warning)]" />}
          </>
        ) : (
          <>
            <span className="w-[13px] shrink-0" />
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: node.file?.status === "error" ? "var(--danger)" : languageColor(node.file?.language ?? "other") }}
            />
          </>
        )}
        <span className="min-w-0 truncate">{node.name}</span>
      </button>
      {isDirectory && isOpen ? (
        <div>
          {sortedChildren(node).map((child) => (
            <TreeBranch
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              activePath={activePath}
              onToggle={onToggle}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FileTree({
  files,
  activePath,
  onSelectFile,
}: {
  files: FileAnalysis[];
  activePath: string | null;
  onSelectFile: (path: string) => void;
}) {
  const tree = useMemo(() => buildTree(files), [files]);

  const [expanded, setExpanded] = useState<Set<string>>(() =>
    new Set([...tree.children.values()].filter((child) => child.children.size > 0).map((child) => child.path)),
  );

  const effectiveExpanded = useMemo(() => {
    const next = new Set(expanded);
    if (activePath) {
      const parts = activePath.split("/").filter(Boolean);
      let current = "";
      for (let index = 0; index < parts.length - 1; index += 1) {
        current = current ? `${current}/${parts[index]}` : parts[index];
        next.add(current);
      }
    }
    return next;
  }, [expanded, activePath]);

  const toggle = (path: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className="pb-2">
      {sortedChildren(tree).map((node) => (
        <TreeBranch
          key={node.path}
          node={node}
          depth={0}
          expanded={effectiveExpanded}
          activePath={activePath}
          onToggle={toggle}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}
