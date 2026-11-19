import { db } from "@/lib/db/db";
import { parseSnapshot } from "@/lib/schemas/ir";
import type { ProjectSnapshot } from "@/lib/types/ir";

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  languageCount: number;
}

export async function saveProject(snapshot: ProjectSnapshot): Promise<void> {
  await db.projects.put({
    id: snapshot.id,
    name: snapshot.name,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    fileCount: snapshot.files.length,
    languageCount: Object.keys(snapshot.stats.languages).length,
    snapshot,
  });
}

export async function listProjects(): Promise<ProjectMeta[]> {
  const records = await db.projects.orderBy("updatedAt").reverse().toArray();
  return records.map((record) => ({
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    fileCount: record.fileCount,
    languageCount: record.languageCount,
  }));
}

export async function loadProject(id: string): Promise<ProjectSnapshot | null> {
  const record = await db.projects.get(id);
  if (!record) return null;
  const parsed = parseSnapshot(record.snapshot);
  return parsed.success ? parsed.data : null;
}

export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id);
}

export async function projectExists(id: string): Promise<boolean> {
  const record = await db.projects.get(id);
  return record !== undefined;
}
