import { edgeId } from "@/lib/core/ids";
import { parseTsConfigAliases, resolveModulePath } from "@/lib/core/paths";
import type {
  DependencyEdge,
  EdgeKind,
  FileAnalysis,
  ImportKind,
} from "@/lib/types/ir";

const EDGE_KINDS: Record<ImportKind, EdgeKind> = {
  static: "import",
  dynamic: "dynamic",
  require: "require",
  "type-only": "type-only",
  "re-export": "re-export",
};

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function resolveAll(
  files: FileAnalysis[],
  tsConfigContent: string | undefined,
): {
  dependencies: DependencyEdge[];
  externalDependencies: Set<string>;
} {
  const aliases = parseTsConfigAliases(tsConfigContent ?? "");
  const filePaths = new Set(files.map((file) => file.path));
  const dependencies: DependencyEdge[] = [];
  const externalDependencies = new Set<string>();
  const seen = new Set<string>();

  for (const file of [...files].sort((a, b) => compareText(a.path, b.path))) {
    for (const record of file.imports) {
      const resolved = resolveModulePath(record.specifier, file.path, { filePaths, aliases });
      if (!resolved) {
        if (record.external) externalDependencies.add(record.specifier);
        continue;
      }
      record.resolvedPath = resolved;
      const kind = EDGE_KINDS[record.kind];
      const edge: DependencyEdge = {
        id: edgeId(file.path, resolved, kind, record.line),
        from: file.path,
        to: resolved,
        kind,
        line: record.line,
        confidence: "verified",
      };
      if (seen.has(edge.id)) continue;
      seen.add(edge.id);
      dependencies.push(edge);
    }
  }

  dependencies.sort((a, b) => compareText(a.id, b.id));
  return { dependencies, externalDependencies };
}
