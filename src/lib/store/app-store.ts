import { create, type StoreApi, type UseBoundStore } from "zustand";
import type { AnalysisStage, ProjectSnapshot } from "@/lib/types/ir";

export type AnalysisStatus = "idle" | "analyzing" | "done" | "error";

export interface AppState {
  snapshot: ProjectSnapshot | null;
  analysisStatus: AnalysisStatus;
  analysisStage: AnalysisStage;
  analysisProcessed: number;
  analysisTotal: number;
  analysisMessage: string | null;
  analysisError: string | null;
  selectedNodeId: string | null;
  selectedFilePath: string | null;
  detailsOpen: boolean;
  search: string;
  showInferred: boolean;
  setSnapshot: (snapshot: ProjectSnapshot | null) => void;
  startAnalysis: () => void;
  updateAnalysis: (stage: AnalysisStage, processed: number, total: number, message?: string) => void;
  failAnalysis: (message: string) => void;
  finishAnalysis: (snapshot: ProjectSnapshot) => void;
  selectNode: (id: string | null) => void;
  selectFile: (path: string | null) => void;
  toggleDetails: () => void;
  setSearch: (value: string) => void;
  setShowInferred: (value: boolean) => void;
}

export const useAppStore: UseBoundStore<StoreApi<AppState>> = create<AppState>()((set) => ({
  snapshot: null,
  analysisStatus: "idle",
  analysisStage: "extracting",
  analysisProcessed: 0,
  analysisTotal: 0,
  analysisMessage: null,
  analysisError: null,
  selectedNodeId: null,
  selectedFilePath: null,
  detailsOpen: true,
  search: "",
  showInferred: false,

  setSnapshot: (snapshot) => set({ snapshot, selectedNodeId: null, selectedFilePath: null }),

  startAnalysis: () => set({
    analysisStatus: "analyzing",
    analysisStage: "extracting",
    analysisProcessed: 0,
    analysisTotal: 0,
    analysisMessage: null,
    analysisError: null,
  }),

  updateAnalysis: (stage, processed, total, message) => set({
    analysisStage: stage,
    analysisProcessed: processed,
    analysisTotal: total,
    analysisMessage: message ?? null,
  }),

  failAnalysis: (message) => set({
    analysisStatus: "error",
    analysisError: message,
  }),

  finishAnalysis: (snapshot) => set((state) => {
    const total = Math.max(state.analysisTotal, snapshot.files.length);
    return {
      snapshot,
      analysisStatus: "done",
      analysisStage: "done",
      analysisProcessed: total,
      analysisTotal: total,
      analysisMessage: null,
      analysisError: null,
    };
  }),

  selectNode: (id) => set((state) => {
    if (!id) return { selectedNodeId: null };
    const isFile = state.snapshot?.files.some((file) => file.path === id) ?? false;
    return {
      selectedNodeId: id,
      selectedFilePath: isFile ? id : state.selectedFilePath,
    };
  }),

  selectFile: (path) => set({ selectedFilePath: path, selectedNodeId: null }),


  toggleDetails: () => set((state) => ({ detailsOpen: !state.detailsOpen })),

  setSearch: (value) => set({ search: value }),

  setShowInferred: (value) => set({ showInferred: value }),
}));
