import type { GraphModel, NodeCategory } from "@/lib/types/ir";

const CATEGORIES: NodeCategory[] = [
  "frontend",
  "backend",
  "route",
  "service",
  "model",
  "utility",
  "config",
  "external",
  "unknown",
];

function escapeLabel(value: string): string {
  return value
    .replace(/\\/g, "/")
    .replace(/[\r\n]+/g, " ")
    .replace(/"/g, "'")
    .replace(/\|/g, "/")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .trim();
}

export function toMermaid(model: GraphModel): string {
  const lines: string[] = ["flowchart LR"];
  const ids = new Map<string, string>();

  model.nodes.forEach((node, index) => {
    const id = `n${index}`;
    ids.set(node.id, id);
    lines.push(`  ${id}["${escapeLabel(node.label)}"]`);
  });

  for (const edge of model.edges) {
    const source = ids.get(edge.source);
    const target = ids.get(edge.target);
    if (!source || !target) continue;
    if (edge.confidence === "inferred") {
      lines.push(`  ${source} -.->|inferred| ${target}`);
    } else {
      lines.push(`  ${source} -->|${escapeLabel(edge.label ?? edge.kind)}| ${target}`);
    }
  }

  for (const category of CATEGORIES) {
    lines.push(
      `  classDef ${category} fill:var(--cat-${category}),stroke:var(--cat-${category}),color:#ffffff`,
    );
  }

  for (const category of CATEGORIES) {
    const assigned = [
      ...new Set(
        model.nodes
          .filter((node) => node.category === category)
          .map((node) => ids.get(node.id))
          .filter((id): id is string => id !== undefined),
      ),
    ];
    if (assigned.length > 0) lines.push(`  class ${assigned.join(",")} ${category}`);
  }

  return lines.join("\n");
}
