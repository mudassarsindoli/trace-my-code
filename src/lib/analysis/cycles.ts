import type { DependencyEdge } from "@/lib/types/ir";

function compareLists(a: string[], b: string[]): number {
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return a.length - b.length;
}

export function findCycles(dependencies: DependencyEdge[]): string[][] {
  const nodes = new Set<string>();
  const adjacency = new Map<string, Set<string>>();

  for (const edge of dependencies) {
    nodes.add(edge.from);
    nodes.add(edge.to);
    let targets = adjacency.get(edge.from);
    if (!targets) {
      targets = new Set<string>();
      adjacency.set(edge.from, targets);
    }
    targets.add(edge.to);
  }

  const sortedNodes = [...nodes].sort();
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const cycles: string[][] = [];
  let nextIndex = 0;

  const connect = (node: string): void => {
    indices.set(node, nextIndex);
    lowLinks.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);

    const targets = [...(adjacency.get(node) ?? [])].sort();
    for (const target of targets) {
      if (!indices.has(target)) {
        connect(target);
        lowLinks.set(node, Math.min(lowLinks.get(node) ?? 0, lowLinks.get(target) ?? 0));
      } else if (onStack.has(target)) {
        lowLinks.set(node, Math.min(lowLinks.get(node) ?? 0, indices.get(target) ?? 0));
      }
    }

    if (lowLinks.get(node) !== indices.get(node)) return;
    const component: string[] = [];
    let current: string;
    do {
      current = stack.pop() ?? node;
      onStack.delete(current);
      component.push(current);
    } while (current !== node);

    const selfLoop = adjacency.get(node)?.has(node) === true;
    if (component.length > 1 || selfLoop) {
      cycles.push(component.sort());
    }
  };

  for (const node of sortedNodes) {
    if (!indices.has(node)) connect(node);
  }

  cycles.sort(compareLists);
  return cycles;
}
