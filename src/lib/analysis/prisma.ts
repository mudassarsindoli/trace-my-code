import { symbolId } from "@/lib/core/ids";
import { normalizePath } from "@/lib/core/paths";
import type { SymbolRecord } from "@/lib/types/ir";
import type { ParsedFile } from "./typescript-parser";

const MODEL_DECLARATION = /^\s*model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/;

export function parsePrismaFile(path: string, content: string): ParsedFile {
  const filePath = normalizePath(path);
  const symbols: SymbolRecord[] = [];
  const lines = content.split(/\r\n|\r|\n/);
  let active: { line: number; column: number; depth: number } | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (active) {
      for (const character of line) {
        if (character === "{") active.depth += 1;
        if (character === "}") active.depth -= 1;
      }
      if (active.depth <= 0) {
        const last = symbols[symbols.length - 1];
        if (last && last.line === active.line) {
          last.endLine = Math.max(last.endLine, index + 1);
        }
        active = null;
      }
      continue;
    }

    const match = MODEL_DECLARATION.exec(line);
    if (!match) continue;
    const lineNumber = index + 1;
    const column = line.indexOf(match[1]);
    symbols.push({
      id: symbolId(filePath, match[1], "model", lineNumber),
      name: match[1],
      kind: "model",
      line: lineNumber,
      endLine: lineNumber,
      column: column < 0 ? line.indexOf("model") : column,
      exported: true,
      isDefault: false,
      parentId: null,
    });
    active = {
      line: lineNumber,
      column: column < 0 ? 0 : column,
      depth: (line.match(/\{/g) ?? []).length - (line.match(/\}/g) ?? []).length,
    };
    if (active.depth <= 0) active = null;
  }

  return { imports: [], exports: [], symbols, calls: [], routes: [] };
}
