import { basename, detectCommonRoot, languageFromPath, normalizePath } from "@/lib/core/paths";
import type { ProjectDetection, VirtualFile } from "@/lib/types/ir";

const FRAMEWORK_PACKAGES: Record<string, string> = {
  next: "Next.js",
  react: "React",
  vue: "Vue",
  "@angular/core": "Angular",
  svelte: "Svelte",
  express: "Express",
  fastify: "Fastify",
  koa: "Koa",
  nest: "NestJS",
  "@nestjs/core": "NestJS",
  prisma: "Prisma",
  "@prisma/client": "Prisma",
  mongoose: "Mongoose",
  vite: "Vite",
  tailwindcss: "Tailwind CSS",
};

const ENTRY_PATTERNS = new Set([
  "index.ts", "index.tsx", "index.js", "index.jsx",
  "src/index.ts", "src/index.tsx", "src/index.js", "src/main.ts",
  "src/main.tsx", "src/main.js", "main.ts", "main.tsx", "main.js",
  "app/layout.tsx", "app/layout.jsx", "app/page.tsx", "app/page.jsx",
  "src/app/layout.tsx", "src/app/page.tsx",
  "pages/index.ts", "pages/index.tsx", "pages/index.js",
  "src/pages/index.tsx", "src/pages/index.js",
  "server.ts", "server.js", "src/server.ts", "src/server.js",
]);

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function readPackageJson(files: VirtualFile[]): Record<string, unknown> | null {
  const candidates = files
    .filter((file) => basename(normalizePath(file.path)) === "package.json")
    .sort((a, b) => normalizePath(a.path).length - normalizePath(b.path).length || compareText(a.path, b.path));
  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate.content);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function packageNames(packageJson: Record<string, unknown> | null): Set<string> {
  const names = new Set<string>();
  if (!packageJson) return names;
  for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
    const value = packageJson[key];
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    for (const name of Object.keys(value as Record<string, unknown>)) names.add(name);
  }
  return names;
}

export function detectProject(files: VirtualFile[]): ProjectDetection {
  const paths = [...new Set(files.map((file) => normalizePath(file.path)))].sort(compareText);
  const packageJson = readPackageJson(files);
  const dependencies = packageNames(packageJson);
  const frameworks = new Set<string>();
  for (const dependency of dependencies) {
    const framework = FRAMEWORK_PACKAGES[dependency];
    if (framework) frameworks.add(framework);
  }
  if (paths.some((path) => /(^|\/)app\/.*\/(route|page)\.(tsx?|jsx?)$/.test(path))) {
    frameworks.add("Next.js");
  }
  if (paths.some((path) => /(^|\/)schema\.prisma$/.test(path)) || dependencies.has("@prisma/client")) {
    frameworks.add("Prisma");
  }

  const languages = [...new Set(paths.map(languageFromPath))]
    .filter((language) => language !== "other")
    .sort(compareText);

  const entryPoints = paths.filter((path) => {
    if (ENTRY_PATTERNS.has(path)) return true;
    return /(^|\/)app\/.*\/(route|page)\.(tsx?|jsx?)$/.test(path) ||
      /(^|\/)pages\/api\//.test(path);
  }).sort(compareText);

  const declaredManager = packageJson?.packageManager;
  let packageManager: string | null = typeof declaredManager === "string" && declaredManager
    ? declaredManager.split("@")[0]
    : null;
  if (!packageManager) {
    if (paths.some((path) => basename(path) === "pnpm-lock.yaml")) packageManager = "pnpm";
    else if (paths.some((path) => basename(path) === "yarn.lock")) packageManager = "yarn";
    else if (paths.some((path) => /^(bun\.lock|bun\.lockb)$/.test(basename(path)))) packageManager = "bun";
    else if (paths.some((path) => basename(path) === "package-lock.json")) packageManager = "npm";
  }

  const declaredName = packageJson?.name;
  const name = typeof declaredName === "string" && declaredName.trim()
    ? declaredName.trim()
    : detectCommonRoot(paths) ?? "project";

  return {
    name,
    languages,
    frameworks: [...frameworks].sort(compareText),
    entryPoints,
    packageManager,
  };
}
