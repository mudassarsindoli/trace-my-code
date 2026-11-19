import JSZip from "jszip";
import {
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
} from "@/lib/core/constants";
import {
  basename,
  detectCommonRoot,
  isIgnoredPath,
  normalizePath,
} from "@/lib/core/paths";
import type { SkippedFile, VirtualFile } from "@/lib/types/ir";

export interface ExtractionResult {
  files: VirtualFile[];
  skipped: SkippedFile[];
  truncated: boolean;
}

const LOCKFILE_NAMES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
  "cargo.lock",
  "poetry.lock",
  "pipfile.lock",
  "composer.lock",
  "gemfile.lock",
  "go.sum",
]);

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export async function extractZip(
  input: File | Blob | ArrayBuffer,
): Promise<ExtractionResult> {
  let archive: JSZip;
  try {
    const data = input instanceof ArrayBuffer ? input : await input.arrayBuffer();
    archive = await JSZip.loadAsync(data);
  } catch (error) {
    throw new Error(`Failed to read ZIP archive: ${messageOf(error)}`);
  }

  const entries = Object.values(archive.files).sort((a, b) => compareText(a.name, b.name));
  const root = detectCommonRoot(
    entries.filter((entry) => !entry.dir).map((entry) => normalizePath(entry.name)),
  );
  const files: VirtualFile[] = [];
  const skipped: SkippedFile[] = [];
  const encoder = new TextEncoder();
  let totalBytes = 0;
  let truncated = false;

  for (const entry of entries) {
    const normalized = normalizePath(entry.name);
    if (entry.dir) {
      skipped.push({ path: normalized, reason: "directory" });
      continue;
    }
    const path = root && normalized.startsWith(`${root}/`)
      ? normalized.slice(root.length + 1)
      : normalized;

    if (!path || path.endsWith("/") || path.split("/").includes("..")) {
      skipped.push({ path: normalized || entry.name, reason: "unsafe or invalid file path" });
      continue;
    }
    if (root && path === normalized) {
      skipped.push({ path, reason: "outside common root" });
      continue;
    }
    if (LOCKFILE_NAMES.has(basename(path).toLowerCase())) {
      skipped.push({ path, reason: "lockfile" });
      continue;
    }
    if (isIgnoredPath(path)) {
      skipped.push({ path, reason: "ignored path or binary file" });
      continue;
    }
    if (files.length >= MAX_FILES) {
      skipped.push({ path, reason: "maximum file count exceeded" });
      truncated = true;
      continue;
    }

    let content: string;
    try {
      content = await entry.async("string");
    } catch {
      skipped.push({ path, reason: "failed to decode file as text" });
      continue;
    }

    const size = encoder.encode(content).length;
    if (size > MAX_FILE_BYTES) {
      skipped.push({ path, reason: "file exceeds maximum size" });
      truncated = true;
      continue;
    }
    if (totalBytes + size > MAX_TOTAL_BYTES) {
      skipped.push({ path, reason: "archive exceeds maximum total size" });
      truncated = true;
      continue;
    }

    totalBytes += size;
    files.push({ path, content, size });
  }

  files.sort((a, b) => compareText(a.path, b.path));
  skipped.sort((a, b) => compareText(a.path, b.path));
  return { files, skipped, truncated };
}
