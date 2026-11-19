export const SCHEMA_VERSION = 1 as const;

export const MAX_FILES = 5000;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
export const ANALYSIS_BATCH_SIZE = 50;
export const MAX_FLOW_DEPTH = 6;
export const MAX_GRAPH_NODES = 400;

export const IGNORED_DIRECTORIES = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out", "coverage",
  ".coverage", "vendor", ".turbo", ".cache", ".idea", ".vscode", "__pycache__",
  "target", "bin", "obj", ".parcel-cache", ".yarn", "storybook-static",
]);

export const IGNORED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".avif", ".bmp",
  ".pdf", ".zip", ".gz", ".tar", ".tgz", ".woff", ".woff2", ".ttf", ".eot",
  ".mp3", ".mp4", ".wav", ".exe", ".dll", ".so", ".dylib", ".class", ".jar",
  ".lock", ".map", ".min.js", ".min.css", ".snap", ".sqlite", ".db",
]);

export const SOURCE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts",
]);

export const METADATA_FILES = new Set([
  "package.json", "tsconfig.json", "jsconfig.json", "prisma/schema.prisma",
  "schema.prisma", ".env.example", "docker-compose.yml", "docker-compose.yaml",
]);

export const NEXT_HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export const PRISM_LANGUAGES: Record<string, string> = {
  typescript: "typescript",
  tsx: "tsx",
  javascript: "javascript",
  jsx: "jsx",
  json: "json",
  css: "css",
  html: "markup",
  markdown: "markdown",
  yaml: "yaml",
  prisma: "typescript",
  other: "text",
};
