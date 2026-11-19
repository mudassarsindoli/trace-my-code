import {
  ANALYSIS_BATCH_SIZE,
  SCHEMA_VERSION,
  SOURCE_EXTENSIONS,
} from "@/lib/core/constants";
import { extension, isIgnoredPath, languageFromPath, normalizePath } from "@/lib/core/paths";
import type {
  AnalysisDiagnostics,
  AnalysisStage,
  FileAnalysis,
  ProjectDetection,
  ProjectSnapshot,
  ProjectStats,
  VirtualFile,
} from "@/lib/types/ir";
import { detectProject } from "./detect-project";
import { findCycles } from "./cycles";
import { resolveCalls } from "./calls";
import { parsePrismaFile } from "./prisma";
import { resolveAll } from "./resolve";
import { parseSourceFile } from "./typescript-parser";

export interface AnalyzeOptions {
  projectId: string;
  projectName?: string;
  onProgress?: (stage: AnalysisStage, processed: number, total: number, message?: string) => void;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function lineCount(content: string): number {
  return content.length === 0 ? 0 : content.split(/\r\n|\r|\n/).length;
}

function buildStats(
  files: FileAnalysis[],
  dependencies: number,
  cycleCount: number,
  externalCount: number,
): ProjectStats {
  const languages: Record<string, number> = {};
  let totalLines = 0;
  let analyzedFiles = 0;
  let imports = 0;
  let functions = 0;
  let classes = 0;
  let components = 0;
  let hooks = 0;
  let routes = 0;

  for (const file of files) {
    totalLines += file.lines;
    languages[file.language] = (languages[file.language] ?? 0) + 1;
    if (file.status === "analyzed") analyzedFiles += 1;
    imports += file.imports.length;
    routes += file.routes.length;
    for (const symbol of file.symbols) {
      if (symbol.kind === "function") functions += 1;
      else if (symbol.kind === "class") classes += 1;
      else if (symbol.kind === "component") components += 1;
      else if (symbol.kind === "hook") hooks += 1;
    }
  }

  return {
    files: files.length,
    analyzedFiles,
    totalLines,
    languages,
    imports,
    functions,
    classes,
    components,
    hooks,
    routes,
    cycles: cycleCount,
    externalDependencies: externalCount,
  };
}

export async function analyzeProject(
  files: VirtualFile[],
  options: AnalyzeOptions,
): Promise<ProjectSnapshot> {
  const { projectId, projectName, onProgress } = options;
  const seenPaths = new Set<string>();
  const candidates: VirtualFile[] = [];

  for (const file of files) {
    const path = normalizePath(file.path);
    if (!path || isIgnoredPath(path) || seenPaths.has(path)) continue;
    seenPaths.add(path);
    candidates.push({
      path,
      content: file.content,
      size: Number.isFinite(file.size) ? Math.max(0, Math.floor(file.size)) : file.content.length,
    });
  }
  candidates.sort((a, b) => compareText(a.path, b.path));

  const total = candidates.length;
  const diagnostics: AnalysisDiagnostics = {
    parseErrors: [],
    skippedFiles: [],
    truncated: false,
  };
  const analyses: FileAnalysis[] = [];

  for (let offset = 0; offset < total; offset += ANALYSIS_BATCH_SIZE) {
    const batch = candidates.slice(offset, offset + ANALYSIS_BATCH_SIZE);
    for (const file of batch) {
      const language = languageFromPath(file.path);
      const base: FileAnalysis = {
        path: file.path,
        language,
        size: file.size,
        lines: lineCount(file.content),
        status: "metadata",
        content: file.content,
        imports: [],
        exports: [],
        symbols: [],
        calls: [],
        routes: [],
      };

      const isSource = SOURCE_EXTENSIONS.has(extension(file.path));
      const isPrisma = language === "prisma";
      if (!isSource && !isPrisma) {
        analyses.push(base);
        continue;
      }

      try {
        const parsed = isSource
          ? parseSourceFile(file.path, file.content)
          : parsePrismaFile(file.path, file.content);
        analyses.push({ ...base, ...parsed, status: "analyzed" });
      } catch (error) {
        const message = messageOf(error);
        diagnostics.parseErrors.push({ path: file.path, message });
        analyses.push({ ...base, status: "error", errorMessage: message });
      }
    }

    onProgress?.("parsing", Math.min(offset + ANALYSIS_BATCH_SIZE, total), total);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  onProgress?.("resolving", 0, total);
  const tsConfig = candidates.find((file) => normalizePath(file.path).endsWith("tsconfig.json"));
  const resolved = resolveAll(analyses, tsConfig?.content);
  resolveCalls(analyses);
  const cycles = findCycles(resolved.dependencies);

  onProgress?.("building", total, total);
  const detection: ProjectDetection = detectProject(candidates);
  if (projectName !== undefined) detection.name = projectName;
  const stats = buildStats(
    analyses,
    resolved.dependencies.length,
    cycles.length,
    resolved.externalDependencies.size,
  );
  const timestamp = new Date().toISOString();

  const snapshot: ProjectSnapshot = {
    schemaVersion: SCHEMA_VERSION,
    id: projectId,
    name: detection.name,
    createdAt: timestamp,
    updatedAt: timestamp,
    detection,
    files: analyses,
    dependencies: resolved.dependencies,
    cycles,
    stats,
    diagnostics,
  };

  onProgress?.("done", total, total);
  return snapshot;
}
