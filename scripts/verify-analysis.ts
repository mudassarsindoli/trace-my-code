import assert from "node:assert/strict";
import { analyzeProject } from "../src/lib/analysis/analyzer";
import { parseSnapshot } from "../src/lib/schemas/ir";
import type { VirtualFile } from "../src/lib/types/ir";

function file(path: string, content: string): VirtualFile {
  return { path, content, size: new TextEncoder().encode(content).length };
}

const files: VirtualFile[] = [
  file("package.json", JSON.stringify({
    name: "fixture-app",
    private: true,
    dependencies: { next: "^16.0.0", react: "^19.0.0" },
  })),
  file("tsconfig.json", JSON.stringify({
    compilerOptions: { baseUrl: ".", paths: { "@/*": ["./*"] } },
  })),
  file("app/api/tasks/route.ts", [
    'import { listTasks } from "@/services/task-service";',
    "",
    "export async function GET() {",
    "  const tasks = listTasks();",
    "  return Response.json(tasks);",
    "}",
    "",
  ].join("\n")),
  file("services/task-service.ts", [
    'import { query } from "@/lib/db";',
    "",
    "export function listTasks() {",
    '  return query("SELECT * FROM tasks");',
    "}",
    "",
  ].join("\n")),
  file("lib/db.ts", [
    'import { listTasks } from "@/services/task-service";',
    "",
    "export function query(sql: string) {",
    "  return { sql, tasks: listTasks() };",
    "}",
    "",
  ].join("\n")),
  file("components/TaskList.tsx", [
    "export function TaskList() {",
    "  return <ul><li>Task</li></ul>;",
    "}",
    "",
  ].join("\n")),
  file("prisma/schema.prisma", [
    "model Task {",
    "  id Int @id @default(autoincrement())",
    "  title String",
    "}",
    "",
  ].join("\n")),
];

async function main(): Promise<void> {
  const progress: string[] = [];
  const snapshot = await analyzeProject(files, {
    projectId: "verify-analysis",
    projectName: "fixture-app",
    onProgress: (stage, processed, total, message) => {
      progress.push(`${stage}:${processed}/${total}${message ? `:${message}` : ""}`);
    },
  });

  assert.ok(snapshot.files.length >= 6, "expected the fixture files to be retained");
  assert.ok(
    snapshot.files.filter((entry) => entry.status === "analyzed").length >= 5,
    "expected source and prisma files to be parsed",
  );
  assert.ok(snapshot.stats.routes > 0, "expected at least one detected route");
  assert.ok(
    snapshot.files.some((entry) => entry.routes.length > 0),
    "expected a route record on a file",
  );
  assert.ok(snapshot.dependencies.length > 0, "expected at least one resolved dependency edge");
  assert.ok(
    snapshot.files.some((entry) => entry.calls.some(
      (call) => call.confidence === "verified" && call.targetSymbolId !== null,
    )),
    "expected at least one verified call",
  );
  assert.ok(snapshot.cycles.length > 0, "expected at least one dependency cycle");

  const validation = parseSnapshot(snapshot);
  assert.ok(validation.success, "snapshot must satisfy parseSnapshot");

  console.log(
    `analysis verified: ${snapshot.stats.analyzedFiles}/${snapshot.stats.files} files, ` +
    `${snapshot.stats.routes} routes, ${snapshot.dependencies.length} edges, ` +
    `${snapshot.cycles.length} cycles, ${progress.length} progress events`,
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
