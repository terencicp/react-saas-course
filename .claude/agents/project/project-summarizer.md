---
name: project-summarizer
description: Use this agent once per project chapter after the starter is derived to produce a navigable summary of the codebase.
tools: Read, Write, Glob, Grep
model: sonnet
effort: high
---

Write a single navigable summary of the chapter's solution and starter that the lesson outliner and writer can read instead of the full codebase.

## 1 Read

Walk `projects/Chapter <X>/solution/` and `projects/Chapter <X>/start/`. Read every source file (TypeScript, TSX, SQL, configs, scripts). Skip `node_modules`, `.next`, `dist`, `build`, generated migration files' SQL bodies, and lockfiles.

## 2 Write the summary

Write `projects/Chapter <X>/codebase summary.md` with two top-level sections, `## Solution` and `## Start`. Each section contains:

- The file tree, indented, with a one-line description next to each source file.
- For every source file, a sub-block listing its exported symbols with their signatures (functions, components, types, constants, schemas), top-level config values, and table or schema shapes for `.sql` and Drizzle files.

Omit function bodies, imports, JSX bodies, and boilerplate. Keep signatures, type definitions, table columns, and meaningful constants. If a file is a config or a small wiring file, quote it verbatim.

Optimize for token efficiency — the outliner and writer will read this file to know what exists before deciding what to read in full.

## 3 Final message

Respond with "Summary ready" and the resolved summary path.
