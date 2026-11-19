import { getNodesBounds, getViewportForBounds, type Rect, type Viewport } from "@xyflow/react";
import { toPng, toSvg } from "html-to-image";
import type { ProjectSnapshot } from "@/lib/types/ir";

const PADDING = 40;

interface ExportNode {
  id: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  width: number;
  height: number;
}

function resolveViewport(element: HTMLElement): HTMLElement {
  if (element.classList.contains("react-flow__viewport")) return element;
  return element.querySelector<HTMLElement>(".react-flow__viewport") ?? element;
}

function readNodeRects(viewport: HTMLElement): ExportNode[] {
  const elements = Array.from(viewport.querySelectorAll<HTMLElement>(".react-flow__node"));
  return elements.map((node, index) => {
    const style = getComputedStyle(node);
    const width = node.offsetWidth || Number.parseFloat(style.width) || 180;
    const height = node.offsetHeight || Number.parseFloat(style.height) || 80;
    let x = node.offsetLeft;
    let y = node.offsetTop;
    const match = /matrix\(([^)]+)\)/.exec(style.transform);
    if (match) {
      const parts = match[1].split(",").map((value) => Number.parseFloat(value.trim()));
      if (Number.isFinite(parts[4])) x = parts[4];
      if (Number.isFinite(parts[5])) y = parts[5];
    }
    return {
      id: `export-node-${index}`,
      position: { x, y },
      data: {},
      width,
      height,
    };
  });
}

function fitViewport(viewport: HTMLElement, nodes: ExportNode[]): Viewport {
  const bounds: Rect = getNodesBounds(nodes);
  if (bounds.width === 0 || bounds.height === 0) return { x: 0, y: 0, zoom: 1 };
  const width = viewport.clientWidth || Math.ceil(bounds.width + PADDING * 2);
  const height = viewport.clientHeight || Math.ceil(bounds.height + PADDING * 2);
  return getViewportForBounds(bounds, width, height, 0.1, 2, PADDING);
}

function isTransparentColor(value: string): boolean {
  return !value || value === "transparent" || /^rgba\([^)]*,\s*0\s*\)$/.test(value);
}

function resolveBackground(): string {
  const bodyColor = getComputedStyle(document.body).backgroundColor;
  const rootColor = getComputedStyle(document.documentElement).backgroundColor;
  if (!isTransparentColor(bodyColor)) return bodyColor;
  if (!isTransparentColor(rootColor)) return rootColor;
  const prefersDark =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "#0b1120" : "#ffffff";
}

function triggerDownload(dataUrl: string, fileName: string): void {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

async function captureGraph(
  element: HTMLElement,
  fileName: string,
  format: "png" | "svg",
): Promise<void> {
  if (typeof document === "undefined") return;
  const viewport = resolveViewport(element);
  const nodes = readNodeRects(viewport);
  const previousTransform = viewport.style.transform;
  const background = resolveBackground();
  const name = fileName.toLowerCase().endsWith(`.${format}`)
    ? fileName
    : `${fileName}.${format}`;

  try {
    if (nodes.length > 0) {
      const fitted = fitViewport(viewport, nodes);
      viewport.style.transform = `translate(${fitted.x}px, ${fitted.y}px) scale(${fitted.zoom})`;
    }
    const dataUrl =
      format === "png"
        ? await toPng(viewport, { backgroundColor: background, pixelRatio: 2, cacheBust: true })
        : await toSvg(viewport, { backgroundColor: background, cacheBust: true });
    triggerDownload(dataUrl, name);
  } finally {
    viewport.style.transform = previousTransform;
  }
}

export async function exportPng(element: HTMLElement, fileName: string): Promise<void> {
  await captureGraph(element, fileName, "png");
}

export async function exportSvg(element: HTMLElement, fileName: string): Promise<void> {
  await captureGraph(element, fileName, "svg");
}

export function exportJson(snapshot: ProjectSnapshot): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const safeName = snapshot.name.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeName}-analysis.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function exportMarkdown(content: string, fileName: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
