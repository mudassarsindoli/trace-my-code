import type { FileAnalysis, SymbolRecord } from "@/lib/types/ir";

interface Match {
  symbol: SymbolRecord;
  file: string;
}

export function resolveCalls(files: FileAnalysis[]): void {
  const fileMap = new Map(files.map((file) => [file.path, file]));

  for (const file of files) {
    const localSymbols = new Map<string, SymbolRecord>();
    const classNames = new Set(
      file.symbols.filter((symbol) => symbol.kind === "class").map((symbol) => symbol.name),
    );

    for (const symbol of file.symbols) {
      if (!localSymbols.has(symbol.name)) localSymbols.set(symbol.name, symbol);
      if (!symbol.parentId) continue;
      const parent = file.symbols.find((candidate) => candidate.id === symbol.parentId);
      if (parent && classNames.has(parent.name)) {
        localSymbols.set(`${parent.name}.${symbol.name}`, symbol);
      }
    }

    for (const call of file.calls) {
      if (call.targetSymbolId) continue;

      const local = localSymbols.get(call.callee);
      if (local) {
        call.targetSymbolId = local.id;
        call.targetFile = file.path;
        call.confidence = "verified";
        continue;
      }

      const matches: Match[] = [];
      for (const record of file.imports) {
        if (!record.resolvedPath || !record.names.includes(call.callee)) continue;
        const target = fileMap.get(record.resolvedPath);
        if (!target) continue;
        for (const symbol of target.symbols) {
          if (symbol.exported && symbol.name === call.callee) {
            matches.push({ symbol, file: target.path });
          }
        }
      }

      const unique = new Map(
        matches.map((match) => [`${match.file}:${match.symbol.id}`, match]),
      );
      if (unique.size !== 1) continue;
      const match = [...unique.values()][0];
      call.targetSymbolId = match.symbol.id;
      call.targetFile = match.file;
      call.confidence = "verified";
    }
  }
}
