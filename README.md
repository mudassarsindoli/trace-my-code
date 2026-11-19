# TraceMyProject

Drop a ZIP of a JavaScript/TypeScript repository and explore its architecture, dependencies and execution flow — entirely in your browser.

No upload, no server, no AI. Parsing, graph building and storage all happen client-side; analyzed projects persist locally via IndexedDB.

## Features

- **Architecture, dependency and execution-flow graphs** — interactive, exportable (PNG/SVG/JSON/Mermaid)
- **Source inspector** — browse files with symbols, imports, exports and cross-references
- **AI summary** — a compact, file-by-file digest you can paste into a chatbot so it can point you to the right file
- **Local-first** — everything stays on your device

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), drop a ZIP, or try the built-in demo project.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify:analysis` | Run the analysis pipeline against a fixture project |

## Stack

Next.js · TypeScript · Zustand · Dexie (IndexedDB) · `@xyflow/react` · Tailwind CSS

See [CLAUDE.md](CLAUDE.md) for architecture details.
