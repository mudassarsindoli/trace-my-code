"use client";

import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/core/cn";

const MAX_LINES = 2000;

const KEYWORDS = new Set([
  "as", "async", "await", "break", "case", "catch", "class", "const", "continue",
  "default", "delete", "do", "else", "enum", "export", "extends", "finally", "for",
  "from", "function", "if", "implements", "import", "in", "instanceof", "interface",
  "let", "new", "of", "private", "protected", "public", "readonly", "return", "static",
  "super", "switch", "this", "throw", "try", "type", "typeof", "var", "void", "while",
  "with", "yield",
]);

const CONSTANTS = new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]);

const TOKEN_PATTERN = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|(`(?:\\.|[^`\\])*`|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|([{}()\[\].,;:+\-*/%=<>!&|^~?])/g;

function tokenize(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  TOKEN_PATTERN.lastIndex = 0;
  while ((match = TOKEN_PATTERN.exec(line)) !== null) {
    if (match.index > cursor) {
      nodes.push(<Fragment key={key++}>{line.slice(cursor, match.index)}</Fragment>);
    }
    const full = match[0];
    const comment = match[1];
    const stringLiteral = match[2];
    const numberLiteral = match[3];
    const identifier = match[4];
    const punctuation = match[5];

    let tokenClass = "";
    if (comment) {
      tokenClass = "comment";
    } else if (stringLiteral) {
      tokenClass = "string";
    } else if (numberLiteral) {
      tokenClass = "number";
    } else if (identifier) {
      if (CONSTANTS.has(identifier)) {
        tokenClass = "boolean";
      } else if (KEYWORDS.has(identifier)) {
        tokenClass = "keyword";
      } else {
        const rest = line.slice(match.index + full.length);
        if (/^\s*\(/.test(rest)) {
          tokenClass = "function";
        } else if (/^[A-Z]/.test(identifier)) {
          tokenClass = "class-name";
        }
      }
    } else if (punctuation) {
      tokenClass = "punctuation";
    }

    nodes.push(
      tokenClass
        ? <span key={key++} className={`token ${tokenClass}`}>{full}</span>
        : <Fragment key={key++}>{full}</Fragment>,
    );
    cursor = match.index + full.length;
  }

  if (cursor < line.length) {
    nodes.push(<Fragment key={key++}>{line.slice(cursor)}</Fragment>);
  }
  return nodes;
}

export function CodeBlock({
  code,
  language,
  highlightLines,
  onLineClick,
}: {
  code: string;
  language?: string;
  highlightLines?: number[];
  onLineClick?: (line: number) => void;
}) {
  const allLines = code.split("\n");
  const lines = allLines.slice(0, MAX_LINES);
  const highlighted = new Set(highlightLines ?? []);

  return (
    <div className="scroll-thin h-full overflow-auto bg-[var(--surface)] py-2" data-language={language}>
      {lines.map((line, index) => {
        const lineNumber = index + 1;
        return (
          <div
            key={lineNumber}
            id={`line-${lineNumber}`}
            data-line={lineNumber}
            className={cn("code-line", highlighted.has(lineNumber) && "is-highlighted")}
          >
            <a
              href={`#line-${lineNumber}`}
              onClick={(event) => {
                if (onLineClick) {
                  event.preventDefault();
                  onLineClick(lineNumber);
                }
              }}
              className="w-12 shrink-0 select-none pr-3 text-right text-[var(--faint)] no-underline hover:text-[var(--accent-text)]"
            >
              {lineNumber}
            </a>
            <span className="min-w-0 flex-1 pr-4 text-[var(--text)]">{tokenize(line)}</span>
          </div>
        );
      })}
      {allLines.length > MAX_LINES ? (
        <div className="px-4 py-3 text-[11px] muted">
          Showing the first {MAX_LINES.toLocaleString()} of {allLines.length.toLocaleString()} lines.
        </div>
      ) : null}
    </div>
  );
}
