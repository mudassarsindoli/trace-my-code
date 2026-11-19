import { z } from "zod";

const languageSchema = z.enum([
  "typescript", "tsx", "javascript", "jsx", "json", "css", "html",
  "markdown", "prisma", "yaml", "other",
]);
const confidenceSchema = z.enum(["verified", "inferred"]);
const symbolKindSchema = z.enum([
  "function", "class", "method", "interface", "type", "enum", "component",
  "hook", "variable", "model", "handler", "constant",
]);
const importKindSchema = z.enum(["static", "dynamic", "require", "type-only", "re-export"]);
const edgeKindSchema = z.enum([
  "import", "dynamic", "require", "type-only", "re-export", "call",
  "route", "middleware", "database",
]);
const fileStatusSchema = z.enum(["analyzed", "metadata", "error", "skipped"]);
const routeFrameworkSchema = z.enum(["next", "express", "fastify", "node", "unknown"]);
const nodeCategorySchema = z.enum([
  "frontend", "backend", "route", "service", "utility", "model",
  "config", "external", "unknown",
]);

export const virtualFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  size: z.number().nonnegative(),
});

export const importRecordSchema = z.object({
  specifier: z.string(),
  resolvedPath: z.string().nullable(),
  kind: importKindSchema,
  names: z.array(z.string()),
  external: z.boolean(),
  line: z.number().int().nonnegative(),
});

export const exportRecordSchema = z.object({
  name: z.string(),
  symbolId: z.string().nullable(),
  line: z.number().int().nonnegative(),
  isDefault: z.boolean(),
});

export const symbolRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: symbolKindSchema,
  line: z.number().int().nonnegative(),
  endLine: z.number().int().nonnegative(),
  column: z.number().int().nonnegative(),
  exported: z.boolean(),
  isDefault: z.boolean(),
  parentId: z.string().nullable(),
});

export const callRecordSchema = z.object({
  callee: z.string(),
  line: z.number().int().nonnegative(),
  targetSymbolId: z.string().nullable(),
  targetFile: z.string().nullable(),
  confidence: confidenceSchema,
});

export const routeRecordSchema = z.object({
  id: z.string(),
  framework: routeFrameworkSchema,
  method: z.string(),
  path: z.string(),
  handlerSymbolId: z.string().nullable(),
  line: z.number().int().nonnegative(),
  confidence: confidenceSchema,
});

export const fileAnalysisSchema = z.object({
  path: z.string(),
  language: languageSchema,
  size: z.number().nonnegative(),
  lines: z.number().int().nonnegative(),
  status: fileStatusSchema,
  content: z.string(),
  imports: z.array(importRecordSchema),
  exports: z.array(exportRecordSchema),
  symbols: z.array(symbolRecordSchema),
  calls: z.array(callRecordSchema),
  routes: z.array(routeRecordSchema),
  errorMessage: z.string().optional(),
});

export const dependencyEdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  kind: edgeKindSchema,
  line: z.number().int().nonnegative(),
  confidence: confidenceSchema,
});

export const projectStatsSchema = z.object({
  files: z.number().int().nonnegative(),
  analyzedFiles: z.number().int().nonnegative(),
  totalLines: z.number().int().nonnegative(),
  languages: z.record(z.string(), z.number()),
  imports: z.number().int().nonnegative(),
  functions: z.number().int().nonnegative(),
  classes: z.number().int().nonnegative(),
  components: z.number().int().nonnegative(),
  hooks: z.number().int().nonnegative(),
  routes: z.number().int().nonnegative(),
  cycles: z.number().int().nonnegative(),
  externalDependencies: z.number().int().nonnegative(),
});

export const projectDetectionSchema = z.object({
  name: z.string(),
  languages: z.array(z.string()),
  frameworks: z.array(z.string()),
  entryPoints: z.array(z.string()),
  packageManager: z.string().nullable(),
});

export const analysisDiagnosticsSchema = z.object({
  parseErrors: z.array(z.object({
    path: z.string(),
    message: z.string(),
    line: z.number().int().nonnegative().optional(),
  })),
  skippedFiles: z.array(z.object({ path: z.string(), reason: z.string() })),
  truncated: z.boolean(),
});

export const projectSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  detection: projectDetectionSchema,
  files: z.array(fileAnalysisSchema),
  dependencies: z.array(dependencyEdgeSchema),
  cycles: z.array(z.array(z.string())),
  stats: projectStatsSchema,
  diagnostics: analysisDiagnosticsSchema,
});

export const graphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: nodeCategorySchema,
  file: z.string().nullable(),
  symbolId: z.string().nullable(),
  confidence: confidenceSchema,
  degree: z.number().int().nonnegative(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const graphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  kind: edgeKindSchema,
  confidence: confidenceSchema,
  label: z.string().optional(),
});

export const graphModelSchema = z.object({
  nodes: z.array(graphNodeSchema),
  edges: z.array(graphEdgeSchema),
});

export function parseSnapshot(value: unknown) {
  return projectSnapshotSchema.safeParse(value);
}
