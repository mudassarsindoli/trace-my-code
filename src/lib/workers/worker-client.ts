import { createId } from "@/lib/core/ids";
import { parseSnapshot } from "@/lib/schemas/ir";
import type { AnalyzeRequest, ProjectSnapshot, VirtualFile, WorkerMessage } from "./protocol";

const activeWorkers = new Map<string, Worker>();

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function analyzeFiles(
  files: VirtualFile[],
  onProgress?: (message: Extract<WorkerMessage, { type: "progress" }>) => void,
): Promise<ProjectSnapshot> {
  const id = createId();

  return new Promise<ProjectSnapshot>((resolve, reject) => {
    let worker: Worker;
    try {
      const existing = activeWorkers.get(id);
      if (existing) {
        existing.terminate();
        activeWorkers.delete(id);
      }
      worker = new Worker(new URL("./analyzer.worker.ts", import.meta.url), { type: "module" });
    } catch (error) {
      reject(new Error(`Failed to create analysis worker: ${messageOf(error)}`));
      return;
    }
    activeWorkers.set(id, worker);

    let settled = false;
    const finish = (action: () => void): void => {
      if (settled) return;
      settled = true;
      activeWorkers.delete(id);
      worker.terminate();
      action();
    };

    worker.onmessage = (event: MessageEvent<WorkerMessage>): void => {
      const message = event.data;
      if (message.type === "progress") {
        if (!settled) onProgress?.(message);
        return;
      }
      if (message.type === "result") {
        const parsed = parseSnapshot(message.snapshot);
        if (!parsed.success) {
          finish(() => reject(new Error(`Invalid analysis result from worker: ${parsed.error.message}`)));
          return;
        }
        finish(() => resolve(parsed.data));
        return;
      }
      finish(() => reject(new Error(`Analysis worker reported an error: ${message.message}`)));
    };

    worker.onerror = (event: ErrorEvent): void => {
      finish(() => reject(new Error(`Analysis worker failed: ${event.message || "unknown error"}`)));
    };

    worker.onmessageerror = (): void => {
      finish(() => reject(new Error("Analysis worker message could not be deserialized")));
    };

    const request: AnalyzeRequest = { files, projectId: id };
    worker.postMessage(request);
  });
}
