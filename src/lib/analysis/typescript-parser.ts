import * as ts from "typescript";
import { isExternalSpecifier, normalizePath } from "@/lib/core/paths";
import type {
  CallRecord,
  ExportRecord,
  ImportKind,
  ImportRecord,
  RouteRecord,
  SymbolKind,
  SymbolRecord,
} from "@/lib/types/ir";
import {
  createSymbol,
  detectCallRoute,
  detectConventionRoutes,
  detectModelSymbol,
  getNodeLine,
  type RouteDescriptor,
} from "./route-detectors";

export interface ParsedFile {
  imports: ImportRecord[];
  exports: ExportRecord[];
  symbols: SymbolRecord[];
  calls: CallRecord[];
  routes: RouteRecord[];
}

interface Position {
  line: number;
  endLine: number;
  column: number;
}

interface Flags {
  exported: boolean;
  isDefault: boolean;
}

function scriptKindFor(path: string): ts.ScriptKind {
  const lower = path.toLowerCase();
  if (lower.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (lower.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (lower.endsWith(".ts") || lower.endsWith(".mts") || lower.endsWith(".cts")) {
    return ts.ScriptKind.TS;
  }
  return ts.ScriptKind.JS;
}

export function parseSourceFile(path: string, content: string): ParsedFile {
  const filePath = normalizePath(path);
  const kind = scriptKindFor(filePath);
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, kind);
  const result: ParsedFile = {
    imports: [],
    exports: [],
    symbols: [],
    calls: [],
    routes: [],
  };
  const symbolKeys = new Set<string>();
  const routeKeys = new Set<string>();

  function modifiersOf(node: ts.Node): readonly ts.Modifier[] {
    return ts.canHaveModifiers(node) ? ts.getModifiers(node) ?? [] : [];
  }

  function flagsOf(node: ts.Node): Flags {
    const modifiers = modifiersOf(node);
    return {
      exported: modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
      isDefault: modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword),
    };
  }

  function positionOf(node: ts.Node, nameNode?: ts.Node): Position {
    const target = nameNode ?? node;
    const start = sourceFile.getLineAndCharacterOfPosition(target.getStart(sourceFile));
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    return { line: start.line + 1, endLine: end.line + 1, column: start.character };
  }

  function containsJsx(node: ts.Node): boolean {
    let found = false;
    const scan = (current: ts.Node): void => {
      if (found) return;
      if (
        ts.isJsxElement(current) ||
        ts.isJsxSelfClosingElement(current) ||
        ts.isJsxFragment(current)
      ) {
        found = true;
        return;
      }
      ts.forEachChild(current, scan);
    };
    scan(node);
    return found;
  }

  function classify(name: string, body: ts.Node | undefined, fallback: SymbolKind): SymbolKind {
    if (/^use[A-Z0-9]/.test(name)) return "hook";
    if (/^[A-Z][A-Za-z0-9]*$/.test(name) && body && containsJsx(body)) return "component";
    return fallback;
  }

  function addSymbol(record: SymbolRecord): void {
    if (symbolKeys.has(record.id)) return;
    symbolKeys.add(record.id);
    result.symbols.push(record);
  }

  function addExport(name: string, symbol: SymbolRecord | null, line: number, isDefault: boolean): void {
    result.exports.push({ name, symbolId: symbol?.id ?? null, line, isDefault });
  }

  function addDeclaration(
    node: ts.Node,
    name: string,
    kind: SymbolKind,
    nameNode: ts.Node | undefined,
    parentId: string | null = null,
  ): SymbolRecord {
    const position = positionOf(node, nameNode);
    const flags = flagsOf(node);
    const record = createSymbol(
      filePath,
      name,
      kind,
      position.line,
      position.column,
      position.endLine,
      flags.exported,
      flags.isDefault,
      parentId,
    );
    addSymbol(record);
    if (flags.exported) {
      addExport(name, record, position.line, flags.isDefault);
      if (flags.isDefault && name !== "default") {
        addExport("default", record, position.line, true);
      }
    }
    return record;
  }

  function addVariable(declaration: ts.VariableDeclaration, owner: ts.Node): void {
    if (!ts.isIdentifier(declaration.name)) return;
    const initializer = declaration.initializer;
    if (!initializer || !ts.isArrowFunction(initializer) && !ts.isFunctionExpression(initializer)) {
      return;
    }
    const name = declaration.name.text;
    const position = positionOf(declaration, declaration.name);
    const flags = flagsOf(owner);
    const record = createSymbol(
      filePath,
      name,
      classify(name, initializer, "function"),
      position.line,
      position.column,
      position.endLine,
      flags.exported,
      flags.isDefault,
      null,
    );
    addSymbol(record);
    if (flags.exported) addExport(name, record, position.line, flags.isDefault);
  }

  function addImport(specifier: string, kind: ImportKind, names: string[], line: number): void {
    result.imports.push({
      specifier,
      resolvedPath: null,
      kind,
      names,
      external: isExternalSpecifier(specifier),
      line,
    });
  }

  function pushRoute(descriptor: RouteDescriptor): void {
    if (descriptor.handlerName && !descriptor.handlerSymbolId) {
      const record = createSymbol(
        filePath,
        descriptor.handlerName,
        "handler",
        descriptor.line,
        0,
        descriptor.line,
      );
      addSymbol(record);
      descriptor.handlerSymbolId = record.id;
    }
    const id = `route:${filePath}:${descriptor.framework}:${descriptor.method}:${descriptor.path}:${descriptor.line}`;
    if (routeKeys.has(id)) return;
    routeKeys.add(id);
    result.routes.push({
      id,
      framework: descriptor.framework,
      method: descriptor.method,
      path: descriptor.path,
      handlerSymbolId: descriptor.handlerSymbolId,
      line: descriptor.line,
      confidence: "verified",
    });
  }

  function handleImport(node: ts.ImportDeclaration): void {
    if (!ts.isStringLiteral(node.moduleSpecifier)) return;
    const line = getNodeLine(node, sourceFile);
    const clause = node.importClause;
    const names: string[] = [];
    if (clause) {
      if (clause.name) names.push(clause.name.text);
      const bindings = clause.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) names.push(element.name.text);
      } else if (bindings && ts.isNamespaceImport(bindings)) {
        names.push(bindings.name.text);
      }
    }
    addImport(
      node.moduleSpecifier.text,
      clause?.isTypeOnly ? "type-only" : "static",
      names,
      line,
    );
  }

  function handleExportDeclaration(node: ts.ExportDeclaration): void {
    const line = getNodeLine(node, sourceFile);
    const names: string[] = [];
    const clause = node.exportClause;
    if (clause && ts.isNamedExports(clause)) {
      for (const element of clause.elements) {
        const name = element.name.text;
        names.push(name);
        addExport(name, null, line, name === "default");
      }
    }
    if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      addImport(node.moduleSpecifier.text, "re-export", names.length > 0 ? names : ["*"], line);
    }
  }

  function handleCall(node: ts.CallExpression): void {
    const line = getNodeLine(node, sourceFile);

    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteral(argument)) {
        addImport(argument.text, "dynamic", [], line);
      }
      return;
    }
    if (
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require"
    ) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteral(argument)) {
        addImport(argument.text, "require", [], line);
      }
      return;
    }

    const model = detectModelSymbol(node, sourceFile, filePath);
    if (model) addSymbol(model);

    const route = detectCallRoute(node, sourceFile, filePath);
    if (route) pushRoute(route);

    let callee: string | null = null;
    if (ts.isIdentifier(node.expression)) {
      callee = node.expression.text;
    } else if (ts.isPropertyAccessExpression(node.expression)) {
      callee = node.expression.name.text;
    }
    if (callee) {
      result.calls.push({
        callee,
        line,
        targetSymbolId: null,
        targetFile: null,
        confidence: "inferred",
      });
    }
  }

  function handleClass(node: ts.ClassDeclaration): void {
    if (!node.name) {
      if (flagsOf(node).isDefault) addDeclaration(node, "default", "class", undefined);
      return;
    }
    const classSymbol = addDeclaration(node, node.name.text, "class", node.name);
    for (const member of node.members) {
      if (!ts.isMethodDeclaration(member)) continue;
      const name = member.name.getText(sourceFile).replace(/^["'`]|["'`]$/g, "");
      if (!name) continue;
      addDeclaration(member, name, "method", member.name, classSymbol.id);
    }
  }

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      handleImport(node);
    } else if (ts.isExportDeclaration(node)) {
      handleExportDeclaration(node);
    } else if (ts.isFunctionDeclaration(node)) {
      if (node.name) {
        addDeclaration(node, node.name.text, classify(node.name.text, node.body, "function"), node.name);
      } else if (flagsOf(node).isDefault) {
        addDeclaration(node, "default", "function", undefined);
      }
    } else if (ts.isClassDeclaration(node)) {
      handleClass(node);
    } else if (ts.isInterfaceDeclaration(node)) {
      if (node.name) addDeclaration(node, node.name.text, "interface", node.name);
    } else if (ts.isTypeAliasDeclaration(node)) {
      addDeclaration(node, node.name.text, "type", node.name);
    } else if (ts.isEnumDeclaration(node)) {
      addDeclaration(node, node.name.text, "enum", node.name);
    } else if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        addVariable(declaration, node);
      }
    } else if (ts.isVariableDeclaration(node)) {
      const list = node.parent;
      const owner = list && ts.isVariableDeclarationList(list) ? list.parent : undefined;
      if (!owner || !ts.isVariableStatement(owner)) addVariable(node, node);
    } else if (ts.isCallExpression(node)) {
      handleCall(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  for (const descriptor of detectConventionRoutes(filePath, result.exports)) {
    pushRoute(descriptor);
  }

  return result;
}
