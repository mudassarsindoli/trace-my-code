import type { NodeCategory } from "@/lib/types/ir";

export function categoryColor(category: NodeCategory): string {
  return `var(--cat-${category})`;
}

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  frontend: "Frontend",
  backend: "Backend",
  route: "Routes",
  service: "Services",
  utility: "Utilities",
  model: "Models",
  config: "Config",
  external: "External",
  unknown: "Other",
};
