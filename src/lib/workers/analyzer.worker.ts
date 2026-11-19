import { analyzeProject } from "@/lib/analysis/analyzer";
import type { AnalyzeRequest, WorkerMessage } from "./protocol";

interface WorkerScope {
  onmessage: ((event: MessageEvent<AnalyzeRequest>) => void) | null;
  postMessage(message: WorkerMessage): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (event) => {
  const request = event.data;
  void (async () => {
    try {
      const snapshot = await analyzeProject(request.files, {
        projectId: request.projectId,
        projectName: request.projectName,
        onProgress: (stage, processed, total, message) => {
          scope.postMessage({ type: "progress", stage, processed, total, message });
        },
      });
      scope.postMessage({ type: "result", snapshot });
    } catch (error) {
      scope.postMessage({
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  })();
};
