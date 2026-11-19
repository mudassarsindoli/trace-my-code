export type Language =
  | "typescript"
  | "tsx"
  | "javascript"
  | "jsx"
  | "json"
  | "css"
  | "html"
  | "markdown"
  | "prisma"
  | "yaml"
  | "other";

export type Confidence = "verified" | "inferred";

export type SymbolKind =
  | "function"
  | "class"
  | "method"
  | "interface"
  | "type"
  | "enum"
  | "component"
  | "hook"
  | "variable"
  | "model"
  | "handler"
  | "constant";

export type ImportKind = "static" | "dynamic" | "require" | "type-only" | "re-export";

export type EdgeKind =
  | "import"
  | "dynamic"
  | "require"
  | "type-only"
  | "re-export"
  | "call"
  | "route"
  | "middleware"
  | "database";

export type FileStatus = "analyzed" | "metadata" | "error" | "skipped";

export type RouteFramework = "next" | "express" | "fastify" | "node" | "unknown";

export type NodeCategory =
  | "frontend"
  | "backend"
  | "route"
  | "service"
  | "utility"
  | "model"
  | "config"
  | "external"
  | "unknown";

export interface VirtualFile {
  path: string;
  content: string;
  size: number;
}

export interface ImportRecord {
  specifier: string;
  resolvedPath: string | null;
  kind: ImportKind;
  names: string[];
  external: boolean;
  line: number;
}

export interface ExportRecord {
  name: string;
  symbolId: string | null;
  line: number;
  isDefault: boolean;
}

export interface SymbolRecord {
  id: string;
  name: string;
  kind: SymbolKind;
  line: number;
  endLine: number;
  column: number;
  exported: boolean;
  isDefault: boolean;
  parentId: string | null;
}

export interface CallRecord {
  callee: string;
  line: number;
  targetSymbolId: string | null;
  targetFile: string | null;
  confidence: Confidence;
}

export interface RouteRecord {
  id: string;
  framework: RouteFramework;
  method: string;
  path: string;
  handlerSymbolId: string | null;
  line: number;
  confidence: Confidence;
}

export interface ParseError {
  path: string;
  message: string;
  line?: number;
}

export interface SkippedFile {
  path: string;
  reason: string;
}

export interface FileAnalysis {
  path: string;
  language: Language;
  size: number;
  lines: number;
  status: FileStatus;
  content: string;
  imports: ImportRecord[];
  exports: ExportRecord[];
  symbols: SymbolRecord[];
  calls: CallRecord[];
  routes: RouteRecord[];
  errorMessage?: string;
}

export interface DependencyEdge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  line: number;
  confidence: Confidence;
}

export interface ProjectStats {
  files: number;
  analyzedFiles: number;
  totalLines: number;
  languages: Record<string, number>;
  imports: number;
  functions: number;
  classes: number;
  components: number;
  hooks: number;
  routes: number;
  cycles: number;
  externalDependencies: number;
}

export interface ProjectDetection {
  name: string;
  languages: string[];
  frameworks: string[];
  entryPoints: string[];
  packageManager: string | null;
}

export interface AnalysisDiagnostics {
  parseErrors: ParseError[];
  skippedFiles: SkippedFile[];
  truncated: boolean;
}

export interface ProjectSnapshot {
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  detection: ProjectDetection;
  files: FileAnalysis[];
  dependencies: DependencyEdge[];
  cycles: string[][];
  stats: ProjectStats;
  diagnostics: AnalysisDiagnostics;
}

export interface GraphNode {
  id: string;
  label: string;
  category: NodeCategory;
  file: string | null;
  symbolId: string | null;
  confidence: Confidence;
  degree: number;
  position?: { x: number; y: number };
  meta?: Record<string, string | number | boolean>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  confidence: Confidence;
  label?: string;
}

export interface GraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type AnalysisStage = "extracting" | "parsing" | "resolving" | "building" | "done";

export interface AnalyzeRequest {
  files: VirtualFile[];
  projectId: string;
  projectName?: string;
}

export type WorkerMessage =
  | { type: "progress"; stage: AnalysisStage; processed: number; total: number; message?: string }
  | { type: "result"; snapshot: ProjectSnapshot }
  | { type: "error"; message: string };
