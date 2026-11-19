import * as ts from "typescript";
import { NEXT_HTTP_METHODS } from "@/lib/core/constants";
import { symbolId } from "@/lib/core/ids";
import { basename, normalizePath } from "@/lib/core/paths";
import type {
  ExportRecord,
  RouteFramework,
  SymbolKind,
  SymbolRecord,
} from "@/lib/types/ir";

export interface RouteDescriptor {
  framework: RouteFramework;
  method: string;
  path: string;
  line: number;
  handlerName: string | null;
  handlerSymbolId: string | null;
}

const HTTP_METHODS = new Set([...NEXT_HTTP_METHODS, "ALL"]);
const ROUTE_FILE = /^route\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/i;
const PAGE_FILE = /^page\.(tsx|jsx|ts|js)$/i;

export function getNodeLine(node: ts.Node, sourceFile: ts.SourceFile): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

export function createSymbol(
  path: string,
  name: string,
  kind: SymbolKind,
  line: number,
  column: number,
  endLine = line,
  exported = false,
  isDefault = false,
  parentId: string | null = null,
): SymbolRecord {
  return {
    id: symbolId(path, name, kind, line),
    name,
    kind,
    line,
    endLine: Math.max(line, endLine),
    column,
    exported,
    isDefault,
    parentId,
  };
}

function toRoutePath(segments: string[]): string {
  const parts: string[] = [];
  for (const raw of segments) {
    if (!raw) continue;
    if (raw.startsWith("(") && raw.endsWith(")")) continue;
    const name = raw.replace(/\.(tsx?|jsx?|mjs|cjs|mts|cts)$/i, "");
    if (name === "page" || name === "route" || name === "index") continue;
    if (name.startsWith("[") && name.endsWith("]")) {
      const inner = name.slice(1, -1).replace(/^\.\.\./, "");
      parts.push(inner ? `:${inner}` : "");
      continue;
    }
    parts.push(name);
  }
  return `/${parts.filter(Boolean).join("/")}`;
}

function conventionHandler(
  exports: ExportRecord[],
  name: string | null,
  fallbackLine: number,
): { line: number; handlerName: string | null; handlerSymbolId: string | null } {
  if (name) {
    const match = exports.find((entry) => entry.name === name);
    if (match) {
      return { line: match.line, handlerName: name, handlerSymbolId: match.symbolId };
    }
  }
  const fallback = exports.find((entry) => entry.isDefault);
  return {
    line: fallback?.line ?? fallbackLine,
    handlerName: fallback?.name ?? name,
    handlerSymbolId: fallback?.symbolId ?? null,
  };
}

export function detectConventionRoutes(
  path: string,
  exports: ExportRecord[],
): RouteDescriptor[] {
  const normalized = normalizePath(path);
  const segments = normalized.split("/");
  const name = basename(normalized);
  const descriptors: RouteDescriptor[] = [];

  const appIndex = segments.lastIndexOf("app");
  if (appIndex >= 0) {
    const routeSegments = segments.slice(appIndex + 1, -1);
    if (ROUTE_FILE.test(name)) {
      for (const method of NEXT_HTTP_METHODS) {
        const handler = conventionHandler(exports, method, 1);
        if (!exports.some((entry) => entry.name.toLowerCase() === method.toLowerCase())) {
          continue;
        }
        descriptors.push({
          framework: "next",
          method,
          path: toRoutePath(routeSegments),
          line: handler.line,
          handlerName: method,
          handlerSymbolId: handler.handlerSymbolId,
        });
      }
      return descriptors;
    }
    if (PAGE_FILE.test(name)) {
      const handler = conventionHandler(exports, null, 1);
      descriptors.push({
        framework: "next",
        method: "GET",
        path: toRoutePath(routeSegments),
        line: handler.line,
        handlerName: handler.handlerName,
        handlerSymbolId: handler.handlerSymbolId,
      });
    }
    return descriptors;
  }

  const pagesIndex = segments.lastIndexOf("pages");
  if (pagesIndex >= 0 && segments[pagesIndex + 1] === "api") {
    const handler = conventionHandler(exports, null, 1);
    descriptors.push({
      framework: "next",
      method: "GET",
      path: toRoutePath(segments.slice(pagesIndex + 1, -1)),
      line: handler.line,
      handlerName: handler.handlerName,
      handlerSymbolId: handler.handlerSymbolId,
    });
  }

  return descriptors;
}

export function detectCallRoute(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
  path: string,
): RouteDescriptor | null {
  if (!ts.isPropertyAccessExpression(node.expression)) return null;
  const method = node.expression.name.text.toUpperCase();
  if (!HTTP_METHODS.has(method)) return null;

  const owner = node.expression.expression;
  if (!ts.isIdentifier(owner)) return null;
  const ownerName = owner.text.toLowerCase();
  let framework: RouteFramework;
  if (ownerName === "fastify") {
    framework = "fastify";
  } else if (ownerName === "app" || ownerName === "router" || ownerName === "server" || ownerName === "api") {
    framework = "express";
  } else {
    return null;
  }

  const pathArgument = node.arguments[0];
  if (!pathArgument || !ts.isStringLiteral(pathArgument)) return null;

  const line = getNodeLine(node, sourceFile);
  const handlerArgument = node.arguments[1];
  const handlerName = handlerArgument && ts.isIdentifier(handlerArgument)
    ? handlerArgument.text
    : null;

  return {
    framework,
    method,
    path: pathArgument.text,
    line,
    handlerName,
    handlerSymbolId: handlerName ? symbolId(path, handlerName, "handler", line) : null,
  };
}

export function detectModelSymbol(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
  path: string,
): SymbolRecord | null {
  if (!ts.isPropertyAccessExpression(node.expression)) return null;
  if (node.expression.name.text !== "model") return null;
  const owner = node.expression.expression;
  if (!ts.isIdentifier(owner) || owner.text.toLowerCase() !== "mongoose") return null;
  const nameArgument = node.arguments[0];
  if (!nameArgument || !ts.isStringLiteral(nameArgument)) return null;

  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return createSymbol(path, nameArgument.text, "model", position.line + 1, position.character);
}
