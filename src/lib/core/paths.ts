import {
  IGNORED_DIRECTORIES,
  IGNORED_EXTENSIONS,
  SOURCE_EXTENSIONS,
} from "@/lib/core/constants";
import type { NodeCategory, Language } from "@/lib/types/ir";

const EXTENSION_CANDIDATES = [
  "", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts",
  "/index.ts", "/index.tsx", "/index.js", "/index.jsx", "/index.mjs", "/index.cjs",
];

export function normalizePath(input: string): string {
  const normalized = input
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")
    .replace(/\/$/, "");
  return normalized === "." ? "" : normalized;
}

export function dirname(path: string): string {
  const parts = normalizePath(path).split("/");
  parts.pop();
  return parts.join("/");
}

export function basename(path: string): string {
  return normalizePath(path).split("/").pop() ?? "";
}

export function extension(path: string): string {
  const name = basename(path);
  const index = name.lastIndexOf(".");
  return index < 0 ? "" : name.slice(index).toLowerCase();
}

export function joinPath(base: string, relative: string): string {
  const segments = [...normalizePath(base).split("/"), ...normalizePath(relative).split("/")];
  const result: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (result.length > 0) result.pop();
      continue;
    }
    result.push(segment);
  }
  return result.join("/");
}

export function isIgnoredPath(path: string): boolean {
  const normalized = normalizePath(path);
  if (!normalized || normalized.startsWith("..")) return true;
  const segments = normalized.split("/");
  if (segments.some((segment) => IGNORED_DIRECTORIES.has(segment))) return true;
  const ext = extension(normalized);
  if (IGNORED_EXTENSIONS.has(ext)) return true;
  if (segments.some((segment) => segment.startsWith(".") && segment.length > 1)) return true;
  return false;
}

export function isSourcePath(path: string): boolean {
  return SOURCE_EXTENSIONS.has(extension(path)) && !isIgnoredPath(path);
}

export function languageFromPath(path: string): Language {
  const ext = extension(path);
  const name = basename(path).toLowerCase();
  if (ext === ".ts") return "typescript";
  if (ext === ".tsx") return "tsx";
  if (ext === ".js" || ext === ".mjs" || ext === ".cjs" || ext === ".mts" || ext === ".cts") return "javascript";
  if (ext === ".jsx") return "jsx";
  if (ext === ".json") return "json";
  if (ext === ".css" || ext === ".scss" || ext === ".less") return "css";
  if (ext === ".html") return "html";
  if (ext === ".md" || ext === ".mdx") return "markdown";
  if (ext === ".yml" || ext === ".yaml") return "yaml";
  if (name === "schema.prisma" || ext === ".prisma") return "prisma";
  return "other";
}

export function categoryFromPath(path: string): NodeCategory {
  const normalized = normalizePath(path);
  const lower = normalized.toLowerCase();
  if (/(^|\/)(prisma\/)?schema\.prisma$/.test(lower) || lower.includes("/models/") || lower.includes("/model/")) return "model";
  if (/(^|\/)(package\.json|tsconfig\.json|jsconfig\.json|next\.config\.|vite\.config\.|webpack|eslint|tailwind|postcss|\.env)/.test(lower)) return "config";
  if (/(^|\/)(app\/api\/|pages\/api\/|src\/app\/api\/|src\/pages\/api\/|route\.(ts|js)$)/.test(lower)) return "route";
  if (/(^|\/)(server\/|backend\/|api\/|controllers?\/|handlers?\/|middleware)/.test(lower)) return "backend";
  if (/(^|\/)(services?\/|lib\/|data\/|repositories?\/|db\.(ts|js)$)/.test(lower)) return "service";
  if (/(^|\/)(utils?\/|helpers?\/|hooks\/|types\/)/.test(lower)) return "utility";
  if (/(^|\/)(app\/|pages\/|src\/app\/|src\/pages\/|components\/|src\/components\/)/.test(lower)) return "frontend";
  return "unknown";
}

export function detectCommonRoot(paths: string[]): string | null {
  if (paths.length === 0) return null;
  const firstSegments = paths.map((path) => normalizePath(path).split("/")[0]);
  const candidate = firstSegments[0];
  if (!candidate || firstSegments.some((segment) => segment !== candidate)) return null;
  const hasRootFile = paths.some((path) => normalizePath(path).split("/").length === 1);
  if (hasRootFile) return null;
  return candidate;
}

export interface TsAliasConfig {
  baseUrl: string;
  paths: Record<string, string[]>;
}

function stripJsonComments(input: string): string {
  let result = "";
  let inString = false;
  let quote = "";
  let escaped = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (inString) {
      result += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) inString = false;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      result += char;
      continue;
    }
    if (char === "/" && next === "/") {
      while (index < input.length && input[index] !== "\n") index += 1;
      result += "\n";
      continue;
    }
    if (char === "/" && next === "*") {
      index += 2;
      while (index < input.length && !(input[index] === "*" && input[index + 1] === "/")) index += 1;
      index += 1;
      continue;
    }
    result += char;
  }
  return result;
}

export function parseTsConfigAliases(content: string): TsAliasConfig {
  const empty: TsAliasConfig = { baseUrl: "", paths: {} };
  try {
    const cleaned = stripJsonComments(content).replace(/,\s*([}\]])/g, "$1");
    const parsed = JSON.parse(cleaned) as {
      compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> };
    };
    const options = parsed.compilerOptions;
    if (!options) return empty;
    return {
      baseUrl: normalizePath(options.baseUrl ?? ""),
      paths: options.paths ?? {},
    };
  } catch {
    return empty;
  }
}

function candidatesFor(base: string): string[] {
  const normalized = normalizePath(base);
  const candidates: string[] = [];
  for (const suffix of EXTENSION_CANDIDATES) {
    candidates.push(suffix ? `${normalized}${suffix}` : normalized);
  }
  const ext = extension(normalized);
  if ([".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
    const stem = normalized.slice(0, -ext.length);
    for (const tsExt of [".ts", ".tsx", ".mts", ".cts"]) candidates.push(`${stem}${tsExt}`);
  }
  return [...new Set(candidates)];
}

export interface ResolverContext {
  filePaths: Set<string>;
  aliases: TsAliasConfig;
}

export function resolveModulePath(
  specifier: string,
  fromFile: string,
  context: ResolverContext,
): string | null {
  let bases: string[] = [];

  if (specifier.startsWith(".")) {
    bases = [joinPath(dirname(fromFile), specifier)];
  } else if (context.aliases && Object.keys(context.aliases.paths).length > 0) {
    for (const [pattern, replacements] of Object.entries(context.aliases.paths)) {
      const starIndex = pattern.indexOf("*");
      if (starIndex < 0) {
        if (specifier === pattern) {
          for (const replacement of replacements) {
            bases.push(joinPath(context.aliases.baseUrl, replacement));
          }
        }
        continue;
      }
      const prefix = pattern.slice(0, starIndex);
      const suffix = pattern.slice(starIndex + 1);
      if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) continue;
      const captured = specifier.slice(prefix.length, specifier.length - suffix.length);
      for (const replacement of replacements) {
        bases.push(joinPath(context.aliases.baseUrl, replacement.replace("*", captured)));
      }
    }
  }

  for (const base of bases) {
    for (const candidate of candidatesFor(base)) {
      const normalized = normalizePath(candidate);
      if (context.filePaths.has(normalized)) return normalized;
    }
  }
  return null;
}

export function isExternalSpecifier(specifier: string): boolean {
  return !specifier.startsWith(".") && !specifier.startsWith("/");
}

export function displayPath(path: string): string {
  return normalizePath(path);
}
