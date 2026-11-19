import Dexie, { type EntityTable } from "dexie";
import type { ProjectSnapshot } from "@/lib/types/ir";

export interface ProjectRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  languageCount: number;
  snapshot: ProjectSnapshot;
}

export class OrchestrateDB extends Dexie {
  projects!: EntityTable<ProjectRecord, "id">;

  constructor() {
    super("ai-orchestrate");
    this.version(1).stores({
      projects: "id, name, createdAt, updatedAt",
    });
  }
}

let instance: OrchestrateDB | null = null;

const globalWithDb = globalThis as typeof globalThis & { __orchestrateDb?: OrchestrateDB };

function getDb(): OrchestrateDB {
  if (!instance) instance = new OrchestrateDB();
  if (typeof window !== "undefined") globalWithDb.__orchestrateDb = instance;
  return instance;
}

export const db: OrchestrateDB =
  typeof window !== "undefined" && globalWithDb.__orchestrateDb
    ? globalWithDb.__orchestrateDb
    : getDb();
