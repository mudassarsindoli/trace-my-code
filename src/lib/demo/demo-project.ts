import type { VirtualFile } from "@/lib/types/ir";

function file(path: string, content: string): VirtualFile {
  return { path, content, size: content.length };
}

const files: VirtualFile[] = [
  file("package.json", `{
  "name": "task-manager-demo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "16.4.6",
    "react": "19.3.1",
    "react-dom": "19.3.1",
    "zod": "^4.6.7"
  }
}
`),
  file("tsconfig.json", `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
`),
  file("prisma/schema.prisma", `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Task {
  id        String   @id @default(uuid())
  title     String
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
}
`),
  file("src/lib/types.ts", `export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export type NewTask = Pick<Task, "title">;
`),
  file("src/lib/utils.ts", `import type { Task } from "@/lib/types";

export function formatTaskLabel(task: Task): string {
  return task.completed ? "[done] " + task.title : task.title;
}
`),
  file("src/lib/db.ts", `import type { Task } from "@/lib/types";
import { normalizeTaskTitle } from "@/services/task-service";

const tasks: Task[] = [];

export function getTasks(): Task[] {
  return tasks.slice();
}

export function saveTask(task: Task): void {
  tasks.push({ ...task, title: normalizeTaskTitle(task.title) });
}
`),
  file("src/services/task-service.ts", `import { getTasks, saveTask } from "@/lib/db";
import type { NewTask, Task } from "@/lib/types";

export function normalizeTaskTitle(title: string): string {
  return title.trim();
}

export function listTasks(): Task[] {
  return getTasks();
}

export function createTask(input: NewTask): Task {
  const task: Task = {
    id: crypto.randomUUID(),
    title: normalizeTaskTitle(input.title),
    completed: false,
    createdAt: new Date().toISOString(),
  };
  saveTask(task);
  return task;
}
`),
  file("src/hooks/useTasks.ts", `import { useEffect, useState } from "react";
import type { Task } from "@/lib/types";
import { listTasks } from "@/services/task-service";

export function useTasks(): Task[] {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    setTasks(listTasks());
  }, []);

  return tasks;
}
`),
  file("src/components/TaskList.tsx", `"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { formatTaskLabel } from "@/lib/utils";

interface TaskListProps {
  tasks: Task[];
}

export default function TaskList({ tasks }: TaskListProps) {
  const [filter, setFilter] = useState("");
  const query = filter.toLowerCase();
  const visible = tasks.filter((task) => formatTaskLabel(task).toLowerCase().includes(query));

  return (
    <section>
      <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter tasks" />
      <ul>
        {visible.map((task) => (
          <li key={task.id}>{formatTaskLabel(task)}</li>
        ))}
      </ul>
    </section>
  );
}
`),
  file("src/app/page.tsx", `"use client";

import TaskList from "@/components/TaskList";
import { useTasks } from "@/hooks/useTasks";

export default function Home() {
  const tasks = useTasks();

  return (
    <main>
      <h1>Task Manager</h1>
      <TaskList tasks={tasks} />
    </main>
  );
}
`),
  file("src/app/api/tasks/route.ts", `import { NextResponse } from "next/server";
import { createTask, listTasks } from "@/services/task-service";

export async function GET() {
  return NextResponse.json({ tasks: listTasks() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { title?: string };
  if (!body.title || body.title.trim().length === 0) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const task = createTask({ title: body.title });
  return NextResponse.json({ task }, { status: 201 });
}
`),
  file("src/middleware.ts", `import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-request-path", request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
`),
];

export function getDemoFiles(): VirtualFile[] {
  return files.map((item) => ({ ...item }));
}
