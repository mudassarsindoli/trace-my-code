export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function symbolId(path: string, name: string, kind: string, line: number): string {
  return `sym:${path}:${kind}:${name}:${line}`;
}

export function edgeId(from: string, to: string, kind: string, line = 0): string {
  return `edge:${from}->${to}:${kind}:${line}`;
}
